'use strict';

const express = require('express');
const { askForJson } = require('../ai-client');

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function buildExtractPrompt(jobDescriptionText) {
  return `Extract these fields from the job posting text below. Respond with ONLY a JSON object of this exact shape:
{"company": "", "job_title": "", "compensation": "", "location": ""}

Use an empty string for any field not present in the text.

JOB POSTING TEXT:
${jobDescriptionText}`;
}

// Separate from buildExtractPrompt (which only fills Tracker fields) so the
// keyword list is pulled server-side on every resume generation — including
// a regenerate from the Tracker tab, where the client never calls /extract.
function buildKeywordsPrompt(jobDescriptionText) {
  return `Analyze the job posting below and extract what an ATS and a recruiter screen for. Respond with ONLY a JSON object of this exact shape:
{"must_have_keywords": [], "requirements": [], "nice_to_haves": []}

- must_have_keywords: the exact skills, tools, technologies, and hard qualifications the posting treats as required. Use the posting's own wording, and include acronyms where the posting does. Each one must be a concrete, checkable term of 1-4 words (a product, platform, language, protocol, certification, or named methodology) — never a generic phrase like "ticketing system", "related hardware and software", or "best practices". List each thing once: don't add spelling variants of the same item separately (e.g. "WIN10" and "Windows 10" -> just "Windows 10"). Generic skills and soft requirements go in requirements instead.
- requirements: short phrases for required experience/responsibilities (e.g. "5+ years backend", "team leadership").
- nice_to_haves: preferred-but-optional items.
Use empty arrays when nothing applies.

JOB POSTING TEXT:
${jobDescriptionText}`;
}

function listOf(value) {
  return Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];
}

function targetingBlock(targets) {
  const parts = [];
  if (targets.must_have_keywords.length)
    parts.push(`Must-have keywords — use this exact wording, but ONLY where the work history genuinely supports it:\n${targets.must_have_keywords.join(', ')}`);
  if (targets.requirements.length)
    parts.push(`Key requirements to address where the work history supports them:\n- ${targets.requirements.join('\n- ')}`);
  if (targets.nice_to_haves.length)
    parts.push(`Nice-to-haves (include only if genuinely applicable):\n- ${targets.nice_to_haves.join('\n- ')}`);
  return parts.length ? `\nATS TARGETING CHECKLIST:\n${parts.join('\n\n')}\n` : '';
}

// Deterministic match score: what fraction of the posting's must-have
// keywords literally appear in the finished resume. Computed in code, not by
// the model that wrote the resume, so it can't grade itself generously.
// Bounded by non-alphanumerics so "CI" doesn't match inside "specific" while
// "CI/CD" and "C++" still match. A plural ending is allowed ("HP
// Workstation" matches "HP workstations").
function keywordCoverage(text, keywords) {
  if (!keywords.length) return { match_score: null, matched_keywords: [], missing_keywords: [] };
  const haystack = text.toLowerCase();
  const matched_keywords = [];
  const missing_keywords = [];
  for (const kw of keywords) {
    const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    (new RegExp(`(?<![a-z0-9])${escaped}(?:e?s)?(?![a-z0-9])`).test(haystack) ? matched_keywords : missing_keywords).push(kw);
  }
  return { match_score: Math.round((matched_keywords.length / keywords.length) * 100), matched_keywords, missing_keywords };
}

function resumeText(doc) {
  return [
    doc.summary,
    ...(doc.skills || []).flatMap((g) => [g.category, ...(g.items || [])]),
    ...(doc.experience || []).flatMap((e) => [e.title, e.company, ...(e.bullets || [])]),
    ...(doc.education || []).flatMap((ed) => [ed.degree, ed.school]),
  ].join('\n');
}

