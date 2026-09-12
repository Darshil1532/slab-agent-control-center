/**
 * Validates system environment configuration on server boot.
 * Provides helpful diagnostic messages if any required settings are missing.
 */
export function validateEnvironment() {
  const issues = [];
  const warnings = [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('...')) {
    issues.push('GEMINI_API_KEY is missing or contains placeholder text. Set a valid Gemini API key in your .env file.');
  }

  const port = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    warnings.push(`PORT (${process.env.PORT}) is non-standard. Defaulting to 3000.`);
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const webcmdPort = parseInt(process.env.WEBCMD_PORT || '9777', 10);

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    config: {
      port: isNaN(port) ? 3000 : port,
      model,
      webcmdPort: isNaN(webcmdPort) ? 9777 : webcmdPort,
      hasApiKey: !!(apiKey && apiKey.trim() !== '')
    }
  };
}
