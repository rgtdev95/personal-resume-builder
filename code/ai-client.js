'use strict';

const TIMEOUT_MS = 120_000;
const DEFAULT_MODEL = 'gpt-6-luna';
const STRICT_SUFFIX =
  '\n\nIMPORTANT: Respond with ONLY the raw JSON object. No markdown fences, ' +
  'no commentary before or after. The entire response must be parseable by JSON.parse().';

async function callOpenAi(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Copy code/.env.example to code/.env and add your OpenAI API key.'
    );
  }
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(`OpenAI API request failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`OpenAI API returned ${res.status}: ${body.slice(0, 500)}`);
  }

  let data;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(`OpenAI API returned a non-JSON envelope: ${body.slice(0, 500)}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error(`OpenAI API response had no message content: ${body.slice(0, 500)}`);
  }
  return content;
}

function extractJson(text) {
  const t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    /* fall through */
  }
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* fall through */
    }
  }
  const braces = t.match(/\{[\s\S]*\}/);
  if (braces) {
    try {
      return JSON.parse(braces[0]);
    } catch {
      /* fall through */
    }
  }
  return undefined;
}

// One retry with a stricter instruction if the model didn't return clean JSON
// (response_format: json_object should already guarantee this, but the
// extra parse safety net + retry costs nothing); no backoff/queue beyond that.
async function askForJson(prompt) {
  const first = extractJson(await callOpenAi(prompt));
  if (first !== undefined) return first;

  const second = await callOpenAi(prompt + STRICT_SUFFIX);
  const parsed = extractJson(second);
  if (parsed !== undefined) return parsed;

  const err = new Error('AI did not return valid JSON after one retry');
  err.rawText = second;
  throw err;
}

module.exports = { askForJson };
