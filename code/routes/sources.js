'use strict';

const express = require('express');

module.exports = function sourcesRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const rows = db.prepare('SELECT * FROM sources ORDER BY created_at DESC, id DESC').all();
    res.json(rows);
  });

  router.post('/', (req, res) => {
    const { title, content } = req.body;
    const { lastInsertRowid } = db
      .prepare('INSERT INTO sources (title, content) VALUES (?, ?)')
      .run(title ?? '', content ?? '');
    res.status(201).json(db.prepare('SELECT * FROM sources WHERE id = ?').get(lastInsertRowid));
  });

  router.put('/:id', (req, res) => {
    const { title, content } = req.body;
    const existing = db.prepare('SELECT id FROM sources WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'source not found' });

    db.prepare(
      `UPDATE sources SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(title ?? '', content ?? '', req.params.id);
    res.json(db.prepare('SELECT * FROM sources WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM sources WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'source not found' });
    res.status(204).end();
  });

  return router;
};
