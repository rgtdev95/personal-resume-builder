'use strict';

const path = require('node:path');
const express = require('express');
const { openDefaultDb } = require('./db');

const db = openDefaultDb();

const app = express();
app.use(express.json({ limit: '2mb' })); // default 100kb is tight for pasted postings/old resumes

app.use('/api/profile', require('./routes/profile')(db));
app.use('/api/sources', require('./routes/sources')(db));
app.use('/api/applications', require('./routes/applications')(db));
app.use('/api/documents', require('./routes/documents')(db));

// The built React/shadcn app (the 5-tab shell) and the standalone
// document-viewer static page (public/document.html) live in separate
// directories with no overlapping filenames, so mount order doesn't matter.
app.use(express.static(path.join(__dirname, 'client/dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Express 5 forwards thrown/rejected errors from async handlers here automatically.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Resume builder running at http://127.0.0.1:${PORT}`);
});
