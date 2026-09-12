/**
 * SLAB Agent Control Center - Frontend Application Logic
 * Professional, Modern Minimalist Light Theme
 */

class AgentDashboard {
  constructor() {
    this.ws = null;
    this.currentWorkflow = 'github';
    this.stepCount = 0;
    this.logCount = 0;

    this.presets = {
      github: {
        prompt: 'Inspect facebook/react repository: analyze tech stack, dependencies, star metrics, and architecture summary',
        url: 'https://github.com/facebook/react'
      },
      arbitrage: {
        prompt: 'Compare Sony WH-1000XM4 across Amazon and Flipkart, find the cheapest deal, calculate arbitrage savings, and queue checkout',
        url: ''
      },
      jobs: {
        prompt: 'Search hiring board for Senior Full-Stack / AI Engineer roles, match candidate skills (Node.js, React, Playwright, Python), prefill application form, and request submission gate',
        url: 'https://news.ycombinator.com/jobs'
      },
      events: {
        prompt: 'Find showtimes for Stree 2 in Mumbai on District, compare cinemas, pick the cheapest seats, and approval-gate the booking',
        url: ''
      },
      briefing: {
        prompt: 'Check Hacker News, Bloomberg, and CoinDesk, filter out hype/sponsored posts, and give me a 3-minute bulleted digest of major macro tech shifts today.',
        url: ''
      },
      custom: {
        prompt: 'Explore target website and extract structured findings',
        url: 'https://news.ycombinator.com'
      }
    };

    this.initElements();
    this.initEvents();
    this.connectWebSocket();
    this.fetchSystemStatus();
  }

  initElements() {
    this.els = {
      btnLaunch: document.getElementById('btn-launch'),
      btnStop: document.getElementById('btn-stop-mission'),
      btnClear: document.getElementById('btn-clear-logs'),
      missionPrompt: document.getElementById('mission-prompt'),
      missionUrl: document.getElementById('mission-url'),
      urlGroup: document.getElementById('url-group'),
      presets: document.querySelectorAll('.workflow-card, .preset-tab, .preset-card'),
      tabs: document.querySelectorAll('.tab-button, .tab-item, .tab-btn'),
      tabPanes: document.querySelectorAll('.tab-view, .tab-pane, .tab-content'),
      feedContainer: document.getElementById('feed-container'),
      logCount: document.getElementById('log-count'),
      liveIndicator: document.getElementById('live-indicator'),
      liveStatusText: document.getElementById('live-status-text'),
      
      // Right inspector panel
      hitlCard: document.getElementById('hitl-card'),
      hitlWarningText: document.getElementById('hitl-warning-text'),
      hitlActionName: document.getElementById('hitl-action-name'),
      hitlActionTarget: document.getElementById('hitl-action-target'),
      hitlPayloadView: document.getElementById('hitl-payload-view'),
      btnHitlApprove: document.getElementById('btn-hitl-approve'),
      btnHitlReject: document.getElementById('btn-hitl-reject'),

      // Telemetry
      sessionBadge: document.getElementById('session-badge'),
      statSteps: document.getElementById('stat-steps'),
      statLatency: document.getElementById('stat-latency'),
      statMemoryStatus: document.getElementById('stat-memory-status'),
      memoryPreviewBox: document.getElementById('memory-preview-box'),
      memoryHitPill: document.getElementById('memory-hit-pill'),
      snapshotPreviewBox: document.getElementById('snapshot-preview-box'),

      // Learned tab
      learnedCliBox: document.getElementById('learned-cli-box'),
      savingsCard: document.getElementById('savings-card'),
      statSavings: document.getElementById('stat-savings'),
      statSummary: document.getElementById('stat-summary'),
      btnCopyCmd: document.getElementById('btn-copy-cmd'),
      btnRunCmd: document.getElementById('btn-run-cmd'),

      // JSON tab
      jsonOutputBox: document.getElementById('json-output-box'),

      // Summary tab
      tabBtnSummary: document.getElementById('tab-btn-summary'),
      summaryBadge: document.getElementById('summary-badge'),
      emptySummaryState: document.getElementById('empty-summary-state'),
      summaryActiveReport: document.getElementById('summary-active-report'),
      markdownRenderArea: document.getElementById('markdown-render-area'),
      btnCopyMd: document.getElementById('btn-copy-md')
    };
  }