function buildResumePrompt(application, sourcesText, targets) {
  return `You are tailoring a resume for one specific job application. Use ONLY information present in the candidate's raw work history below — never invent experience, employers, dates, numbers, or skills the source material doesn't support.

The "experience" array must include EVERY employer/role that appears in the
work history below as its own entry — do not omit any position, including
freelance/independent-contractor/self-employed work and the candidate's
current role, even if a position seems less directly relevant to this job.
Tailoring means adjusting which bullets you pick and how you word them
(and how you order the entries — most relevant or most recent first), NOT
deciding which employers to leave out entirely. If the candidate held
multiple titles at the same employer (a promotion history), include each
title as its own entry, in the order given.

Bullet-writing rules (standard resume conventions):
- Start each bullet with a strong past/present-tense action verb (e.g.
  "Led", "Built", "Reduced", "Architected") — never "Responsible for" or
  "Duties included".
- Write substantive, descriptive bullets (roughly 20-35 words), not short
  generic one-liners — cover what you did, the specific tools/technologies/
  systems involved, the scale or environment, and the outcome, all in one
  sentence. "Managed servers" is too short; "Administered a 200+ endpoint
  Windows Server/Active Directory environment, including Group Policy,
  DNS/DHCP, and patch management, cutting unplanned downtime by
  standardizing change procedures" is the target level of detail — only
  ever using specifics the source material actually supports.
- Be thorough, not condensed: rephrase and elaborate on the source
  material rather than summarizing it down. If the source text for a role
  describes multiple distinct responsibilities, systems, projects, or
  achievements, give each one its own bullet instead of merging several
  into one vague sentence — every distinct piece of substance in the
  source material for that role should show up as its own bullet. Don't
  lose detail in translation; the goal is a more polished, keyword-rich
  rephrasing of everything the candidate described, not a shorter version
  of it.
- Lead with the outcome/impact when the source material supports it
  (numbers, scale, before/after) — only if that number is actually present
  or directly inferable from the source text, never invented.
- No fixed bullet count or cap — write as many bullets as it takes to
  fully cover everything of substance in the source material for that
  role. A role with a long, detailed source entry (especially the
  candidate's current role) should produce a correspondingly long,
  detailed set of bullets; a role with only a sentence or two of source
  material should produce only a sentence or two worth of bullets. Let the
  depth of the source material set the length — never compress it down to
  hit some target number, and never pad a thin role out to match a longer
  one.
- No first-person pronouns ("I", "my").
- Don't start consecutive bullets with the same verb; vary sentence
  structure.

Avoid generic, AI-sounding language — recruiters and AI screeners skim past
filler:
- Never use these clichés or any close variant: "results-driven",
  "results-oriented", "proven track record", "team player",
  "detail-oriented", "go-getter", "think outside the box", "synergy",
  "dynamic professional", "passionate about leveraging", "responsible for".
- Replace adjectives with evidence: instead of "experienced leader", say
  what was led and the outcome. Every bullet must name a concrete
  technology, action, scope, or result — not a personality trait.

Keyword coverage — this resume will likely be screened by both a human and
an ATS keyword scan, so:
- Read the job description closely and identify the specific skills, tools,
  technologies, certifications, and terms it uses (the ATS targeting
  checklist below, if present, already lists the key ones).
- If the work history doesn't support a checklist keyword, simply leave it
  out — a missing keyword is better than an invented claim.
- Wherever the candidate's real experience genuinely demonstrates one of
  those things, use the job description's own terminology for it (e.g. if
  the posting says "Entra ID" and the source material says "Azure AD" for
  the same underlying work, write "Entra ID" — same real capability, the
  JD's term). Never claim a skill, tool, or requirement the source material
  doesn't actually support just because the job description mentions it.
- Make "skills" comprehensive, not just a highlight reel — include every
  genuinely-relevant tool/technology/methodology the source material
  supports, not only the 8-10 flashiest ones, so keyword-matching software
  has real signal to work with. Group them into categories that fit this
  candidate's field (e.g. "Systems & Infrastructure", "Networking",
  "Security", "Tools & Platforms", "Programming/Scripting" — pick
  categories that actually fit what's in the source material, don't force
  irrelevant ones), each with its own list of items.
- Bullets should be descriptive enough to carry real keyword content (what
  system/tool/process, in what context) rather than vague ("Improved
  systems" -> name the system and what about it).

JOB TITLE: ${application.job_title}
COMPANY: ${application.company}
JOB DESCRIPTION:
${application.job_description}
${targetingBlock(targets)}
CANDIDATE'S RAW WORK HISTORY (source of truth):
${sourcesText}

Respond with ONLY a JSON object of this exact shape:
{
  "summary": "2-3 sentence professional summary tailored to this job",
  "skills": [
    {"category": "Category Name", "items": ["skill1", "skill2"]}
  ],
  "experience": [
    {"title": "", "company": "", "location": "", "dates": "", "bullets": ["", ""]}
  ]
}
"location" is the city/region for that role if the source material gives
one (use "" if it's not stated, e.g. for fully remote work with no location
given).`;
}

