'use strict';

const express = require('express');

function rowToProfile(row) {
  return {
    full_name: row.full_name,
    phone: row.phone,
    address: row.address,
    github_url: row.github_url,
    linkedin_url: row.linkedin_url,
    portfolio_url: row.portfolio_url,
    education: JSON.parse(row.education_json),
    updated_at: row.updated_at,
  };
}

module.exports = function profileRouter(db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const row = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    res.json(rowToProfile(row));
  });

  router.put('/', (req, res) => {
    const { full_name, phone, address, github_url, linkedin_url, portfolio_url, education } = req.body;
    if (education !== undefined && !Array.isArray(education)) {
      return res.status(400).json({ error: 'education must be an array' });
    }

    db.prepare(
      `UPDATE profile SET
         full_name = ?, phone = ?, address = ?,
         github_url = ?, linkedin_url = ?, portfolio_url = ?,
         education_json = ?, updated_at = datetime('now')
       WHERE id = 1`
    ).run(
      full_name ?? '',
      phone ?? '',
      address ?? '',
      github_url ?? '',
      linkedin_url ?? '',
      portfolio_url ?? '',
      JSON.stringify(education ?? [])
    );

    const row = db.prepare('SELECT * FROM profile WHERE id = 1').get();
    res.json(rowToProfile(row));
  });

  return router;
};
