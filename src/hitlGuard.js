/**
 * Human-in-the-Loop (HITL) Guard
 * Enforces Hackathon Hard Rule #2:
 * "keep a human approval step for payments, messages, submissions, deletions, and other sensitive actions."
 */

export class HitlGuard {
  constructor() {
    this.sensitivePatterns = [
      {
        type: 'payment',
        risk: 'HIGH',
        regex: /(pay|checkout|place\s*order|buy\s*now|card|cvv|upi|billing|purchase|complete\s*purchase)/i,
        warning: 'The agent is about to trigger a financial transaction or checkout.'
      },
      {
        type: 'form_submission',
        risk: 'HIGH',
        regex: /(submit|apply\s*now|send\s*application|complete\s*registration|confirm\s*booking)/i,
        warning: 'The agent is about to submit a form or application with entered data.'
      },
      {
        type: 'communication',
        risk: 'MEDIUM',
        regex: /(send\s*message|send\s*email|post\s*comment|publish|tweet|direct\s*message)/i,
        warning: 'The agent is about to transmit a message or publish public content.'
      },
      {
        type: 'destructive',
        risk: 'HIGH',
        regex: /(delete|remove|cancel\s*subscription|clear\s*all|discard|destroy)/i,
        warning: 'The agent is about to perform an irreversible deletion or cancellation.'
      }
    ];
  }

  /**
   * Evaluates an intended action and determines whether it requires explicit human approval.
   * @param {Object} action - { type: 'click'|'type'|'submit', selector, text, payload, url }
   * @returns {Object} { requiresApproval: boolean, details: Object|null }
   */
  evaluateAction(action) {
    const textToEvaluate = [
      action.type || '',
      action.text || '',
      action.selector || '',
      action.description || '',
      JSON.stringify(action.payload || {})
    ].join(' ');

    for (const pattern of this.sensitivePatterns) {
      if (pattern.regex.test(textToEvaluate)) {
        return {
          requiresApproval: true,
          approvalRequest: {
            id: `hitl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            risk: pattern.risk,
            category: pattern.type,
            warning: pattern.warning,
            action: {
              type: action.type,
              target: action.selector || action.text || action.url || 'Web Element',
              description: action.description || `Execute ${action.type}`,
              payload: action.payload || null,
              url: action.url || ''
            },
            timestamp: new Date().toISOString()
          }
        };
      }
    }

    return {
      requiresApproval: false,
      approvalRequest: null
    };
  }
}

export const hitlGuard = new HitlGuard();
