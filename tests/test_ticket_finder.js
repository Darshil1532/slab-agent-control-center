import { webcmdBridge } from '../src/webcmdBridge.js';
import { hitlGuard } from '../src/hitlGuard.js';
import { geminiClient } from '../src/geminiClient.js';
import { runTicketFinder } from '../src/workflows/ticketFinder.js';

async function main() {
  console.log('--- Universal Test: Finding showtimes for "Hanuman Ansh" in Delhi on District ---');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-hanuman-delhi');
  console.log('Session ID:', sessionId);

  const goal = "Find showtimes for Hanuman Ansh in Delhi on District, compare cinemas, pick the cheapest seats, and approval-gate the booking";
  const url = "";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
    if (type === 'approval_required') {
      console.log('>>> MOVIE BOOKING HITL GATE ARMED! Approving in 2 seconds...');
      setTimeout(() => {
        if (webcmdBridge.currentApprovalPromise) {
          webcmdBridge.currentApprovalPromise(true);
          webcmdBridge.currentApprovalPromise = null;
        }
      }, 2000);
    }
  };

  try {
    const result = await runTicketFinder({
      goal,
      url,
      sessionId,
      bridge: webcmdBridge,
      guard: hitlGuard,
      gemini: geminiClient,
      emit
    });

    console.log('\n========================================');
    console.log('=== Universal Ticket Finder Result ===');
    console.log('========================================');
    console.log('Success:', result.success);
    console.log('Movie:', result.movieTitle);
    console.log('City:', result.city);
    console.log('Selected Venue:', result.venue);
    console.log('Showtime:', result.showtime);
    console.log('Total Payable:', result.totalPayable);
    console.log('\n--- Unforced Markdown Summary Preview ---');
    console.log(result.summary?.slice(0, 600) + '...\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await webcmdBridge.closeSession(sessionId);
    console.log('Test complete.');
  }
}

main().catch(console.error);
