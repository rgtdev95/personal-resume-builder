'use strict';

function getDocId() {
  return new URLSearchParams(window.location.search).get('id');
}

async function load() {
  const id = getDocId();
  if (!id) {
    document.getElementById('doc-content').textContent = 'No document id given in the URL.';
    return;
  }
  const doc = await fetchJson(`/api/documents/${id}`);
  const data = JSON.parse(doc.structured_json);
  document.title = `${doc.doc_type === 'resume' ? 'Resume' : 'Cover Letter'} — ${data.company || ''}`.trim();
  document.getElementById('doc-content').innerHTML = doc.html_snapshot;
}

async function save() {
  const id = getDocId();
  const status = document.getElementById('doc-status');
  try {
    await fetchJson(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ html_snapshot: document.getElementById('doc-content').innerHTML }),
    });
    status.textContent = 'Saved.';
  } catch (err) {
    status.textContent = `Error: ${err.message}`;
  }
  setTimeout(() => (status.textContent = ''), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('doc-save').addEventListener('click', save);
  document.getElementById('doc-print').addEventListener('click', () => window.print());
  load();
});
