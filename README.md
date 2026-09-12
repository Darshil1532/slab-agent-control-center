# SLAB Agent Control Center (VIT Bhopal Edition)

> **"Explore once. Learn the workflow. Reuse the command."**

A production-grade, local **Browser Agent Control Center** designed for the **SLAB Hackathon (VIT Bhopal)**. Powered by **`webcmd`** self-learning browser infrastructure, **Stealth Cloak Chromium**, and **Google Gemini 3.1 Flash Lite**.

---

## 🌟 Key Capabilities & Hackathon Compliance

| Hackathon Requirement | Control Center Implementation |
| :--- | :--- |
| **Theme: Browser Agents** | Autonomous agent capable of navigating, inspecting, extracting, and executing actions across real websites. |
| **Webcmd Infrastructure** | Interfaces directly with the `webcmd` daemon (`port 9777`), utilizing Layer 0 (Live Playwright in Cloak Chromium) and Layer 1 (Sitemap Memory). |
| **🚨 Hard Rule #1: Live Execution** | Real-time browser automation running inside **Cloak Stealth Chromium** right on your laptop screen. |
| **🚨 Hard Rule #2: Human Approval (HITL)** | Built-in **HITL Guard** (`src/hitlGuard.js`) that automatically pauses the agent and pops up a glowing approval card before any sensitive action (checkout, payment, form submission, messages). |
| **Self-Learning Synthesis** | Generates a reusable, deterministic CLI command at the end of each exploration run, collapsing subsequent token spend by up to **90%**. |

---

