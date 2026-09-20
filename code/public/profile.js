'use strict';

const Profile = (() => {
  let education = [];

  function renderEducation() {
    const container = document.getElementById('education-list');
    container.innerHTML = '';
    education.forEach((ed, i) => {
      const row = document.createElement('div');
      row.className = 'education-row';
      row.innerHTML = `
        <input placeholder="Degree" value="${escapeHtml(ed.degree)}" data-field="degree">
        <input placeholder="School" value="${escapeHtml(ed.school)}" data-field="school">
        <input placeholder="Year" value="${escapeHtml(ed.year)}" data-field="year" class="year-input">
        <button type="button" data-remove aria-label="Remove">&times;</button>
      `;
      row.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => {
          education[i][input.dataset.field] = input.value;
        });
      });
      row.querySelector('[data-remove]').addEventListener('click', () => {
        education.splice(i, 1);
        renderEducation();
      });
      container.appendChild(row);
    });
  }

  async function load() {
    const profile = await fetchJson('/api/profile');
    const form = document.getElementById('profile-form');
    for (const field of ['full_name', 'phone', 'address', 'github_url', 'linkedin_url', 'portfolio_url']) {
      form.elements[field].value = profile[field] || '';
    }
    education = profile.education || [];
    renderEducation();
  }

  async function save(event) {
    event.preventDefault();
    const form = document.getElementById('profile-form');
    const payload = {
      full_name: form.elements.full_name.value,
      phone: form.elements.phone.value,
      address: form.elements.address.value,
      github_url: form.elements.github_url.value,
      linkedin_url: form.elements.linkedin_url.value,
      portfolio_url: form.elements.portfolio_url.value,
      education,
    };
    const status = document.getElementById('profile-status');
    try {
      await fetchJson('/api/profile', { method: 'PUT', body: JSON.stringify(payload) });
      status.textContent = 'Saved.';
    } catch (err) {
      status.textContent = `Error: ${err.message}`;
    }
    setTimeout(() => (status.textContent = ''), 3000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('profile-form').addEventListener('submit', save);
    document.getElementById('add-education').addEventListener('click', () => {
      education.push({ degree: '', school: '', year: '' });
      renderEducation();
    });
  });

  return { load };
})();
