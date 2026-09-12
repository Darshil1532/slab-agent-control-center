import { geminiClient } from '../../src/geminiClient.js';

async function testGeminiStep() {
  const goal = "Go to the student profile. And enter my details and the captcha. 25BCE10213 and Vishnu1234/ and there will be captcha";
  
  // Step 1: Landing page
  const step1 = await geminiClient.generateContent(`User Goal: "${goal}"
Current Page:
- URL: https://vtop.vitbhopal.ac.in/vtop/open/page
- Title: VIT Bhopal - VTOP
- Captcha Detected: false

Interactive Elements on Page:
[
  { "text": "VIT", "href": "javascript:void(0);" },
  { "text": "Student", "href": "javascript:void(0);" },
  { "text": "Employee", "href": "javascript:void(0);" },
  { "text": "Parent", "href": "javascript:void(0);" },
  { "text": "Alumni", "href": "javascript:void(0);" }
]

Inputs: []
History: []

Determine the immediate next action.
Return JSON with { thought, action, targetText, targetSelector, fillFields, requiresApproval, isComplete }`, 
`You are an Autonomous Browser Agent dispatcher. Output JSON only.`, true);

  console.log('Step 1 Decision:\n', JSON.stringify(step1, null, 2));

  // Step 2: Login page
  const step2 = await geminiClient.generateContent(`User Goal: "${goal}"
Current Page:
- URL: https://vtop.vitbhopal.ac.in/vtop/login
- Title: VIT Bhopal - VTOP
- Captcha Detected: true

Interactive Elements on Page:
[
  { "text": "Submit", "id": "submitBtn" },
  { "text": "Close" }
]

Inputs: [
  { "id": "username", "name": "username", "type": "text", "placeholder": "Username" },
  { "id": "password", "name": "password", "type": "password", "placeholder": "Password" },
  { "id": "gResponse", "name": "gResponse", "type": "hidden" }
]
History: ["Navigated to https://vtop.vitbhopal.ac.in/vtop/open/page", "Clicked Student button to access student login"]

Determine the immediate next action.
Return JSON with { thought, action, targetText, targetSelector, fillFields, requiresApproval, approvalWarning, submitSelector, isComplete }`,
`You are an Autonomous Browser Agent dispatcher. Output JSON only.`, true);

  console.log('Step 2 Decision:\n', JSON.stringify(step2, null, 2));
}

testGeminiStep().catch(console.error);
