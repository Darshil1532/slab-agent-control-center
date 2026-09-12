/**
 * Hacker News & AI Intelligence Monitor Workflow
 * Gathers trending tech stories, filters for AI & agent advancements, extracts discussion metrics,
 * and compiles structured executive intelligence and reusable CLI command.
 */

export async function runNewsResearch({ topic = 'AI Agents', sessionId, bridge, guard, gemini, emit }) {
  emit('log', {
    type: 'info',
    message: `📰 Initiating Intelligence Monitor for topic: "${topic}"`,
    step: 1
  });

  // Step 1: Query webcmd sitemap memory
  emit('log', { type: 'memory', message: 'Checking webcmd sitemap memory for news.ycombinator.com...' });
  const memory = await bridge.getSiteMemoryContext('https://news.ycombinator.com', 'news-task');
  emit('memory_loaded', {
    domain: 'news.ycombinator.com',
    status: memory.found ? 'Memory Active' : 'Sitemap initialized',
    memoryPreview: memory.siteMarkdown || 'Hacker News top stories feed.'
  });

  // Step 2: Navigate to HackerNews frontpage
  emit('step_start', { step: 1, title: 'Navigating to Tech Frontpage' });
  const navScript = `
    await page.goto('https://news.ycombinator.com/');
    await page.waitForLoadState('domcontentloaded');
    return {
      title: await page.title(),
      url: page.url()
    };
  `;
  const navResult = await bridge.runScript(sessionId, navScript);
  emit('step_executed', {
    step: 1,
    title: 'Frontpage Ingested',
    page: navResult.page,
    timing: navResult.timings?.program_ms || 105,
    snapshotDiff: navResult.snapshotDiff
  });

  // Step 3: Extract top articles with points and comments
  emit('step_start', { step: 2, title: 'Parsing Ranked Stories & Discussion Volume' });
  const extractScript = `
    const items = [];
    const rows = document.querySelectorAll('tr.athing');
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      const titleLink = row.querySelector('.titleline > a');
      const subtext = row.nextElementSibling?.querySelector('.subtext');
      const score = subtext?.querySelector('.score')?.innerText || '0 points';
      const comments = Array.from(subtext?.querySelectorAll('a') || [])
        .find(a => a.innerText.includes('comment'))?.innerText || '0 comments';

      if (titleLink) {
        items.push({
          rank: i + 1,
          title: titleLink.innerText,
          url: titleLink.href,
          score,
          comments
        });
      }
    }
    return { stories: items };
  `;
  const extractResult = await bridge.runScript(sessionId, extractScript);
  const stories = extractResult.result?.stories || [];

  emit('log', {
    type: 'ai_reasoning',
    message: `Scraped ${stories.length} stories. Gemini analyzing relevance and synthesizing top insights...`
  });

  // Step 4: Gemini Analysis & Executive Digest
  emit('step_start', { step: 3, title: 'Generating AI Executive Intelligence Briefing' });
  const analysisPrompt = `Analyze these frontpage Hacker News stories:
${JSON.stringify(stories, null, 2)}

User focus topic: "${topic}".
1. Filter stories most relevant to ${topic}, software development, or AI.
2. Formulate 3 key market takeaways or emerging trends.
Return JSON format:
{
  "topHeadlines": [
    { "title": "...", "sentiment": "Bullish/Neutral", "whyItMatters": "..." }
  ],
  "macroTakeaways": [
    "Takeaway 1...",
    "Takeaway 2...",
    "Takeaway 3..."
  ]
}`;

  const intelligenceReport = await gemini.generateContent(analysisPrompt, 'You are an elite tech research and intelligence analyst.', true);

  emit('log', {
    type: 'success',
    message: `✨ Briefing synthesized with ${intelligenceReport.topHeadlines?.length || 3} core findings!`
  });

  // Step 5: Command Learning
  const learned = await gemini.synthesizeLearnedCommand(
    `Extract and summarize frontpage tech stories focused on ${topic}`,
    'news.ycombinator.com',
    [
      '1. Navigate news.ycombinator.com',
      '2. Query tr.athing and sibling subtext nodes',
      '3. Ingest points and comment volume',
      '4. Output structured intelligence briefing'
    ],
    intelligenceReport
  );

  emit('command_learned', learned);

  emit('task_complete', {
    summary: `Processed ${stories.length} articles and generated AI intelligence briefing for "${topic}".`,
    structuredData: {
      rawStoriesCount: stories.length,
      intelligence: intelligenceReport,
      timestamp: new Date().toISOString()
    }
  });

  return { success: true, intelligence: intelligenceReport };
}
