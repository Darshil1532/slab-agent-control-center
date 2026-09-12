import { webcmdBridge } from '../src/webcmdBridge.js';
import { hitlGuard } from '../src/hitlGuard.js';
import { geminiClient } from '../src/geminiClient.js';
import { runPriceArbitrage } from '../src/workflows/priceArbitrage.js';

async function main() {
  console.log('=== Testing 5-Step Amazon vs Flipkart Product Comparison Workflow ===');
  await webcmdBridge.init();
  const sessionId = await webcmdBridge.createSession('test-arbitrage-5step');
  console.log('Session ID:', sessionId);

  const goal = "Compare Sony WH-1000XM4 across Amazon and Flipkart, find the cheapest deal, calculate arbitrage savings, and queue checkout";
  const url = "";

  const emit = (type, data) => {
    console.log(`[EVENT: ${type}]`, data.title || data.message || data.status || '');
    if (type === 'approval_required') {
      console.log('>>> ARBITRAGE HITL GATE ARMED! Approving in 2 seconds...');
      setTimeout(() => {
        if (webcmdBridge.currentApprovalPromise) {
          webcmdBridge.currentApprovalPromise(true);
          webcmdBridge.currentApprovalPromise = null;
        }
      }, 2000);
    }
  };

  try {
    const result = await runPriceArbitrage({
      goal,
      url,
      sessionId,
      bridge: webcmdBridge,
      guard: hitlGuard,
      gemini: geminiClient,
      emit
    });

    console.log('\n========================================');
    console.log('=== 5-Step Arbitrage Execution Result ===');
    console.log('========================================');
    console.log('Success:', result.success);
    console.log('Winning Platform:', result.winningPlatform);
    console.log('Cheapest Price:', result.cheapestPrice);
    console.log('Savings Amount:', result.savingsAmount);
    console.log('\nAmazon Details:', {
      title: result.amazonDetails?.title?.slice(0, 60),
      price: result.amazonDetails?.price,
      rating: result.amazonDetails?.rating,
      featuresCount: result.amazonDetails?.features?.length
    });
    console.log('\nFlipkart Details:', {
      title: result.flipkartDetails?.title?.slice(0, 60),
      price: result.flipkartDetails?.price,
      rating: result.flipkartDetails?.rating,
      highlightsCount: result.flipkartDetails?.highlights?.length,
      offersCount: result.flipkartDetails?.bankOffers?.length
    });
    console.log('\n--- Unforced Markdown Summary Preview ---');
    console.log(result.summary?.slice(0, 500) + '...\n');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await webcmdBridge.closeSession(sessionId);
    console.log('Test complete.');
  }
}

main().catch(console.error);
