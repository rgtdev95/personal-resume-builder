'use strict';

const express = require('express');
const { STATUSES, LABELS, buildFunnel } = require('../funnel');

const LIST_SQL = `
  SELECT a.*, r.id AS resume_id, c.id AS cover_letter_id
  FROM applications a
  LEFT JOIN generated_documents r ON r.application_id = a.id AND r.doc_type = 'resume'
  LEFT JOIN generated_documents c ON c.application_id = a.id AND c.doc_type = 'cover_letter'
  ORDER BY a.applied_date DESC, a.id DESC
`;

function fieldsFromBody(body) {
  return {
    job_title: body.job_title ?? '',
    company: body.company ?? '',
    compensation: body.compensation ?? '',
    job_url: body.job_url ?? '',
    location: body.location ?? '',
    job_description: body.job_description ?? '',
    used_cover_letter: body.used_cover_letter ? 1 : 0,
    applied_date: body.applied_date || new Date().toISOString().slice(0, 10),
  };
}

module.exports = function applicationsRouter(db) {
  const router = express.Router();

  // Literal sub-paths must be registered before the /:id param route below,
  // or Express matches e.g. "/funnel" as :id = "funnel".
  router.get('/check-duplicate', (req, res) => {
    const { company, job_title } = req.query;
    if (!company || !job_title) return res.json({ duplicate: false });

    const application = db
      .prepare(
        `SELECT * FROM applications
         WHERE LOWER(company) = LOWER(?) AND LOWER(job_title) = LOWER(?)
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(company, job_title);

    res.json(application ? { duplicate: true, application } : { duplicate: false });
  });

  router.get('/funnel', (req, res) => {
    const rows = db.prepare('SELECT status, used_cover_letter FROM applications').all();
    res.json(buildFunnel(rows));
  });

  router.get('/statuses', (req, res) => {
    res.json(STATUSES.map((value) => ({ value, label: LABELS[value] })));
  });

  router.get('/', (req, res) => {
    res.json(db.prepare(LIST_SQL).all());
  });

  router.post('/', (req, res) => {
    const f = fieldsFromBody(req.body);
    if (!f.job_title || !f.company) {
      return res.status(400).json({ error: 'job_title and company are required' });
    }

    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO applications
           (job_title, company, compensation, job_url, location, job_description, used_cover_letter, applied_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(f.job_title, f.company, f.compensation, f.job_url, f.location, f.job_description, f.used_cover_letter, f.applied_date);

    res.status(201).json(db.prepare('SELECT * FROM applications WHERE id = ?').get(lastInsertRowid));
  });

  router.get('/:id', (req, res) => {
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'application not found' });
    res.json(row);
  });

  router.put('/:id', (req, res) => {
    const existing = db.prepare('SELECT id FROM applications WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'application not found' });

    const f = fieldsFromBody(req.body);
    if (!f.job_title || !f.company) {
      return res.status(400).json({ error: 'job_title and company are required' });
    }
    const status = req.body.status ?? 'applied';
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `invalid status: ${status}` });
    }

    db.prepare(
      `UPDATE applications SET
         job_title = ?, company = ?, compensation = ?, job_url = ?, location = ?,
         job_description = ?, used_cover_letter = ?, applied_date = ?, status = ?,
         updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      f.job_title,
      f.company,
      f.compensation,
      f.job_url,
      f.location,
      f.job_description,
      f.used_cover_letter,
      f.applied_date,
      status,
      req.params.id
    );

    res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM applications WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'application not found' });
    res.status(204).end();
  });

  return router;
};
