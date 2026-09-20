'use strict';

const { execFile } = require('node:child_process');

const TIMEOUT_MS = 120_000;
const MAX_BUFFER = 10 * 1024 * 1024;
const STRICT_SUFFIX =
  '\n\nIMPORTANT: Respond with ONLY the raw JSON object. No markdown fences, ' +
  'no commentary before or after. The entire response must be parseable by JSON.parse().';

// execFile (never exec/a shell string): prompts embed arbitrary pasted job
// descriptions that must never be shell-interpreted.
function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    execFile(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--allowedTools', ''],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`claude CLI failed: ${err.message}\n${stderr}`));
        try {
          resolve(JSON.parse(stdout).result);
        } catch {
          reject(new Error(`claude CLI returned a non-JSON envelope: ${stdout.slice(0, 500)}`));
        }
      }
    );
  });
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

// One retry with a stricter instruction if the model didn't return clean JSON;
// no backoff/queue beyond that.
async function askForJson(prompt) {
  const first = extractJson(await runClaude(prompt));
  if (first !== undefined) return first;

  const second = await runClaude(prompt + STRICT_SUFFIX);
  const parsed = extractJson(second);
  if (parsed !== undefined) return parsed;

  const err = new Error('AI did not return valid JSON after one retry');
  err.rawText = second;
  throw err;
}

module.exports = { askForJson };
