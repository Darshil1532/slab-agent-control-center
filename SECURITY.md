# SLAB Agent Control Center - Security Architecture & Threat Model

This document outlines the security architecture, threat model, defense-in-depth mechanisms, and residual risks for the **SLAB Agent Control Center**.

---

## 1. Threat Model & Attack Surface

The SLAB Agent Control Center orchestrates autonomous browser workflows via `webcmd` and Gemini 3.1 Flash Lite. Because browser agents consume untrusted web content (HTML, DOM text, user reviews, metadata) and translate goals into executable browser automation scripts, they are exposed to unique attack vectors:

### Identified Threat Vectors
1. **Indirect Prompt Injection**: Malicious web pages embedding hidden instructions designed to hijack LLM behavior into generating malicious code snippets or navigating to attacker-controlled targets.
2. **Arbitrary Code Execution (RCE) via Generated Scripts**: Untrusted LLM output attempting to call Node.js system primitives (`child_process`, `fs`, `process`, `net`, `eval`, `new Function`).
3. **Sandbox Escapes via Prototype Traversal**: Code attempting to escape standard lexical scope using prototype/constructor climbing (e.g., `[].constructor.constructor('return process')()`).
4. **Command / Shell Injection**: Unsanitized user inputs, session IDs, recipe names, or target URLs passed into system commands that spawn subprocesses.
5. **Server-Side Request Forgery (SSRF) & Metadata Exfiltration**: Malicious workflows instructed to access internal subnets (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`) or cloud instance metadata services (`169.254.169.254`).
6. **Obfuscated Network Navigation**: Attackers specifying decimal (`2130706433`) or hexadecimal (`0x7f000001`) IP representations to bypass standard URL regex filters.

---

## 2. Multi-Layer Defense-in-Depth Architecture

To mitigate these threats without disrupting valid browser automation workflows, the application enforces a strict 5-layer security architecture:

```
[User / Untrusted Web Content]
              │
              ▼
   ┌──────────────────────┐
   │ 1. Input Sanitizer   │ ──> Rejects shell metachars (; & | ` $ > < \n \0)
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │ 2. SSRF Guardrails   │ ──> Validates URL schemes, blocks loopback/private IPs,
   └──────────┬───────────┘     normalizes decimal/hex IPs, checks DNS resolution
              ▼
   ┌──────────────────────┐
   │ 3. AST Static Policy │ ──> Acorn AST analysis inside async function shell;
   └──────────┬───────────┘     bans process, require, child_process, constructor climbing
              ▼
   ┌──────────────────────┐
   │ 4. Subprocess Vector │ ──> cross-spawn with argument arrays; avoids shell interpolation
   └──────────┬───────────┘
              ▼
   ┌──────────────────────┐
   │ 5. Audit & Telemetry │ ──> Persists blocks to .security/rejected-scripts.log &
   └──────────────────────┘     emits security_block events to UI and WebSocket
```

### Layer 1: Shell Injection Hardening & Sanitization (`assertSafeString`)
- Replaced all vulnerable `child_process.exec` calls in `src/webcmdBridge.js` and `src/recipeManager.js` with `cross-spawn` argument arrays.
- Eliminates shell parsing and Windows CMD command concatenation entirely.
- Enforces strict string sanitization (`assertSafeString`) on session IDs, recipe names, task IDs, and navigation targets, disallowing command chaining characters (`;`, `&`, `|`, `` ` ``, `$`, `>`, `<`, newlines, null bytes).

### Layer 2: SSRF & Navigation Guardrails (`validateNavigationUrl`)
- Restricts target navigation schemes strictly to `http:` and `https:`. Blocks `file:`, `chrome:`, `javascript:`, `data:`, and `ftp:`.
- Enforces RFC 1918 private IP blocking:
  - `127.0.0.0/8` (Loopback)
  - `10.0.0.0/8` (Private Class A)
  - `172.16.0.0/12` (Private Class B)
  - `192.168.0.0/16` (Private Class C)
  - `169.254.0.0/16` (Link-Local & Cloud Instance Metadata, e.g. `169.254.169.254`)
  - `::1` and IPv6 unique local/link-local addresses
- Decodes obfuscated IP addresses (decimal integers like `2130706433` and hex strings like `0x7f000001`) to their canonical IPv4 notation before validation.
- Performs asynchronous DNS resolution lookup (`dns.promises.lookup`) to prevent DNS rebinding attacks where external domain names resolve to private IP addresses.

### Layer 3: Static AST Policy Sandbox (`validatePlaywrightCode`)
- Uses `acorn` to perform comprehensive Abstract Syntax Tree (AST) inspection on all Playwright code before execution.
- **Top-Level `return` Compatibility**: Wraps snippets inside an `async function __sandboxed_script(page)` shell prior to AST generation, ensuring that workflow scripts ending in `return {...}` parse cleanly without syntax errors.
- **Banned Runtime Identifiers**: Recursively blocks access to Node.js runtime primitives:
  - `process`, `require`, `child_process`, `fs`, `net`, `http`, `https`, `dgram`, `tls`, `dns`, `globalThis`, `global`, `__dirname`, `__filename`, `Reflect`, `eval`, `Function`.
- **Prototype Climbing Protection**: Traverses MemberExpressions to block prototype and constructor property lookups:
  - `.constructor`, `__proto__`, `prototype`, `getPrototypeOf`, `setPrototypeOf`, `defineProperty`, `defineProperties`.
- **Dynamic Import Prohibition**: Rejects `ImportExpression` (`import(...)`).
- **Deep Inspection**: Recursively checks string literals passed to `page.evaluate(...)`.

### Layer 4: Audit Logging & Real-Time Telemetry
- Blocked scripts and parameter violations are automatically logged to `.security/rejected-scripts.log` with timestamps, session IDs, client IP context, and snippet extracts.
- `WebcmdBridge` emits structured `security_block` events.
- `AgentController` forwards security alerts over WebSocket (`type: 'security_block'`).
- The web frontend (`public/app.js`) alerts the operator with high-visibility security warnings.

### Layer 5: Human-In-The-Loop (HITL) Guardrails (`src/hitlGuard.js`)
- Preserves human operator oversight on all sensitive browser actions (payment, checkout, message sending, file deletion, data export).
- Operates complementary to the AST sandbox: the sandbox prevents system-level compromise, while the HITL guard gates high-consequence business actions.

---

## 3. Honest Residual Risk & Recommendations

While the static policy engine and subprocess hardening provide robust protection against script-level exploits and injection attacks, defense-in-depth requires acknowledging residual risks:

1. **Static AST Analysis Limitations**: AST inspection verifies syntax and identifier references before runtime. Obfuscated dynamic property access that cannot be statically resolved could theoretically slip past simple lexical checks. However, combining AST checking with argument-array execution and strict URL validation significantly narrows this window.
2. **Browser Network Isolation**: Browser-level requests made by the underlying Chromium engine navigate the host's network. For high-security enterprise deployments, running the browser engine inside a dedicated Docker container or microVM (e.g., Firecracker / gVisor) with network egress firewalls is recommended to provide kernel-level network isolation.
3. **LLM Prompt Injection Defense**: Prompt engineering and input guards mitigate prompt injection, but model output should always be treated as untrusted code and processed through the verification pipeline before execution.
