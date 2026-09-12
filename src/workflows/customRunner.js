/**
 * Autonomous Custom Goal Runner
 * Allows executing free-form user/judge instructions on any target website.
 * Follows the perceive-plan-act loop with webcmd and Gemini 3.1 Flash Lite.
 */

export async function runCustomGoal({ goal, url = 'https://news.ycombinator.com', sessionId, bridge, guard, gemini, emit }) {
  emit('log', {
    type: 'info',
    message: `🎯 Launching Autonomous Goal: "${goal}" on ${url}`,
    step: 1
  });

  // Step 1: Memory check
  emit('log', { type: 'memory', message: `Checking webcmd sitemap memory for ${url}...` });
  const memory = await bridge.getSiteMemoryContext(url, 'custom-goal');
  emit('memory_loaded', {
    domain: new URL(url).hostname,
    status: memory.found ? 'Memory Context Present' : 'Fresh Exploration',
    memoryPreview: memory.siteMarkdown || 'Exploring unfamiliar site structure.'
  });

  // Step 2: High level planning
  emit('step_start', { step: 1, title: 'Formulating Autonomous Execution Plan' });
  const plan = await gemini.planMission(goal, url, memory.siteMarkdown);
  emit('plan_generated', plan);

  // Step 3: Initial Navigation
  emit('step_start', { step: 2, title: `Navigating to ${url}` });
  const initNavScript = `
    await page.goto('${url}', { waitUntil: 'domcontentloaded', timeout: 25000 });
    return { title: await page.title(), url: page.url() };
  `;
  const initResult = await bridge.runScript(sessionId, initNavScript);
  emit('step_executed', {
    step: 2,
    title: `Arrived at ${initResult.page?.title || url}`,
    page: initResult.page,
    timing: initResult.timings?.program_ms || 120,
    snapshotDiff: initResult.snapshotDiff
  });

  // Perception & Action loop (up to 4 steps)
  const history = [];
  let currentUrl = initResult.page?.url || url;
  let finalResult = null;

  for (let cycle = 1; cycle <= 4; cycle++) {
    emit('log', { type: 'ai_reasoning', message: `Perception Cycle ${cycle}: Capturing compact accessibility snapshot...` });
    const snapshot = await bridge.getSnapshot(sessionId);
    
    emit('log', { type: 'ai_reasoning', message: `Gemini 3.1 Flash Lite deciding optimal next action...` });
    const nextAction = await gemini.decideNextAction(goal, currentUrl, snapshot.tree, history);

    emit('log', {
      type: 'info',
      message: `Action Proposed: [${nextAction.actionType}] ${nextAction.targetDescription || nextAction.thought}`
    });

    if (nextAction.actionType === 'done' || nextAction.isComplete) {
      finalResult = nextAction;
      break;
    }

    // Check for sensitive action
    const check = guard.evaluateAction({
      type: nextAction.actionType,
      text: nextAction.targetDescription,
      selector: nextAction.targetDescription,
      payload: nextAction.payload,
      url: currentUrl
    });

    if (check.requiresApproval || nextAction.isSensitive) {
      emit('approval_required', {
        ...(check.approvalRequest || {
          id: `hitl-${Date.now()}`,
          risk: 'HIGH',
          category: nextAction.sensitiveCategory || 'sensitive_operation',
          warning: 'This action has been marked as sensitive by the safety policy.'
        }),
        action: {
          type: nextAction.actionType,
          target: nextAction.targetDescription,
          payload: nextAction.payload
        },
        message: `Human approval required: Proceed with "${nextAction.targetDescription}"?`
      });

      const approved = await new Promise((resolve) => {
        bridge.currentApprovalPromise = resolve;
      });

      if (!approved) {
        emit('log', { type: 'warning', message: '❌ Operator declined permission. Halting goal.' });
        return { success: false, status: 'REJECTED_BY_OPERATOR' };
      }

      emit('log', { type: 'success', message: '✅ Permission GRANTED by operator.' });
    }

    // Execute the action code
    if (nextAction.playwrightCode) {
      emit('step_start', { step: 2 + cycle, title: `Executing: ${nextAction.targetDescription}` });
      const execResult = await bridge.runScript(sessionId, nextAction.playwrightCode);
      history.push({
        action: nextAction.targetDescription,
        result: execResult.result || execResult.page?.title
      });
      currentUrl = execResult.page?.url || currentUrl;

      emit('step_executed', {
        step: 2 + cycle,
        title: `Executed: ${nextAction.targetDescription}`,
        page: execResult.page,
        timing: execResult.timings?.program_ms || 100,
        snapshotDiff: execResult.snapshotDiff
      });
    } else {
      break;
    }
  }

  // Synthesize learned command
  const learned = await gemini.synthesizeLearnedCommand(
    goal,
    new URL(url).hostname,
    history,
    finalResult || { status: 'Success' }
  );

  emit('command_learned', learned);

  emit('task_complete', {
    summary: `Autonomous mission completed for goal: "${goal}"`,
    structuredData: {
      goal,
      url,
      history,
      completedAt: new Date().toISOString()
    }
  });

  return { success: true, history };
}
