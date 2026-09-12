import { agentController } from '../../src/agent.js';
import { webcmdBridge } from '../../src/webcmdBridge.js';

(async () => {
  console.log('Testing updated Movie & Event Finder with blank target URL...');

  let approvalHandled = false;
  let executiveSummaryReceived = null;

  agentController.onEvent(event => {
    if (event.type === 'log') {
      console.log(`[LOG - ${event.category || event.type}] ${event.message}`);
    } else if (event.type === 'step_start') {
      console.log(`[STEP START] Step ${event.step}: ${event.title}`);
    } else if (event.type === 'step_executed') {
      console.log(`[STEP DONE] Step ${event.step}: ${event.title}`);
    } else if (event.type === 'approval_required') {
      console.log(`[RULE #2 HITL GATE] Approval Required: ${event.message}`);
      if (!approvalHandled) {
        approvalHandled = true;
        console.log('Simulating Operator APPROVAL in 2 seconds...');
        setTimeout(() => {
          agentController.handleApproval(true);
        }, 2000);
      }
    } else if (event.type === 'executive_summary') {
      console.log('[EXECUTIVE SUMMARY RECEIVED]');
      executiveSummaryReceived = event.summary || event.markdown;
    }
  });

  const missionResult = await agentController.startMission({
    workflow: 'events',
    params: {
      goal: 'Find showtimes for Mirzapur: The Movie in Gurgaon on District, compare cinemas, pick the cheapest seats, and approval-gate the actual booking',
      url: '' // Blank URL as shown in user screenshot
    }
  });

  console.log('\n--- Mission Finished ---');
  console.log('Success:', missionResult.success);
  console.log('Movie:', missionResult.movieTitle);
  console.log('City:', missionResult.city);
  console.log('Venue:', missionResult.venue);
  console.log('Showtime:', missionResult.showtime);
  console.log('Total Payable:', missionResult.totalPayable);
  console.log('\n--- Final Generated Markdown Report ---\n', missionResult.summary);

  process.exit(0);
})();
