'use strict';

const Sources = (() => {
  async function load() {
    const sources = await fetchJson('/api/sources');
    const list = document.getElementById('sources-list');
    list.innerHTML = '';
    if (sources.length === 0) {
      list.innerHTML = '<p class="empty">No source entries yet.</p>';
      return;
    }
    sources.forEach((s) => list.appendChild(renderSource(s)));
  }

  function renderSource(s) {
    const el = document.createElement('div');
    el.className = 'source-card';
    el.innerHTML = `
      <div class="source-header">
        <input class="source-title" value="${escapeHtml(s.title)}" placeholder="Title">
        <button type="button" data-action="delete">Delete</button>
      </div>
      <textarea rows="6">${escapeHtml(s.content)}</textarea>
      <div class="actions">
        <button type="button" data-action="save">Save</button>
        <span class="save-status status"></span>
      </div>
    `;
    el.querySelector('[data-action="save"]').addEventListener('click', async () => {
      const title = el.querySelector('.source-title').value;
      const content = el.querySelector('textarea').value;
      const status = el.querySelector('.save-status');
      try {
        await fetchJson(`/api/sources/${s.id}`, { method: 'PUT', body: JSON.stringify({ title, content }) });
        status.textContent = 'Saved.';
      } catch (err) {
        status.textContent = `Error: ${err.message}`;
      }
      setTimeout(() => (status.textContent = ''), 2000);
    });
    el.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm('Delete this source entry? This cannot be undone.')) return;
      await fetchJson(`/api/sources/${s.id}`, { method: 'DELETE' });
      load();
    });
    return el;
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('source-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      await fetchJson('/api/sources', {
        method: 'POST',
        body: JSON.stringify({ title: form.elements.title.value, content: form.elements.content.value }),
      });
      form.reset();
      load();
    });
  });

  return { load };
})();
