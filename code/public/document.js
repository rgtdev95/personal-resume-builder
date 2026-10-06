'use strict';

function getDocId() {
  return new URLSearchParams(window.location.search).get('id');
}

// Match score/keywords are meta-info for the candidate, not something you'd
// print onto a resume sent to an employer — shown here (no-print) only.
function renderMatchBanner(doc, data) {
  const banner = document.getElementById('match-banner');
  if (doc.doc_type !== 'resume' || typeof data.match_score !== 'number') {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  banner.dataset.tier = data.match_score >= 70 ? 'high' : data.match_score >= 40 ? 'mid' : 'low';
  document.getElementById('match-score-value').textContent = data.match_score;

  const renderTags = (containerId, items) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (!items || items.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'match-tag-empty';
      empty.textContent = 'None';
      container.appendChild(empty);
      return;
    }
    for (const item of items) {
      const tag = document.createElement('span');
      tag.className = 'match-tag';
      tag.textContent = item;
      container.appendChild(tag);
    }
  };
  renderTags('matched-keywords', data.matched_keywords);
  renderTags('missing-keywords', data.missing_keywords);
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
  renderMatchBanner(doc, data);
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
