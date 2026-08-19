const Groq = require('groq-sdk');

const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const REQUEST_TIMEOUT_MS = 15000;

let client = null;
function getClient() {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: REQUEST_TIMEOUT_MS });
  }
  return client;
}

// Calls Groq with the given system instruction + prompt text. Never throws raw SDK
// errors outward — callers get either a reply string or a thrown Error whose message
// is one of a small set of known codes, safe to map to a generic user-facing message.
async function generateChatbotReply({ systemInstruction, promptText }) {
  const groq = getClient();
  if (!groq) {
    throw new Error('LLM_NOT_CONFIGURED');
  }

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: promptText },
      ],
    });
  } catch (error) {
    if (error?.name === 'APIConnectionTimeoutError' || error?.name === 'APIUserAbortError') {
      throw new Error('LLM_TIMEOUT');
    }
    console.error(`Groq request failed (status=${error?.status ?? 'unknown'}): ${error?.message || String(error)}`);
    if (error?.status === 429) {
      throw new Error('LLM_RATE_LIMITED');
    }
    if (error?.status === 401 || error?.status === 403) {
      throw new Error('LLM_AUTH_ERROR');
    }
    throw new Error('LLM_REQUEST_FAILED');
  }

  const text = completion?.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error('LLM_EMPTY_RESPONSE');
  }
  return text.trim();
}

module.exports = { generateChatbotReply };
