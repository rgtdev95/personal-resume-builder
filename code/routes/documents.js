'use strict';

const express = require('express');
const { askForJson } = require('../claude-cli');

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

function buildResumePrompt(application, sourcesText) {
  return `You are tailoring a resume for one specific job application. Use ONLY information present in the candidate's raw work history below — never invent experience, employers, or dates.

JOB TITLE: ${application.job_title}
COMPANY: ${application.company}
JOB DESCRIPTION:
${application.job_description}

CANDIDATE'S RAW WORK HISTORY (source of truth):
${sourcesText}

Respond with ONLY a JSON object of this exact shape:
{
  "summary": "2-3 sentence professional summary tailored to this job",
  "skills": ["skill1", "skill2"],
  "experience": [
    {"title": "", "company": "", "dates": "", "bullets": ["", ""]}
  ]
}`;
}

function buildCoverLetterPrompt(application, sourcesText) {
  return `You are writing a cover letter for one specific job application. Use ONLY information present in the candidate's raw work history below — never invent experience, employers, or dates.

JOB TITLE: ${application.job_title}
COMPANY: ${application.company}
JOB DESCRIPTION:
${application.job_description}

CANDIDATE'S RAW WORK HISTORY (source of truth):
${sourcesText}

Respond with ONLY a JSON object of this exact shape:
{
  "salutation": "e.g. Dear Hiring Manager,",
  "body_paragraphs": ["paragraph 1", "paragraph 2", "paragraph 3"],
  "closing": "e.g. Sincerely,"
}`;
}

function contactLine(doc) {
  const links = [doc.github_url, doc.linkedin_url, doc.portfolio_url].filter(Boolean);
  return [doc.phone, doc.address, ...links].filter(Boolean).map(escapeHtml).join(' &middot; ');
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
    <p>${escapeHtml(doc.summary)}</p>
  </section>
  <section>
    <h2>Skills</h2>
    <p>${(doc.skills || []).map(escapeHtml).join(', ')}</p>
  </section>
  <section>
    <h2>Experience</h2>
    ${(doc.experience || [])
      .map(
        (e) => `
    <div class="experience-entry">
      <h3>${escapeHtml(e.title)} &mdash; ${escapeHtml(e.company)}</h3>
      <p class="dates">${escapeHtml(e.dates)}</p>
      <ul>${(e.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>`
      )
      .join('')}
  </section>
  <section>
    <h2>Education</h2>
    ${(doc.education || [])
      .map(
        (ed) => `
    <div class="education-entry">
      <strong>${escapeHtml(ed.degree)}</strong> &mdash; ${escapeHtml(ed.school)} ${ed.year ? `(${escapeHtml(ed.year)})` : ''}
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
  <p>${escapeHtml(doc.salutation)}</p>
  ${(doc.body_paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('')}
  <p>${escapeHtml(doc.closing)}</p>
  <p>${escapeHtml(doc.full_name)}</p>
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

  const prompt =
    docType === 'resume' ? buildResumePrompt(application, sourcesText) : buildCoverLetterPrompt(application, sourcesText);
  const aiContent = await askForJson(prompt);

  const merged = {
    full_name: profile.full_name,
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
