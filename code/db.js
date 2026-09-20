'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { STATUSES } = require('./funnel');

const STATUS_LIST_SQL = STATUSES.map((s) => `'${s}'`).join(', ');

const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  github_url TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  portfolio_url TEXT NOT NULL DEFAULT '',
  education_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO profile (id) VALUES (1);

CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_title TEXT NOT NULL,
  company TEXT NOT NULL,
  compensation TEXT NOT NULL DEFAULT '',
  job_url TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  job_description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN (${STATUS_LIST_SQL})),
  used_cover_letter INTEGER NOT NULL DEFAULT 0 CHECK (used_cover_letter IN (0, 1)),
  applied_date TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('resume', 'cover_letter')),
  structured_json TEXT NOT NULL,
  html_snapshot TEXT NOT NULL,
  source_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (application_id, doc_type)
);
`;

function openDb(filename) {
  const db = new DatabaseSync(filename);
  db.exec(SCHEMA_SQL);
  return db;
}

function openDefaultDb() {
  const dataDir = path.join(__dirname, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  return openDb(path.join(dataDir, 'resume-builder.db'));
}

module.exports = { openDb, openDefaultDb, SCHEMA_SQL };