function buildCoverLetterPrompt(application, sourcesText, resume) {
  const resumeBlock = resume
    ? `
TAILORED RESUME (already written for this role — keep the letter coherent
with it: reinforce the same top strengths, never contradict its titles,
dates, or facts, and complement it with context and the "why" rather than
restating its bullets):
${JSON.stringify({ summary: resume.summary, experience: resume.experience, skills: resume.skills })}
`
    : '';
  return `You are writing a cover letter for one specific job application. Use ONLY information present in the candidate's raw work history below — never invent experience, employers, dates, or achievements. Likewise never invent facts about the company (mission, values, products, funding, "recent news") that aren't in the job posting — write around what you actually know.

Strategy:
1. Opening hook: open with substance — a relevant achievement, a genuine
   point of connection to the company's work, or a sharp statement of the
   value the candidate brings. Name the specific role.
2. Value proposition: frame what the candidate brings around the
   EMPLOYER'S needs, connecting their strongest relevant experience directly
   to the job's key requirements.
3. One brief, specific example from the work history that shows impact
   relevant to this role, quantified only where the source supports it.
4. Company alignment only if the posting gives real signal about the
   company's mission, product, or challenges — otherwise skip it rather
   than writing empty flattery.
5. Confident close with a clear call to action.
6. 3-4 body paragraphs, ~250-350 words total, fits on one page.

Avoid generic, AI-sounding language:
- Never open with "I am writing to apply for / express my interest in".
- Never use these clichés or close variants: "results-driven", "proven
  track record", "team player", "detail-oriented", "hard-working",
  "go-getter", "think outside the box", "passionate about leveraging",
  "I believe I would be a great fit", "perfect candidate", "wear many
  hats", "fast-paced environment".
- Show, don't tell: replace adjectives ("highly motivated") with evidence.
- Don't start every sentence with "I"; no hedging ("I think", "I feel",
  "I would love the chance").
- Never use em dashes or en dashes — a well-known tell of AI writing. Use
  commas, periods, colons, or parentheses. Hyphens in compound words are fine.
- Match tone to the company (startup vs. enterprise, technical vs.
  business-facing) based on the posting.
- Salutation: a named hiring manager only if the posting names one,
  otherwise "Dear ${application.company} Hiring Team," (or "Dear Hiring
  Team," if the company is unknown). Never "To Whom It May Concern" or
  "Dear Sir/Madam", and never bracketed placeholders like [Name].

JOB TITLE: ${application.job_title}
COMPANY: ${application.company}
JOB DESCRIPTION:
${application.job_description}

CANDIDATE'S RAW WORK HISTORY (source of truth):
${sourcesText}
${resumeBlock}
Respond with ONLY a JSON object of this exact shape:
{
  "salutation": "e.g. Dear Hiring Manager,",
  "body_paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "closing": "e.g. Sincerely,"
}`;
}

