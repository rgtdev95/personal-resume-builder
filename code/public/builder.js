'use strict';

// Note on ordering: the tracker row (POST /api/applications) is only created
// inside ensureApplication(), called from generate() — never from extract()
// or the duplicate-check. That means Cancel/reset() before a Generate click
// is always a pure client-side reset with nothing to undo on the server.
const Builder = (() => {
  let applicationId = null;

  function form() {
    return document.getElementById('builder-form');
  }

  function reset() {
    applicationId = null;
    form().reset();
    document.getElementById('builder-duplicate-warning').hidden = true;
    document.getElementById('builder-results').innerHTML = '';
    document.getElementById('builder-extract-status').textContent = '';
    renderSourceCheckboxes();
  }

  async function renderSourceCheckboxes(checkedIds) {
    const sources = await fetchJson('/api/sources');
    const container = document.getElementById('builder-sources-list');
    if (sources.length === 0) {
      container.innerHTML = '<p class="empty">No source entries yet &mdash; add some in the Work History tab first.</p>';
      return;
    }
    container.innerHTML = sources
      .map(
        (s) => `
      <label class="source-checkbox">
        <input type="checkbox" value="${s.id}" ${!checkedIds || checkedIds.includes(s.id) ? 'checked' : ''}>
        ${escapeHtml(s.title || `Source #${s.id}`)}
      </label>`
      )
      .join('');
  }

  function selectedSourceIds() {
    return [...document.querySelectorAll('#builder-sources-list input:checked')].map((el) => Number(el.value));
  }

  async function extract() {
    const status = document.getElementById('builder-extract-status');
    const text = form().elements.job_description.value.trim();
    if (!text) {
      status.textContent = 'Paste a job description first.';
      return;
    }
    status.textContent = 'Extracting... (calls the AI, may take a few seconds)';
    try {
      const data = await fetchJson('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify({ job_description_text: text }),
      });
      form().elements.company.value = data.company || '';
      form().elements.job_title.value = data.job_title || '';
      form().elements.compensation.value = data.compensation || '';
      form().elements.location.value = data.location || '';
      status.textContent = 'Extracted — review the fields below before generating.';
      await checkDuplicate();
    } catch (err) {
      status.textContent = `Extraction failed: ${err.message}`;
    }
  }

  async function checkDuplicate() {
    const company = form().elements.company.value.trim();
    const job_title = form().elements.job_title.value.trim();
    const warning = document.getElementById('builder-duplicate-warning');
    if (!company || !job_title) {
      warning.hidden = true;
      return;
    }
    const result = await fetchJson(
      `/api/applications/check-duplicate?company=${encodeURIComponent(company)}&job_title=${encodeURIComponent(job_title)}`
    );
    if (result.duplicate && result.application.id !== applicationId) {
      warning.querySelector('p').textContent =
        `You already have an application for ${job_title} at ${company} ` +
        `(status: ${result.application.status}, applied ${result.application.applied_date}).`;
      warning.hidden = false;
    } else {
      warning.hidden = true;
    }
  }

  async function ensureApplication() {
    if (applicationId) return applicationId;
    const payload = {
      job_title: form().elements.job_title.value.trim(),
      company: form().elements.company.value.trim(),
      compensation: form().elements.compensation.value.trim(),
      job_url: form().elements.job_url.value.trim(),
      location: form().elements.location.value.trim(),
      job_description: form().elements.job_description.value,
      used_cover_letter: form().elements.used_cover_letter.checked,
    };
    if (!payload.job_title || !payload.company) {
      throw new Error('Job title and company are required (use Extract, or fill them in manually).');
    }
    const created = await fetchJson('/api/applications', { method: 'POST', body: JSON.stringify(payload) });
    applicationId = created.id;
    return applicationId;
  }

  async function generate(kind) {
    const resultsEl = document.getElementById('builder-results');
    const label = kind === 'resume' ? 'resume' : 'cover letter';
    resultsEl.textContent = `Generating ${label}... (calls the AI, may take up to a minute)`;
    try {
      const id = await ensureApplication();
      const path = kind === 'resume' ? 'generate-resume' : 'generate-cover-letter';
      const doc = await fetchJson(`/api/documents/${path}`, {
        method: 'POST',
        body: JSON.stringify({ application_id: id, source_ids: selectedSourceIds() }),
      });
      resultsEl.innerHTML = `<p>${label === 'resume' ? 'Resume' : 'Cover letter'} generated. <a href="document.html?id=${doc.id}" target="_blank">Open &amp; edit</a></p>`;
      Tracker.load();
    } catch (err) {
      resultsEl.textContent = `Generation failed: ${err.message}`;
    }
  }

  async function startForExisting(id) {
    switchTab('builder');
    reset();
    const app = await fetchJson(`/api/applications/${id}`);
    applicationId = app.id;
    form().elements.job_url.value = app.job_url;
    form().elements.job_description.value = app.job_description;
    form().elements.job_title.value = app.job_title;
    form().elements.company.value = app.company;
    form().elements.compensation.value = app.compensation;
    form().elements.location.value = app.location;
    form().elements.used_cover_letter.checked = !!app.used_cover_letter;
    renderSourceCheckboxes();
  }

  function init() {
    document.getElementById('builder-extract').addEventListener('click', extract);
    document.getElementById('builder-generate-resume').addEventListener('click', () => generate('resume'));
    document.getElementById('builder-generate-cover').addEventListener('click', () => generate('cover_letter'));
    document.getElementById('builder-cancel').addEventListener('click', reset);
    document.getElementById('builder-proceed-anyway').addEventListener('click', () => {
      document.getElementById('builder-duplicate-warning').hidden = true;
    });
    document.getElementById('builder-view-existing').addEventListener('click', () => {
      reset();
      switchTab('tracker');
    });
    form().elements.company.addEventListener('blur', checkDuplicate);
    form().elements.job_title.addEventListener('blur', checkDuplicate);
    renderSourceCheckboxes();
  }

  return { init, startForExisting };
})();
