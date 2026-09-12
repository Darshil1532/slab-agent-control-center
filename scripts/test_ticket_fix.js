import { agentController } from '../src/agent.js';

async function testFix() {
  console.log('Testing startMission with Stree 2 on District...');
  agentController.onEvent((ev) => {
    if (ev.type === 'log') console.log(`[LOG ${ev.category || 'info'}] ${ev.message}`);
    else if (ev.type === 'step_start') console.log(`[STEP START ${ev.step}] ${ev.title}`);
    else if (ev.type === 'step_executed') console.log(`[STEP DONE ${ev.step}] ${ev.title}`);
    else if (ev.type === 'task_error') console.log(`[TASK ERROR] ${ev.message}`);
    else if (ev.type === 'task_complete') console.log(`[TASK COMPLETE] ${ev.summary?.slice(0, 100)}`);
    else if (ev.type === 'approval_required') {
      console.log(`[APPROVAL REQUIRED] Action: ${ev.action?.type} - Auto-approving for test...`);
      setTimeout(() => agentController.handleApproval(true), 1000);
    }
  });

  try {
    const result = await agentController.startMission({
      workflow: 'events',
      params: {
        goal: 'Find showtimes for Stree 2 in Mumbai on District, compare cinemas, pick the cheapest seats, and approval-gate the booking'
      }
    });
    console.log('Mission finished successfully! Result summary:', result?.summary?.slice(0, 120) || 'Completed');
  } catch (err) {
    console.error('Mission threw error:', err.message);
  } finally {
    process.exit(0);
  }
}

testFix();