// A link with no scheme (e.g. "github.com/x", saved from the Profile form
// without "https://") would otherwise resolve as *relative to this page*
// once printed into an href — silently turning it into a broken link both
// on screen and in the exported PDF. Force a scheme so it's always an
// absolute, clickable URL.
function normalizeUrl(url) {
  const trimmed = url.trim();
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// mailto/tel + external links, single line, ATS-safe (plain text nodes —
// styling doesn't affect what a parser extracts). External links show the
// actual URL as their visible text (not a "GitHub"/"LinkedIn" label) so the
// address is still readable/typeable from a printed page or a PDF where the
// hyperlink itself doesn't carry over. target=_blank so clicking one from
// the on-screen editor doesn't navigate away from the document you're
// mid-edit on; irrelevant to (and harmless for) the PDF.
function contactLine(doc) {
  const items = [];
  if (doc.email) items.push(`<a href="mailto:${escapeHtml(doc.email)}">${escapeHtml(doc.email)}</a>`);
  if (doc.phone) items.push(`<a href="tel:${escapeHtml(doc.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(doc.phone)}</a>`);
  if (doc.address) items.push(escapeHtml(doc.address));
  const externalLink = (url) => {
    const normalized = normalizeUrl(url);
    const display = normalized.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    return `<a href="${escapeHtml(normalized)}" target="_blank" rel="noopener noreferrer">${escapeHtml(display)}</a>`;
  };
  if (doc.github_url) items.push(externalLink(doc.github_url));
  if (doc.linkedin_url) items.push(externalLink(doc.linkedin_url));
  if (doc.portfolio_url) items.push(externalLink(doc.portfolio_url));
  return items.join(' <span class="sep">&middot;</span> ');
}

// Title + dates on one row, org + location on the next — the standard
// resume convention (also used for education: degree+year, school).
function entryRows({ title, org, meta, subMeta }) {
  return `
    <div class="entry-row">
      <span class="entry-title">${escapeHtml(title)}</span>
      ${meta ? `<span class="entry-meta">${escapeHtml(meta)}</span>` : ''}
    </div>
    ${
      org
        ? `<div class="entry-row entry-subrow">
      <span class="entry-org">${escapeHtml(org)}</span>
      ${subMeta ? `<span class="entry-meta">${escapeHtml(subMeta)}</span>` : ''}
    </div>`
        : ''
    }`;
}

function renderResumeHtml(doc) {
  return `
<div class="resume">
  <header class="doc-header">
    <h1>${escapeHtml(doc.full_name)}</h1>
    <p class="contact-line">${contactLine(doc)}</p>
  </header>
  <section>
    <h2>Summary</h2>
    <p class="summary">${escapeHtml(doc.summary)}</p>
  </section>
  <section>
    <h2>Experience</h2>
    ${(doc.experience || [])
      .map(
        (e) => `
    <div class="entry">
      ${entryRows({ title: e.title, meta: e.dates, org: e.company, subMeta: e.location })}
      <ul>${(e.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>`
      )
      .join('')}
  </section>
  <section>
    <h2>Skills</h2>
    ${(doc.skills || [])
      .map(
        (group) => `
    <div class="skill-group">
      <span class="skill-category">${escapeHtml(group.category)}:</span>
      <span class="skills-list">${(group.items || []).map((s) => escapeHtml(s)).join(', ')}</span>
    </div>`
      )
      .join('')}
  </section>
  <section>
    <h2>Education</h2>
    ${(doc.education || [])
      .map(
        (ed) => `
    <div class="entry">
      ${entryRows({ title: ed.degree, meta: ed.year, org: ed.school })}
    </div>`
      )
      .join('')}
  </section>
</div>`.trim();
}

function renderCoverLetterHtml(doc) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `
<div class="cover-letter">
  <header class="doc-header">
    <h1>${escapeHtml(doc.full_name)}</h1>
    <p class="contact-line">${contactLine(doc)}</p>
  </header>
  <p class="date-line">${today}</p>
  <div class="letter-body">
    <p>${escapeHtml(doc.salutation)}</p>
    ${(doc.body_paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
    <p class="closing">${escapeHtml(doc.closing)}<br>${escapeHtml(doc.full_name)}</p>
  </div>
</div>`.trim();
}

async function generateDocument(db, body, docType) {
  const { application_id, source_ids } = body;
  const application = db.prepare('SELECT * FROM applications WHERE id = ?').get(application_id);
  if (!application) {
    const err = new Error('application not found');
    err.status = 404;
    throw err;
  }

  const allSources = db.prepare('SELECT * FROM sources').all();
  const selected =
    Array.isArray(source_ids) && source_ids.length > 0
      ? allSources.filter((s) => source_ids.includes(s.id))
      : allSources;
  const sourcesText = selected.map((s) => `### ${s.title}\n${s.content}`).join('\n\n') || '(none provided)';

  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();

  let aiContent;
  let targets;
  if (docType === 'resume') {
    const raw = await askForJson(buildKeywordsPrompt(application.job_description));
    targets = {
      must_have_keywords: listOf(raw.must_have_keywords),
      requirements: listOf(raw.requirements),
      nice_to_haves: listOf(raw.nice_to_haves),
    };
    aiContent = await askForJson(buildResumePrompt(application, sourcesText, targets));
  } else {
    const resumeRow = db
      .prepare(`SELECT structured_json FROM generated_documents WHERE application_id = ? AND doc_type = 'resume'`)
      .get(application_id);
    aiContent = await askForJson(
      buildCoverLetterPrompt(application, sourcesText, resumeRow && JSON.parse(resumeRow.structured_json))
    );
  }

  const merged = {
    full_name: profile.full_name,
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    github_url: profile.github_url,
    linkedin_url: profile.linkedin_url,
    portfolio_url: profile.portfolio_url,
    education: JSON.parse(profile.education_json),
    company: application.company,
    job_title: application.job_title,
    ...aiContent,
  };
  if (docType === 'resume') Object.assign(merged, keywordCoverage(resumeText(merged), targets.must_have_keywords));

  const html = docType === 'resume' ? renderResumeHtml(merged) : renderCoverLetterHtml(merged);

  return db
    .prepare(
      `INSERT INTO generated_documents (application_id, doc_type, structured_json, html_snapshot, source_ids_json)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (application_id, doc_type) DO UPDATE SET
         structured_json = excluded.structured_json,
         html_snapshot = excluded.html_snapshot,
         source_ids_json = excluded.source_ids_json,
         updated_at = datetime('now')
       RETURNING *`
    )
    .get(application_id, docType, JSON.stringify(merged), html, JSON.stringify(selected.map((s) => s.id)));
}

module.exports = function documentsRouter(db) {
  const router = express.Router();

  router.post('/extract', async (req, res, next) => {
    try {
      const { job_description_text } = req.body;
      if (!job_description_text) {
        return res.status(400).json({ error: 'job_description_text is required' });
      }
      const data = await askForJson(buildExtractPrompt(job_description_text));
      res.json(data);
    } catch (err) {
      if (err.rawText) return res.status(502).json({ error: err.message, rawText: err.rawText });
      next(err);
    }
  });

  router.post('/generate-resume', async (req, res, next) => {
    try {
      res.json(await generateDocument(db, req.body, 'resume'));
    } catch (err) {
      if (err.rawText) return res.status(502).json({ error: err.message, rawText: err.rawText });
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

  router.post('/generate-cover-letter', async (req, res, next) => {
    try {
      res.json(await generateDocument(db, req.body, 'cover_letter'));
    } catch (err) {
      if (err.rawText) return res.status(502).json({ error: err.message, rawText: err.rawText });
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM generated_documents WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'document not found' });
    res.json(row);
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT id FROM generated_documents WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'document not found' });

    db.prepare(`UPDATE generated_documents SET html_snapshot = ?, updated_at = datetime('now') WHERE id = ?`).run(
      req.body.html_snapshot ?? '',
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM generated_documents WHERE id = ?').get(req.params.id));
  });

  return router;
};

module.exports.keywordCoverage = keywordCoverage;
