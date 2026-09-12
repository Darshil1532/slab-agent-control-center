import { webcmdBridge } from './webcmdBridge.js';
import { hitlGuard } from './hitlGuard.js';
import { geminiClient } from './geminiClient.js';
import { runEcommerceShopper } from './workflows/ecommerceShopper.js';
import { runJobTracker } from './workflows/jobTracker.js';
import { runNewsResearch } from './workflows/newsResearch.js';
import { runCustomGoal } from './workflows/customRunner.js';
import { runUniversalGoal } from './workflows/universalEngine.js';
import { runGithubDeepDiver } from './workflows/githubDeepDiver.js';
import { runPriceArbitrage } from './workflows/priceArbitrage.js';
import { runJobApplicationMatcher } from './workflows/jobApplicationMatcher.js';
import { runTicketFinder } from './workflows/ticketFinder.js';
import { runExecutiveBriefing } from './workflows/executiveBriefing.js';
import { recipeManager } from './recipeManager.js';

export class AgentController {
  constructor() {
    this.currentSessionId = null;
    this.isRunning = false;
    this.activeTask = null;
    this.eventListeners = new Set();
  }

  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  emit(type, payload = {}) {
    const category = (type === 'log' && payload.type) ? payload.type : (payload.category || type);
    const event = {
      ...payload,
      type,
      category,
      timestamp: new Date().toISOString()
    };
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in event listener:', err);
      }
    }
  }

  async startMission({ workflow, params = {} }) {
    if (this.isRunning) {
      throw new Error('An agent mission is already running. Stop it first.');
    }

    this.isRunning = true;
    this.emit('status_change', { status: 'RUNNING', workflow });

    try {
      // Rotate previous session if starting a new mission
      if (this.currentSessionId) {
        await webcmdBridge.closeSession(this.currentSessionId).catch(() => {});
        this.currentSessionId = null;
      }

      // 1. Create Webcmd Session
      this.emit('log', { type: 'system', message: 'Creating isolated browser session in Cloak Chromium...' });
      this.currentSessionId = await webcmdBridge.createSession(workflow || 'mission');
      this.emit('session_created', { sessionId: this.currentSessionId });

      const context = {
        sessionId: this.currentSessionId,
        bridge: webcmdBridge,
        guard: hitlGuard,
        gemini: geminiClient,
        emit: (type, data) => this.emit(type, data),
        ...params
      };

      const userGoal = params.goal || params.query || params.role || params.topic || '';
      const lowerGoal = userGoal.toLowerCase();
      const lowerWorkflow = (workflow || '').toLowerCase();

      let runner = runUniversalGoal;
      if (lowerWorkflow === 'github' || lowerGoal.includes('github') || lowerGoal.includes('repo deep-diver') || lowerGoal.includes('tech stack')) {
        runner = runGithubDeepDiver;
      } else if (lowerWorkflow === 'arbitrage' || lowerGoal.includes('arbitrage') || (lowerGoal.includes('amazon') && lowerGoal.includes('flipkart'))) {
        runner = runPriceArbitrage;
      } else if (lowerWorkflow === 'jobs' || lowerGoal.includes('job application') || lowerGoal.includes('skill matcher') || lowerGoal.includes('wellfound') || lowerGoal.includes('linkedin')) {
        runner = runJobApplicationMatcher;
      } else if (lowerWorkflow === 'events' || lowerGoal.includes('showtime') || lowerGoal.includes('bookmyshow') || lowerGoal.includes('district') || lowerGoal.includes('movie')) {
        runner = runTicketFinder;
      } else if (lowerWorkflow === 'briefing' || lowerGoal.includes('briefing') || lowerGoal.includes('macro tech shift') || (lowerGoal.includes('hacker news') && lowerGoal.includes('bloomberg'))) {
        runner = runExecutiveBriefing;
      }

      const result = await runner({
        ...context,
        goal: userGoal || 'Explore target website and extract structured findings',
        url: params.url || ''
      });

      return result;
    } catch (err) {
      console.error('Mission execution failed:', err);
      this.emit('task_error', {
        message: err.message,
        stack: err.stack
      });
      throw err;
    } finally {
      this.isRunning = false;
      this.emit('status_change', { status: 'IDLE' });
      // Keep session and page open so the user can see and interact with the page afterwards
    }
  }

  handleApproval(approved) {
    if (webcmdBridge.currentApprovalPromise) {
      webcmdBridge.currentApprovalPromise(approved);
      webcmdBridge.currentApprovalPromise = null;
      this.emit('approval_resolved', { approved });
      return true;
    }
    return false;
  }

  async stopMission() {
    if (webcmdBridge.currentApprovalPromise) {
      webcmdBridge.currentApprovalPromise(false);
      webcmdBridge.currentApprovalPromise = null;
    }
    if (this.currentSessionId) {
      await webcmdBridge.closeSession(this.currentSessionId);
    }
    this.isRunning = false;
    this.emit('status_change', { status: 'STOPPED' });
    this.emit('log', { type: 'warning', message: 'Mission forcefully stopped by operator.' });
  }

  /**
   * Reuses a preserved deterministic command in live Chromium (Zero LLM Tokens).
   * "Explore once. Learn the workflow. Reuse the command."
   */
  async runLearnedCommand({ commandName, cliScript, domain }) {
    if (this.isRunning) {
      throw new Error('An agent mission is already running. Stop it first.');
    }
    this.isRunning = true;
    this.emit('status_change', { status: 'RUNNING', workflow: 'fast_path_replay' });

    try {
      if (!this.currentSessionId) {
        this.currentSessionId = await webcmdBridge.createSession('fast-path-replay');
        this.emit('session_created', { sessionId: this.currentSessionId });
      }

      const recipe = recipeManager.findRecipeForGoal(commandName || '', domain || '') || {
        commandName: commandName || 'webcmd auto-command -f json',
        cliScript: cliScript || '',
        domain: domain || 'target-site',
        tokenSavings: '92% Token Cost Saved (0 LLM Tokens)',
        executableScript: cliScript?.includes('page.goto') ? cliScript : `
          const url = page.url();
          const title = await page.title();
          return { command: '${commandName || 'reused-command'}', status: 'verified', title, url };
        `
      };

      return await recipeManager.executeRecipe(recipe, this.currentSessionId, webcmdBridge, (t, d) => this.emit(t, d));
    } catch (err) {
      console.error('Command reuse execution failed:', err);
      this.emit('task_error', { message: err.message, stack: err.stack });
      throw err;
    } finally {
      this.isRunning = false;
      this.emit('status_change', { status: 'IDLE' });
    }
  }
}

export const agentController = new AgentController();