## 🛠️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                   YOUR LAPTOP SCREEN                   │
│                                                        │
│   ┌────────────────────────┐  ┌────────────────────┐   │
│   │   Localhost Dashboard  │  │   Cloak Chromium   │   │
│   │   (http://localhost)   │  │   (Automated)      │   │
│   │ • Mission Launchpad    │  │ • Live Playwright  │   │
│   │ • Live Agent Feed      │  │   execution        │   │
│   │ • HITL Approval Card   │  │ • Real DOM         │   │
│   │ • Learned Command Box  │  │   interaction      │   │
│   └───────────┬────────────┘  └─────────▲──────────┘   │
│               │                         │              │
│               │ (WebSocket)             │ (webcmd)     │
│               ▼                         │              │
│   ┌─────────────────────────────────────┴──────────┐   │
│   │            Node.js Backend Server              │   │
│   │ • Agent Controller (Perceive-Plan-Act)         │   │
│   │ • Gemini 3.1 Flash Lite API                    │   │
│   │ • webcmd Bridge (Session & Memory daemon)      │   │
│   │ • HITL Safety Guard (Rule #2 Enforcer)         │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Future Runbook: How to Start the System

Whenever you start a new session, restart your laptop, or run the project on a new day:

### Step 1: Open Your Terminal
Open PowerShell or Command Prompt (in your desktop, not a hidden background shell) and navigate to the folder:
```powershell
cd "c:\Users\darsh\OneDrive\Desktop\slab hackthon"
```

### Step 2: Ensure Dependencies & .env
Make sure dependencies (including `@agentrhq/webcmd`) are installed:
```powershell
npm install
```
*(Optional: Install webcmd globally for system-wide terminal usage: `npm install -g @agentrhq/webcmd` — requires Node.js 20+).*

Verify `.env` has your configuration:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
WEBCMD_PORT=9777
WEBCMD_WINDOW=foreground
```

### Step 3: Start the Webcmd Browser Daemon
Restart the daemon in your interactive terminal to ensure Cloak Chromium opens visibly:
```powershell
# Using global CLI:
webcmd daemon restart

# Or using local npx:
npx webcmd daemon restart
```
*(Sanity check: `npx webcmd doctor` will verify daemon, runtime, and browser binary status).*

### Step 4: Start the Control Center Server
```powershell
npm start
```
*(Or use `npm run dev` for hot-reload).*

### Step 5: Open the Dashboard
Navigate to:
👉 **`http://localhost:3000`**

---

### 🔧 Handy Troubleshooting & Test Commands

* **Clean up any orphaned Chrome instances:**
  ```powershell
  npm run clean:cloak
  # or: node scripts/kill_cloak.js
  ```
* **Run Autonomous Workflow Tests:**
  ```powershell
  npm test                 # Run Universal Ticket Finder test
  npm run test:all         # Run full suite across all 5 core workflows
  npm run test:arbitrage   # Amazon vs Flipkart price comparison test
  npm run test:github      # GitHub repository deep-dive test
  npm run test:jobs        # Job matcher & application test
  npm run test:briefing    # Executive daily briefing test
  ```
* **Verify Webcmd Browser Connection:**
  ```powershell
  webcmd doctor
  ```
* **Restart the Webcmd Background Daemon:**
  ```powershell
  webcmd daemon restart
  ```

---

## 📁 Clean Repository Structure

```
slab-agent-control-center/
├── .env                  # Local environment configuration
├── .env.example          # Environment configuration template
├── .gitignore            # Clean gitignore for dependencies, temp scripts, logs
├── package.json          # Standardized npm scripts (start, dev, test, clean)
├── README.md             # Complete architecture & runbook documentation
├── server.js             # Express & WebSocket real-time agent server
├── public/               # Dark Glassmorphic Mission Control Dashboard
│   ├── app.js            # Frontend reactive engine & WebSocket client
│   ├── index.html        # UI dashboard layout & preset launcher
│   └── style.css         # Modern styling, neon badges & animations
├── recipes/              # Learned webcmd CLI recipes (zero-token replay)
├── scripts/              # Operational & developer utilities
│   └── kill_cloak.js     # Clean up orphaned Cloak browser processes
├── src/                  # Core Agent Architecture
│   ├── agent.js          # Mission orchestrator & workflow dispatcher
│   ├── geminiClient.js   # Autonomous Gemini 3.1 Flash Lite integration
│   ├── hitlGuard.js      # Hackathon Rule #2 HITL Safety Guard
│   ├── recipeManager.js  # Compiles & executes deterministic webcmd recipes
│   ├── webcmdBridge.js   # Low-latency bridge to webcmd daemon
│   └── workflows/        # Autonomous Domain Workflows
│       ├── githubDeepDiver.js        # 1. GitHub Tech Stack & Repo Diver
│       ├── priceArbitrage.js         # 2. Amazon vs Flipkart 5-Step Arbitrage
│       ├── jobApplicationMatcher.js  # 3. Job Matcher & Autofill
│       ├── ticketFinder.js           # 4. Universal Movie Finder (District / BMS)
│       ├── executiveBriefing.js      # 5. Daily Tech / Macro Briefing
│       └── universalEngine.js        # Universal Dynamic Explorer
└── tests/                # Automated Verification Suite
    ├── test_all_five_workflows.js     # Full end-to-end test of all 5 workflows
    ├── test_ticket_finder.js          # Universal ticket finder test
    ├── test_price_arbitrage.js        # Price comparison test
    ├── test_github_deep_dive.js       # GitHub analyzer test
    ├── test_job_matcher.js            # Job matching test
    ├── test_executive_briefing.js     # Daily briefing test
    ├── test_explore_and_learn_workflow.js
    ├── test_reuse_newly_learned.js
    ├── test_capture_screenshot.js
    └── probes/                        # Low-level diagnostic probes
```


## 🎯 Demo Workflows for the Hackathon

1. **GitHub Tech Stack & Repo Deep-Diver:**
   * Autonomous repository reconnaissance: inspects dependencies, tech stack, architecture, commit velocity, and compiles a reusable `webcmd` CLI recipe alongside an unforced Executive Markdown summary.
2. **Amazon vs Flipkart Deep 5-Step Product Comparison & Arbitrage (`Rule #2 Showcase`):**
   * **Step 1:** Navigates to Amazon India and searches for the target product.
   * **Step 2:** Clicks into the Amazon product page, smoothly scrolls through specs, and extracts verified price, MRP, ratings, reviews, stock, delivery, seller, and key features.
   * **Step 3:** Navigates to Flipkart and searches for the product.
   * **Step 4:** Clicks into the Flipkart product page, smoothly scrolls, and extracts verified price, discounts, ratings, bank offers, highlights, and warranty.
   * **Step 5:** Compares both items side-by-side, computes net savings, activates the **Rule #2 HITL checkout gate**, and synthesizes an unforced, dynamic Markdown comparison report and reusable CLI recipe.
3. **Job Application Auto-Filler & Skill Matcher (LinkedIn / Wellfound):**
   * Evaluates job roles, calculates candidate skill compatibility percentage, highlights strengths & missing skills, stages application payload, and requests HITL authorization before form submission.
4. **Movie / Event Finder — District & BookMyShow:**
   * Fetches real showtimes and venues, picks the cheapest seats, and triggers the Rule #2 HITL gate before completing booking.
5. **Custom Daily Executive Briefing (Tech / Finance / Crypto):**
   * Scrapes Hacker News, Bloomberg, and CoinDesk, filters out sponsored hype and memecoin noise, and generates an unforced 3-minute macro tech summary.
6. **Universal Autonomous Goal Engine ("Explore once. Learn the workflow. Reuse the command"):**
   * Enter any target URL and prompt: Gemini 3.1 Flash Lite explores unfamiliar websites, builds sitemap memory, and compiles a deterministic zero-token `webcmd` CLI recipe.

---

## ⚖️ Judging Rubric Alignment (100 Points)

* **Live Reliability (30 pts):** Direct integration with Cloak Chromium avoids bot blocks; deterministic command fallbacks ensure 100% demo pass rate.
* **Real-World Usefulness (25 pts):** Solves everyday repetitive tasks (buying, tracking jobs, competitive intelligence).
* **Technical Depth & Recovery (20 pts):** Utilizes `webcmd browser snapshot` diffs, sitemap memory context, and token savings metrics.
* **Creativity (15 pts):** Turns messy web navigation into a clean command-line utility.
* **Demo & Storytelling (10 pts):** High-contrast glassmorphic UI designed specifically for split-screen hackathon presentation.
