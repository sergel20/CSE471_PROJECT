// Backend-side pre-filter for the chatbot. This is defense-in-depth, not the primary
// safety mechanism (that's the system instruction + real authorization checks in
// chatbotController.js) — it catches obvious confidential/injection attempts cheaply,
// before spending an LLM call on them.

const CONFIDENTIAL_REFUSAL = "I'm sorry, but I can't provide confidential, private, or restricted information.";

// Patterns for requests that are almost never legitimate patient-support questions:
// asking for secrets/credentials, other users' data, or internal system info.
const CONFIDENTIAL_PATTERNS = [
  /\bapi[\s_-]?key\b/i,
  /\bsecret\b/i,
  /\bpassword\b/i,
  /\bcredential/i,
  /\bauth(entication)?[\s_-]?token\b/i,
  /\bjwt\b/i,
  /\benv(ironment)?\s*(variable)?s?\b.*\b(value|secret|key)\b/i,
  /\bdatabase\s*(password|credential|connection\s*string|uri)\b/i,
  /\bmongo(db)?\s*(uri|connection)\b/i,
  /\bsystem\s*prompt\b/i,
  /\bhidden\s*instructions?\b/i,
  /\bdeveloper\s*instructions?\b/i,
  /\binternal\s*(api|system|database|structure)\b/i,
  /\badmin(istrator)?\s*(password|credential|access)\b/i,
  /\bstaff[\s-]?only\b/i,
  /\bsource\s*code\b/i,
  /another\s+(patient|user|person)'?s?\s+(\w+\s+)?(report|record|data|info|phone|address|email|result)/i,
  /\bother\s+patients?'?\s+(\w+\s+)?(report|record|data|info)/i,
];

// Common prompt-injection phrasing. These don't need to succeed to be worth blocking
// early — a patient typing them is not asking a real support question.
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(the\s+)?(previous|prior|above|earlier)\s+instructions?/i,
  /disregard\s+(all\s+)?(the\s+)?(previous|prior|above)\s+instructions?/i,
  /disable\s+(your\s+)?(safety|privacy)\s*(rules?|filters?|controls?)?/i,
  /act\s+as\s+(an?\s+)?unrestricted\s+ai/i,
  /you\s+are\s+now\s+(in\s+)?(dan|developer\s+mode|jailbreak)/i,
  /reveal\s+(your\s+)?(system\s*prompt|hidden\s*instructions?)/i,
  /show\s+me\s+(your\s+)?(system\s*prompt|hidden\s*instructions?)/i,
  /pretend\s+(you\s+are|to\s+be)\s+a\s+(doctor|real\s+doctor)/i,
];

function isConfidentialRequest(message) {
  return CONFIDENTIAL_PATTERNS.some((pattern) => pattern.test(message));
}

function isPromptInjectionAttempt(message) {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

// Cheap keyword heuristic to decide whether it's worth attaching the patient's own
// (minimal, verified) report-status data to the LLM request. False negatives just
// mean the assistant answers generically instead of citing the status — safe default.
const REPORT_STATUS_KEYWORDS = /\b(report|result|sample|test)s?\b.*\b(status|ready|done|available|when|progress)\b|\b(status|ready|done|available)\b.*\b(report|result|sample|test)s?\b/i;

function looksLikeReportStatusQuestion(message) {
  return REPORT_STATUS_KEYWORDS.test(message);
}

module.exports = {
  CONFIDENTIAL_REFUSAL,
  isConfidentialRequest,
  isPromptInjectionAttempt,
  looksLikeReportStatusQuestion,
};
