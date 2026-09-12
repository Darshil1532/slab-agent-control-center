import dotenv from 'dotenv';
dotenv.config();

export class GeminiClient {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDIJeFSCF7TfkhCwrxaN4REU1Y38-AAAG0';
    this.model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  }

  async generateContent(prompt, systemInstruction = '', jsonFormat = true) {
    const payload = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (jsonFormat) {
      payload.generationConfig = {
        responseMimeType: 'application/json',
        temperature: 0.2
      };
    } else {
      payload.generationConfig = {
        temperature: 0.4
      };
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

      if (jsonFormat) {
        try {
          return JSON.parse(rawText);
        } catch {
          // If JSON parse fails, return raw
          return { error: 'Failed to parse JSON', rawText };
        }
      }

      return rawText;
    } catch (err) {
      console.error('Gemini API call error:', err.message);
      throw err;
    }
  }

  /**
   * Plan out an approach for a goal given the target URL and sitemap memory.
   */
  async planMission(goal, url, siteMemory) {
    const systemPrompt = `You are the Brain of an autonomous Browser Agent in the SLAB Hackathon.
You control a real Stealth Chromium browser via 'webcmd' infrastructure.
Your task is to analyze the user's high-level goal and any known sitemap memory, then formulate a crisp, reliable execution plan.
Keep steps modular. Clearly indicate any step that might require Human-in-the-Loop approval (e.g. payment, form submission, deleting, sending).

Return JSON with schema:
{
  "thought": "High level strategic reasoning",
  "estimatedSteps": 3,
  "requiresApproval": true/false,
  "approvalReason": "Explanation if sensitive action is anticipated",
  "steps": [
    { "stepNumber": 1, "description": "...", "isSensitive": false }
  ]
}`;

    const prompt = `Goal: "${goal}"
Target URL: ${url}
Known Site Memory:
${siteMemory ? siteMemory.slice(0, 2000) : 'No prior memory - exploring as unfamiliar site.'}`;

    return this.generateContent(prompt, systemPrompt, true);
  }

  /**
   * Decide next discrete action based on current accessibility tree and history.
   */
  async decideNextAction(goal, currentUrl, accessibilityTree, history = []) {
    const systemPrompt = `You are a Browser Automation Engineer generating Playwright code for 'webcmd browser run'.
You receive the goal, current URL, recent action history, and the current accessibility snapshot tree.
Decide the immediate next best step.

Return JSON with schema:
{
  "thought": "Why you are taking this action",
  "actionType": "navigate" | "click" | "fill" | "extract" | "wait" | "done",
  "isSensitive": true/false,
  "sensitiveCategory": "payment" | "form_submission" | "communication" | "destructive" | null,
  "targetDescription": "Human readable target element or purpose",
  "payload": { ... any form data or payment details ... },
  "playwrightCode": "Valid JavaScript to run inside Playwright (e.g. await page.goto(...); or await page.click(...); return { extracted: ... };)",
  "isComplete": false
}`;

    const prompt = `Goal: "${goal}"
Current URL: ${currentUrl}
History of completed steps:
${JSON.stringify(history, null, 2)}

Current Accessibility Tree Snapshot:
${accessibilityTree ? accessibilityTree.slice(0, 3000) : 'No snapshot available.'}

Produce the next step.`;

    return this.generateContent(prompt, systemPrompt, true);
  }

  /**
   * Synthesize a reusable CLI command and documentation based on what the agent learned.
   * Fulfills webcmd motto: "Explore once. Learn the workflow. Reuse the command."
   */
  async synthesizeLearnedCommand(goal, targetDomain, completedSteps, extractedData) {
    const systemPrompt = `You are webcmd's self-learning command synthesizer.
Your job is to transform an explored browser workflow into a clean, reusable CLI command definition with structured JSON output schema.
Show how subsequent runs can skip LLM rediscovery and execute deterministically.

Return JSON with schema:
{
  "commandName": "e.g. webcmd amazon search-cart",
  "cliUsage": "webcmd amazon search-cart --item 'Sony WH-1000XM5' --max-price 350",
  "tokenSavingsEstimate": "92% (Reduced from ~14,000 tokens to 0 tokens on subsequent executions)",
  "structuredOutputSchema": { ... JSON schema of output ... },
  "summary": "Short explanation of how this was learned and how it will run deterministically."
}`;

    const prompt = `Goal: "${goal}"
Domain: ${targetDomain}
Steps executed: ${JSON.stringify(completedSteps, null, 2)}
Extracted data sample: ${JSON.stringify(extractedData || {}, null, 2)}`;

    return this.generateContent(prompt, systemPrompt, true);
  }
  /**
   * Analyze the user's high-level goal and extract the intended target website,
   * direct search URL (if applicable), query parameters, and constraints.
   */
  async analyzeUserGoal(goal, providedUrl = '') {
    const systemPrompt = `You are an Autonomous Web Agent dispatcher.
Analyze the user's free-form request and determine:
1. Target website name (e.g., "Amazon India", "Flipkart", "Hacker News", "Google", "Books To Scrape", "Wikipedia", "GitHub", etc.)
2. Target domain (e.g., "amazon.in", "flipkart.com", "news.ycombinator.com", "github.com", "google.com")
3. Best initial URL:
   - If the user specifies Amazon and a search term: use direct search url (e.g. "https://www.amazon.in/s?k=" + encodeURIComponent(searchQuery))
   - If the user specifies Flipkart and a search term: use "https://www.flipkart.com/search?q=" + encodeURIComponent(searchQuery)
   - If the user specifies Google: use "https://www.google.com/search?q=" + encodeURIComponent(searchQuery)
   - If the user specifies HackerNews: use "https://news.ycombinator.com"
   - If user provided a specific URL, prioritize that URL unless clearly invalid.
   - If no site is mentioned, choose the most appropriate portal (e.g., Google or Amazon for products).
4. Extracted search query (e.g., "watches of titanium")
5. Constraints: price limits, ratings, roles, formats, etc.
6. Category: "shopping" | "jobs" | "news" | "research" | "form" | "general"
7. requiresApproval: boolean (true if the user's intent involves checkout, purchase, applying, sending message, or deleting).

Return JSON with schema:
{
  "targetSiteName": "...",
  "targetDomain": "...",
  "initialUrl": "...",
  "searchQuery": "...",
  "category": "shopping",
  "constraints": {
    "maxPrice": null,
    "currency": "INR",
    "keywords": []
  },
  "requiresApproval": false,
  "reasoning": "..."
}`;

    const prompt = `User Request: "${goal}"
Provided URL: "${providedUrl || ''}"`;

    return this.generateContent(prompt, systemPrompt, true);
  }

  /**
   * Filter and evaluate extracted page items against user's specific constraints.
   */
  async evaluateSearchResults(goal, items, constraints = {}) {
    const systemPrompt = `You are an autonomous AI shopping and data analyst.
Given a list of candidate items extracted from a web page and the user's goal with constraints,
evaluate which items actually match the criteria (e.g., price <= maxPrice, correct item type, highest rating).
Sort matching items and pick the absolute best winner.

Return JSON schema:
{
  "matchedCount": 1,
  "bestMatch": {
    "title": "...",
    "price": "...",
    "rating": "...",
    "reason": "Why this best fulfills the user's prompt"
  },
  "allMatches": [
    { "title": "...", "price": "...", "rating": "..." }
  ],
  "summary": "..."
}`;

    const prompt = `User Goal: "${goal}"
Constraints: ${JSON.stringify(constraints)}
Extracted Items: ${JSON.stringify(items.slice(0, 15))}`;

    return this.generateContent(prompt, systemPrompt, true);
  }

  /**
   * Generates a comprehensive, human-readable executive summary of the mission in rich Markdown.
   * Details what the agent did, what choices were made, and the final output without rigid canned schemas.
   */
  async generateExecutiveSummary(goal, domain, stepsExecuted = [], finalOutcome = {}, extractedItems = []) {
    const systemPrompt = `You are an elite Autonomous AI Web Agent (like Antigravity / Gemini / Claude).
Your task is to write a comprehensive, professional, unforced Markdown report detailing everything accomplished for the user's mission.

Do NOT follow a rigid or canned template. Structure the report naturally based on what actually occurred, using rich GitHub-Flavored Markdown:
- An authoritative Top Heading with mission outcome
- Executive Overview & Verdict (why this result was selected, key highlights)
- Structured Markdown comparison tables if multiple items, candidates, repositories, or metrics were evaluated
- Deep analysis of findings, specifications, or data extracted from the live page
- Chronological action history explaining key decisions made by the agent
- Safety & Rule #2 audit notice (if human approval or safety gates were armed)
- Live verification notice noting that Cloak Chromium remains open on screen

Write in fluent, high-density, analytical technical prose with clean Markdown formatting (#, ##, ###, tables, bolding, blockquotes, bullet points, and code blocks). Return pure Markdown text directly.`;

    const prompt = `User Mission Goal: "${goal}"
Target Platform / Domain: ${domain}

Chronological Steps Executed by Agent:
${JSON.stringify(stepsExecuted, null, 2)}

Final Selected Outcome / Page State:
${JSON.stringify(finalOutcome, null, 2)}

Candidate Items / Data Extracted from DOM:
${JSON.stringify((extractedItems || []).slice(0, 15), null, 2)}`;

    try {
      const markdown = await this.generateContent(prompt, systemPrompt, false);
      return typeof markdown === 'string' ? markdown.trim() : (markdown.rawText || '');
    } catch (err) {
      console.warn('Gemini markdown summary fallback:', err.message);
      return `# Executive Mission Summary: ${goal}\n\n- **Target Platform:** ${domain}\n- **Outcome:** ${finalOutcome.title || 'Completed'}\n- **Live URL:** ${finalOutcome.pageUrl || domain}\n\n### Executed Steps\n${stepsExecuted.map(s => `- ${s}`).join('\n')}\n\n> 📍 Cloak Chromium remains open on the destination page for your direct review.`;
    }
  }
}

export const geminiClient = new GeminiClient();

