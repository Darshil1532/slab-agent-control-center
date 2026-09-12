import { agentController } from '../src/agent.js';
import { webcmdBridge } from '../src/webcmdBridge.js';

async function testIntegratedEngine() {
  console.log('===========================================================');
  console.log('🧪 VERIFYING ALL 5 WORKFLOWS THROUGH AGENT CONTROLLER');
  console.log('===========================================================');

  await webcmdBridge.init();

  const autoApproveHITL = () => {
    if (webcmdBridge.currentApprovalPromise) {
      console.log('>>> AUTO-APPROVING HITL RULE #2 GATE IN TEST RUN...');
      webcmdBridge.currentApprovalPromise(true);
      webcmdBridge.currentApprovalPromise = null;
    }
  };

  agentController.onEvent((evt) => {
    if (evt.type === 'step_executed') {
      console.log(`  [STEP DONE] ${evt.title}`);
    } else if (evt.type === 'approval_required') {
      console.log(`  [HITL GATE] ${evt.message}`);
      setTimeout(autoApproveHITL, 1500);
    } else if (evt.type === 'executive_summary') {
      console.log('  [REPORT GENERATED] Executive Summary compiled successfully.');
    }
  });

  const workflows = [
    {
      id: 'github',
      name: '1. GitHub Tech Stack & Repo Deep-Diver',
      workflow: 'github',
      params: {
        goal: 'Inspect facebook/react repository: analyze tech stack, dependencies, star metrics, and architecture summary',
        url: 'https://github.com/facebook/react'
      }
    },
    {
      id: 'arbitrage',
      name: '2. Amazon vs Flipkart Arbitrage',
      workflow: 'arbitrage',
      params: {
        goal: 'Compare Sony WH-1000XM4 across Amazon and Flipkart, find cheapest deal, calculate arbitrage savings, and queue checkout',
        url: ''
      }
    },
    {
      id: 'jobs',
      name: '3. Job Application Auto-Filler & Skill Matcher',
      workflow: 'jobs',
      params: {
        goal: 'Search hiring board for Senior Full-Stack / AI Engineer roles, match candidate skills (Node.js, React, Playwright, Python), prefill application form, and request submission gate',
        url: 'https://news.ycombinator.com/jobs'
      }
    },
    {
      id: 'events',
      name: '4. Movie / Event Finder (District / BookMyShow)',
      workflow: 'events',
      params: {
        goal: 'Find showtimes for Mirzapur: The Movie in Gurgaon on District, compare cinemas, pick the cheapest seats, and approval-gate the booking',
        url: 'https://www.district.in/movies/mirzapur-the-movie-movie-tickets-in-gurgaon-MV181196'
      }
    },
    {
      id: 'briefing',
      name: '5. Custom Daily Executive Briefing (Tech/Finance/Crypto)',
      workflow: 'briefing',
      params: {
        goal: 'Check Hacker News, Bloomberg, and CoinDesk, filter out hype/sponsored posts, and give me a 3-minute bulleted digest of major macro tech shifts today.',
        url: ''
      }
    }
  ];

  const results = [];

  for (const wf of workflows) {
    console.log(`\n▶ Starting Test: ${wf.name}`);
    const startTime = Date.now();
    try {
      const res = await agentController.startMission({
        workflow: wf.workflow,
        params: wf.params
      });
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ ${wf.name} completed successfully in ${elapsed}s!`);
      results.push({ id: wf.id, name: wf.name, status: 'PASSED', elapsed: `${elapsed}s` });
    } catch (err) {
      console.error(`❌ ${wf.name} failed:`, err.message);
      results.push({ id: wf.id, name: wf.name, status: 'FAILED', error: err.message });
    }
  }

  console.log('\n===========================================================');
  console.log('📊 ALL WORKFLOWS TEST SUMMARY TABLE');
  console.log('===========================================================');
  console.table(results);
}

testIntegratedEngine().catch(console.error);
