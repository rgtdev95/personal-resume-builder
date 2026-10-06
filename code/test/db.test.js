'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { SCHEMA_SQL, migrate } = require('../db');

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA_SQL);
  return db;
}

test('schema creates all tables and seeds the profile row', () => {
  const db = freshDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  for (const t of ['profile', 'sources', 'applications', 'generated_documents']) {
    assert.ok(tables.includes(t), `missing table ${t}`);
  }
  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  assert.ok(profile);
  assert.equal(profile.full_name, '');
  assert.equal(profile.email, '');
  assert.equal(profile.education_json, '[]');
});

test('migrate() adds the email column to a pre-existing profile table without touching its data', () => {
  const db = new DatabaseSync(':memory:');
  // Simulate a database created before the email column existed.
  db.exec(`
    CREATE TABLE profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      full_name TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO profile (id, full_name) VALUES (1, 'Jane Doe');
  `);

  migrate(db);

  const profile = db.prepare('SELECT * FROM profile WHERE id = 1').get();
  assert.equal(profile.full_name, 'Jane Doe');
  assert.equal(profile.email, '');

  // Calling migrate() again (e.g. on every server start) must not error.
  assert.doesNotThrow(() => migrate(db));
});

test('invalid status is rejected by the CHECK constraint', () => {
  const db = freshDb();
  assert.throws(() => {
    db.prepare(`INSERT INTO applications (job_title, company, status) VALUES ('Engineer', 'Acme', 'not_a_real_status')`).run();
  });
});

test('default status on a new application is "applied"', () => {
  const db = freshDb();
  const { lastInsertRowid } = db.prepare(`INSERT INTO applications (job_title, company) VALUES ('Engineer', 'Acme')`).run();
  const row = db.prepare('SELECT status FROM applications WHERE id = ?').get(lastInsertRowid);
  assert.equal(row.status, 'applied');
});

test('deleting an application cascades to its generated_documents', () => {
  const db = freshDb();
  const { lastInsertRowid: appId } = db.prepare(`INSERT INTO applications (job_title, company) VALUES ('Engineer', 'Acme')`).run();
  db.prepare(
    `INSERT INTO generated_documents (application_id, doc_type, structured_json, html_snapshot) VALUES (?, 'resume', '{}', '<html></html>')`
  ).run(appId);

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM generated_documents WHERE application_id = ?').get(appId).n, 1);

  db.prepare('DELETE FROM applications WHERE id = ?').run(appId);

  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM generated_documents WHERE application_id = ?').get(appId).n, 0);
});

test('a second document of the same type for the same application upserts, not duplicates', () => {
  const db = freshDb();
  const { lastInsertRowid: appId } = db.prepare(`INSERT INTO applications (job_title, company) VALUES ('Engineer', 'Acme')`).run();
  const upsert = (html) =>
    db
      .prepare(
        `INSERT INTO generated_documents (application_id, doc_type, structured_json, html_snapshot)
         VALUES (?, 'resume', '{}', ?)
         ON CONFLICT (application_id, doc_type) DO UPDATE SET html_snapshot = excluded.html_snapshot
         RETURNING id`
      )
      .get(appId, html);

  const first = upsert('<html>v1</html>');
  const second = upsert('<html>v2</html>');
  assert.equal(first.id, second.id);

  const rows = db.prepare('SELECT * FROM generated_documents WHERE application_id = ?').all(appId);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].html_snapshot, '<html>v2</html>');
});
