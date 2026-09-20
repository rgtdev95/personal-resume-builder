'use strict';

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((el) => {
    el.hidden = el.dataset.tab !== name;
  });
  document.querySelectorAll('nav button').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === name);
  });
  if (name === 'visualize') Visualize.render();
  if (name === 'tracker') Tracker.load();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  Profile.load();
  Sources.load();
  Tracker.load();
  Builder.init();

  switchTab('tracker');
});
