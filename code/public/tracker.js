'use strict';

const Tracker = (() => {
  let statusOptions = [];

  async function loadStatusOptions() {
    if (statusOptions.length) return statusOptions;
    statusOptions = await fetchJson('/api/applications/statuses');
    return statusOptions;
  }

  async function load() {
    const [apps] = await Promise.all([fetchJson('/api/applications'), loadStatusOptions()]);
    const body = document.getElementById('tracker-body');
    body.innerHTML = '';
    if (apps.length === 0) {
      body.innerHTML = '<tr><td colspan="9" class="empty">No applications yet.</td></tr>';
      return;
    }
    apps.forEach((a) => body.appendChild(renderRow(a)));
  }

  function renderRow(a) {
    const tr = document.createElement('tr');
    const statusSelect = statusOptions
      .map((s) => `<option value="${s.value}" ${s.value === a.status ? 'selected' : ''}>${escapeHtml(s.label)}</option>`)
      .join('');

    tr.innerHTML = `
      <td>${escapeHtml(a.job_title)}</td>
      <td>${escapeHtml(a.company)}</td>
      <td>${escapeHtml(a.compensation)}</td>
      <td>${a.job_url ? `<a href="${escapeHtml(a.job_url)}" target="_blank" rel="noopener">link</a>` : ''}</td>
      <td>${a.resume_id ? `<a href="document.html?id=${a.resume_id}" target="_blank">view</a>` : '<a href="#" data-action="gen-resume">generate</a>'}</td>
      <td>${a.cover_letter_id ? `<a href="document.html?id=${a.cover_letter_id}" target="_blank">view</a>` : '<a href="#" data-action="gen-cover">generate</a>'}</td>
      <td><select data-action="status">${statusSelect}</select></td>
      <td>${escapeHtml(a.applied_date)}</td>
      <td><button type="button" data-action="edit">Edit</button> <button type="button" data-action="delete">Delete</button></td>
    `;

    tr.querySelector('[data-action="status"]').addEventListener('change', async (e) => {
      await fetchJson(`/api/applications/${a.id}`, { method: 'PUT', body: JSON.stringify({ ...a, status: e.target.value }) });
    });

    tr.querySelector('[data-action="delete"]').addEventListener('click', async () => {
      if (!confirm(`Delete the tracker entry for ${a.job_title} at ${a.company}? This also deletes its generated documents.`)) return;
      await fetchJson(`/api/applications/${a.id}`, { method: 'DELETE' });
      load();
    });

    tr.querySelector('[data-action="edit"]').addEventListener('click', () => openDialog(a));

    const genResume = tr.querySelector('[data-action="gen-resume"]');
    if (genResume) genResume.addEventListener('click', (e) => { e.preventDefault(); Builder.startForExisting(a.id); });
    const genCover = tr.querySelector('[data-action="gen-cover"]');
    if (genCover) genCover.addEventListener('click', (e) => { e.preventDefault(); Builder.startForExisting(a.id); });

    return tr;
  }

  function openDialog(app) {
    const dialog = document.getElementById('tracker-dialog');
    const form = document.getElementById('tracker-form');
    form.reset();
    document.getElementById('tracker-dialog-title').textContent = app ? 'Edit Application' : 'Add Application';
    form.elements.status.innerHTML = statusOptions.map((s) => `<option value="${s.value}">${escapeHtml(s.label)}</option>`).join('');

    if (app) {
      form.elements.id.value = app.id;
      form.elements.job_title.value = app.job_title;
      form.elements.company.value = app.company;
      form.elements.compensation.value = app.compensation;
      form.elements.job_url.value = app.job_url;
      form.elements.location.value = app.location;
      form.elements.used_cover_letter.checked = !!app.used_cover_letter;
      form.elements.applied_date.value = app.applied_date;
      form.elements.status.value = app.status;
    } else {
      form.elements.id.value = '';
      form.elements.applied_date.value = new Date().toISOString().slice(0, 10);
    }
    dialog.showModal();
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = event.target;
    const payload = {
      job_title: form.elements.job_title.value,
      company: form.elements.company.value,
      compensation: form.elements.compensation.value,
      job_url: form.elements.job_url.value,
      location: form.elements.location.value,
      used_cover_letter: form.elements.used_cover_letter.checked,
      applied_date: form.elements.applied_date.value,
      status: form.elements.status.value,
    };
    const id = form.elements.id.value;
    if (id) {
      await fetchJson(`/api/applications/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await fetchJson('/api/applications', { method: 'POST', body: JSON.stringify(payload) });
    }
    document.getElementById('tracker-dialog').close();
    load();
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tracker-add').addEventListener('click', async () => {
      await loadStatusOptions();
      openDialog(null);
    });
    document.getElementById('tracker-form').addEventListener('submit', submitForm);
    document.getElementById('tracker-cancel').addEventListener('click', () => document.getElementById('tracker-dialog').close());
  });

  return { load };
})();