  switchToTab(tabId) {
    this.els.tabs.forEach(t => t.classList.remove('active'));
    this.els.tabPanes.forEach(p => p.classList.remove('active'));
    const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (btn) btn.classList.add('active');
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
  }

  initEvents() {
    // Preset selection
    this.els.presets.forEach(tab => {
      tab.addEventListener('click', () => {
        this.els.presets.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentWorkflow = tab.dataset.workflow;

        const preset = this.presets[this.currentWorkflow];
        if (preset) {
          this.els.missionPrompt.value = preset.prompt;
          this.els.missionUrl.value = preset.url;
        }

        if (this.els.urlGroup) {
          this.els.urlGroup.style.display = 'flex';
        }
      });
    });

    // Populate initial active preset
    const defaultPreset = this.presets[this.currentWorkflow];
    if (defaultPreset) {
      this.els.missionPrompt.value = defaultPreset.prompt;
      this.els.missionUrl.value = defaultPreset.url;
      if (this.els.urlGroup) this.els.urlGroup.style.display = 'flex';
    }

    // Tab switching
    this.els.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchToTab(tab.dataset.tab);
      });
    });

    // Mission controls
    this.els.btnLaunch.addEventListener('click', () => this.launchMission());
    this.els.btnStop.addEventListener('click', () => this.stopMission());
    this.els.btnClear.addEventListener('click', () => this.clearFeed());

    // HITL Approvals
    this.els.btnHitlApprove.addEventListener('click', () => {
      this.send({ action: 'approve' });
    });
    this.els.btnHitlReject.addEventListener('click', () => {
      this.send({ action: 'reject' });
    });

    // Copy command
    this.els.btnCopyCmd.addEventListener('click', () => {
      const text = this.els.learnedCliBox.innerText;
      navigator.clipboard.writeText(text);
      this.els.btnCopyCmd.innerHTML = '<span>Copied!</span>';
      setTimeout(() => {
        this.els.btnCopyCmd.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        `;
      }, 1800);
    });

    // Copy Markdown Summary
    if (this.els.btnCopyMd) {
      this.els.btnCopyMd.addEventListener('click', () => {
        const text = this.rawMarkdownSummary || (this.els.markdownRenderArea ? this.els.markdownRenderArea.innerText : '');
        navigator.clipboard.writeText(text);
        this.els.btnCopyMd.innerHTML = '<span>Copied!</span>';
        setTimeout(() => {
          this.els.btnCopyMd.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Markdown</span>
          `;
        }, 1800);
      });
    }

    // Reuse Deterministic Command (Fast-Path Replay)
    if (this.els.btnRunCmd) {
      this.els.btnRunCmd.addEventListener('click', () => {
        const cmdText = this.els.learnedCliBox ? this.els.learnedCliBox.innerText : '';
        this.clearEmptyFeed();
        this.switchToTab('tab-feed');
        this.setRunningState(true);
        this.appendLog('system', `⚡ Reusing deterministic command: ${this.currentLearnedCommandName || 'webcmd command'} (Zero LLM Tokens)`);
        this.send({
          action: 'run_learned_command',
          commandName: this.currentLearnedCommandName || 'webcmd automated-workflow',
          cliScript: cmdText,
          domain: this.currentLearnedDomain || ''
        });
      });
    }
  }

  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to Agent Control Center WebSocket.');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.error('Error handling message:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('WebSocket connection closed. Retrying in 2s...');
      setTimeout(() => this.connectWebSocket(), 2000);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  async fetchSystemStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.daemon?.daemonRunning) {
        const pulse = document.querySelector('#status-daemon .chip-pulse');
        if (pulse) pulse.className = 'chip-pulse green';
      }
    } catch {
      console.log('Status endpoint check skipped.');
    }
  }

  launchMission() {
    const prompt = this.els.missionPrompt.value.trim();
    const url = this.els.missionUrl.value.trim();

    this.stepCount = 0;
    this.els.statSteps.innerText = '0';
    this.clearEmptyFeed();

    // Reset summary view
    if (this.els.summaryBadge) this.els.summaryBadge.style.display = 'none';
    if (this.els.summaryActiveReport) {
      this.els.summaryActiveReport.style.display = 'none';
    }
    const existingRenderArea = document.getElementById('markdown-render-area');
    if (existingRenderArea) existingRenderArea.innerHTML = '';
    if (this.els.emptySummaryState) this.els.emptySummaryState.style.display = 'flex';

    // Switch to feed tab during execution so user sees live events
    this.switchToTab('tab-feed');

    this.send({
      action: 'start',
      workflow: this.currentWorkflow,
      params: {
        query: prompt,
        role: prompt,
        topic: prompt,
        goal: prompt,
        url: url
      }
    });

    this.setRunningState(true);
  }

  stopMission() {
    this.send({ action: 'stop' });
    this.setRunningState(false);
  }

  clearFeed() {
    this.els.feedContainer.innerHTML = '';
    this.logCount = 0;
    this.els.logCount.innerText = '0';
  }

  clearEmptyFeed() {
    const empty = this.els.feedContainer.querySelector('.empty-timeline-state, .empty-feed, .empty-state');
    if (empty) empty.remove();
  }

  setRunningState(running) {
    if (running) {
      this.els.btnLaunch.disabled = true;
      this.els.btnStop.disabled = false;
      this.els.liveIndicator.classList.add('running');
      this.els.liveStatusText.innerText = 'Active (Cloak Chromium)';
    } else {
      this.els.btnLaunch.disabled = false;
      this.els.btnStop.disabled = true;
      this.els.liveIndicator.classList.remove('running');
      this.els.liveStatusText.innerText = 'Mission Idle';
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'status_change':
        this.setRunningState(msg.status === 'RUNNING');
        break;

      case 'session_created':
        this.els.sessionBadge.innerText = msg.sessionId;
        break;

      case 'memory_loaded':
        this.els.statMemoryStatus.innerText = 'Active (L1)';
        this.els.memoryHitPill.innerText = msg.status || 'Local Memory';
        this.els.memoryPreviewBox.innerText = msg.memoryPreview;
        break;

      case 'log':
        this.appendLog(msg.category || 'info', msg.message, msg.timestamp);
        break;

      case 'info':
      case 'system':
      case 'memory':
      case 'ai_reasoning':
      case 'success':
      case 'warning':
      case 'error':
        this.appendLog(msg.type, msg.message, msg.timestamp);
        break;

      case 'step_start':
        this.appendLog('info', `Step ${msg.step}: ${msg.title}`, msg.timestamp);
        break;

      case 'step_executed':
        this.stepCount = (this.stepCount || 0) + 1;
        this.els.statSteps.innerText = this.stepCount;
        if (msg.timing) {
          this.els.statLatency.innerText = `${msg.timing}ms`;
        }
        if (msg.snapshotDiff) {
          this.appendLog('success', `Completed: ${msg.title} (${msg.timing || 95}ms)`, msg.timestamp, msg.snapshotDiff);
          this.els.snapshotPreviewBox.innerText = msg.snapshotDiff;
        } else {
          this.appendLog('success', `Completed: ${msg.title} (${msg.timing || 95}ms)`, msg.timestamp);
        }
        break;

      case 'approval_required':
        this.showHitlApproval(msg);
        break;

      case 'approval_resolved':
        this.hideHitlApproval();
        break;

      case 'command_learned':
        this.showLearnedCommand(msg);
        break;

      case 'executive_summary':
        this.renderExecutiveSummary(msg);
        this.switchToTab('tab-summary');
        if (this.els.summaryBadge) this.els.summaryBadge.style.display = 'inline-block';
        break;

      case 'task_complete':
        this.appendLog('success', `Task Finished: ${typeof msg.summary === 'string' ? msg.summary.slice(0, 100) : 'Done'}`, msg.timestamp);
        this.els.jsonOutputBox.innerText = JSON.stringify(msg.structuredData || {}, null, 2);
        const reportToRender = msg.markdown || msg.summary || msg.executiveReport || msg.report;
        if (reportToRender) {
          this.renderExecutiveSummary(reportToRender, msg.structuredData);
          this.switchToTab('tab-summary');
          if (this.els.summaryBadge) this.els.summaryBadge.style.display = 'inline-block';
        }
        this.setRunningState(false);
        break;

      case 'task_error':
        this.appendLog('error', `Execution Error: ${msg.message}`, msg.timestamp);
        this.setRunningState(false);
        break;
    }
  }

  appendLog(category, message, timestamp, diff = null) {
    this.clearEmptyFeed();
    this.logCount++;
    this.els.logCount.innerText = this.logCount;

    const item = document.createElement('div');
    item.className = `feed-item type-${category}`;

    const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : new Date().toLocaleTimeString();

    let diffHtml = '';
    if (diff) {
      diffHtml = `<div class="feed-diff-box">${this.escapeHtml(diff.slice(0, 500))}</div>`;
    }

    item.innerHTML = `
      <div class="feed-item-header">
        <span class="feed-type-tag">${category.replace('_', ' ')}</span>
        <span>${timeStr}</span>
      </div>
      <div class="feed-message">${this.escapeHtml(message)}</div>
      ${diffHtml}
    `;

    this.els.feedContainer.appendChild(item);
    this.els.feedContainer.scrollTop = this.els.feedContainer.scrollHeight;
  }

  showHitlApproval(req) {
    this.els.hitlCard.style.display = 'flex';
    this.els.hitlWarningText.innerText = req.warning || req.message;
    this.els.hitlActionName.innerText = req.action?.type || req.category || 'Sensitive Action';
    this.els.hitlActionTarget.innerText = req.action?.target || 'Web Element';
    this.els.hitlPayloadView.innerText = JSON.stringify(req.action?.payload || {}, null, 2);

    this.appendLog('warning', `[Rule #2 Gate] Human sign-off required: ${req.message}`, req.timestamp);
  }

  hideHitlApproval() {
    this.els.hitlCard.style.display = 'none';
  }

  showLearnedCommand(learned) {
    this.currentLearnedCommandName = learned.commandName || learned.recipeName || 'webcmd automated-workflow';
    this.currentLearnedDomain = learned.domain || '';

    const cmdText = learned.recipe || learned.cliScript || [
      `# ${learned.commandName || 'webcmd automated workflow'}`,
      `# ${learned.summary || 'Compiled deterministic command'}`,
      `# Token Savings: ${learned.tokenSavingsEstimate || '90%'}`,
      ``,
      learned.cliUsage || `webcmd run --workflow`
    ].join('\n');

    this.els.learnedCliBox.innerText = cmdText;
    this.els.savingsCard.style.display = 'flex';
    if (learned.tokenSavingsEstimate) {
      this.els.statSavings.innerText = learned.tokenSavingsEstimate.split(' ')[0] || '90%';
      this.els.statSummary.innerText = learned.tokenSavingsEstimate;
    }
  }

  renderExecutiveSummary(report, structuredData = {}) {
    if (!report) return;

    if (this.els.emptySummaryState) this.els.emptySummaryState.style.display = 'none';
    if (this.els.summaryActiveReport) this.els.summaryActiveReport.style.display = 'flex';

    // 1. Extract or construct rich Markdown content
    let markdownContent = '';

    if (typeof report === 'string') {
      markdownContent = report;
    } else if (typeof report.markdown === 'string') {
      markdownContent = report.markdown;
    } else if (typeof report.summary === 'string' && report.summary.trim().length > 0) {
      markdownContent = report.summary;
    } else if (typeof report.report === 'string') {
      markdownContent = report.report;
    } else if (report.report && typeof report.report === 'object') {
      const inner = report.report;
      if (typeof inner.markdown === 'string') {
        markdownContent = inner.markdown;
      } else if (typeof inner.summary === 'string') {
        markdownContent = inner.summary;
      } else {
        markdownContent = `# ${inner.headline || 'Mission Completed Successfully'}\n\n`;
        if (inner.overview) markdownContent += `> ${inner.overview}\n\n`;
        if (inner.finalOutput && typeof inner.finalOutput === 'object') {
          const fo = inner.finalOutput;
          markdownContent += `### 🎯 Key Result: ${fo.title || 'Verified'}\n`;
          if (fo.subtitle) markdownContent += `- **Context:** ${fo.subtitle}\n`;
          if (fo.priceOrMetric) markdownContent += `- **Key Metric:** ${fo.priceOrMetric}\n`;
          if (fo.ratingOrScore) markdownContent += `- **Rating / Status:** ${fo.ratingOrScore}\n`;
          if (fo.verdict) markdownContent += `- **Analysis:** ${fo.verdict}\n`;
          if (fo.pageUrl) markdownContent += `- **Destination:** [${fo.pageUrl}](${fo.pageUrl})\n\n`;
        }
        if (inner.whatWasDone && Array.isArray(inner.whatWasDone)) {
          markdownContent += `### 🔄 Executed Steps\n\n`;
          inner.whatWasDone.forEach(s => { markdownContent += `- ${s}\n`; });
          markdownContent += `\n`;
        }
      }
    } else {
      // General fallback
      markdownContent = `# Mission Accomplished\n\n`;
      if (report.headline) markdownContent += `### ${report.headline}\n\n`;
      if (report.overview) markdownContent += `> ${report.overview}\n\n`;
    }

    this.rawMarkdownSummary = markdownContent;

    // 2. Render Markdown via marked.js
    let renderArea = document.getElementById('markdown-render-area');
    const activeReportEl = document.getElementById('summary-active-report');

    if (!renderArea && activeReportEl) {
      activeReportEl.innerHTML = `
        <div class="summary-toolbar">
          <div class="summary-meta-badges">
            <span class="badge-md-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>
              <span>Autonomous Markdown Digest</span>
            </span>
            <span class="badge-live-tag">
              <span class="live-dot" style="width:6px; height:6px;"></span>
              <span>Live Verification</span>
            </span>
          </div>
          <button class="btn btn-copy-md" id="btn-copy-md" title="Copy raw markdown to clipboard">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Markdown</span>
          </button>
        </div>
        <div class="markdown-body" id="markdown-render-area"></div>
      `;
      renderArea = document.getElementById('markdown-render-area');
      const copyBtn = document.getElementById('btn-copy-md');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(this.rawMarkdownSummary || '');
          copyBtn.innerHTML = '<span>Copied!</span>';
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span>Copy Markdown</span>
            `;
          }, 1800);
        });
      }
    }

    if (renderArea) {
      if (window.marked && typeof window.marked.parse === 'function') {
        renderArea.innerHTML = window.marked.parse(markdownContent);
      } else {
        renderArea.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${this.escapeHtml(markdownContent)}</pre>`;
      }
    }

    // 3. Make active report visible and hide empty state
    const emptyEl = document.getElementById('empty-summary-state');
    if (emptyEl) emptyEl.style.display = 'none';
    if (activeReportEl) activeReportEl.style.display = 'flex';

    if (this.els.summaryBadge) {
      this.els.summaryBadge.style.display = 'inline-block';
      this.els.summaryBadge.innerText = 'Ready';
    }

    // Automatically transition to summary tab
    this.switchToTab('tab-summary');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AgentDashboard();
});
