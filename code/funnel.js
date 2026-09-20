'use strict';

// Each status has exactly one parent stage (or null = top-level, under the
// cover-letter branch node), so every application maps to exactly one path
// through the funnel — see info/decisions/2026-09-20-architecture.md.
const PARENT = {
  applied: null, // default status on creation: submitted, outcome not yet known
  no_response: null,
  rejected: null,
  interview: null,
  interview_2nd: 'interview',
  interview_no_offer: 'interview',
  interview_never_scheduled: 'interview',
  offer: 'interview_2nd',
  interview_2nd_no_offer: 'interview_2nd',
  offer_accepted: 'offer',
  offer_declined: 'offer',
};

// interview_no_offer vs interview_2nd_no_offer are deliberately distinct
// labels (not both "No Offer") so they never collide into one Sankey node.
const LABELS = {
  applied: 'Applied',
  no_response: 'No Response',
  rejected: 'Rejected',
  interview: 'Interview',
  interview_2nd: '2nd Interview',
  interview_no_offer: 'No Offer (1st Interview)',
  interview_never_scheduled: 'Never Scheduled',
  offer: 'Offer',
  interview_2nd_no_offer: 'No Offer (2nd Interview)',
  offer_accepted: 'Accepted',
  offer_declined: 'Declined',
};

const STATUSES = Object.keys(PARENT);

const ROOT_LABEL = 'Applications';
const BRANCH_LABELS = { 1: 'Cover Letter', 0: 'No Cover Letter' };

const CHILDREN = {};
for (const status of STATUSES) {
  const parent = PARENT[status];
  if (parent) {
    (CHILDREN[parent] ??= []).push(status);
  }
}

// applications: [{status, used_cover_letter}] -> {nodes:[{name}], links:[{source,target,value}]}
// ready for an ECharts sankey series.
function buildFunnel(applications) {
  const nodeNames = new Set();
  const links = [];

  const branches = [1, 0]
    .map((flag) => ({
      flag,
      label: BRANCH_LABELS[flag],
      rows: applications.filter((a) => Number(Boolean(a.used_cover_letter)) === flag),
    }))
    .filter((b) => b.rows.length > 0);

  if (branches.length === 0) return { nodes: [], links: [] };

  nodeNames.add(ROOT_LABEL);

  for (const branch of branches) {
    nodeNames.add(branch.label);
    links.push({ source: ROOT_LABEL, target: branch.label, value: branch.rows.length });

    const directCount = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const row of branch.rows) {
      if (Object.prototype.hasOwnProperty.call(directCount, row.status)) {
        directCount[row.status]++;
      }
    }

    const totalCache = new Map();
    const total = (status) => {
      if (totalCache.has(status)) return totalCache.get(status);
      const children = CHILDREN[status] || [];
      const sum = directCount[status] + children.reduce((acc, child) => acc + total(child), 0);
      totalCache.set(status, sum);
      return sum;
    };

    const nodeName = (status) => `${branch.label} — ${LABELS[status]}`;

    for (const status of STATUSES) {
      const value = total(status);
      if (value === 0) continue;

      const parent = PARENT[status];
      const source = parent ? nodeName(parent) : branch.label;
      const target = nodeName(status);
      nodeNames.add(source);
      nodeNames.add(target);
      links.push({ source, target, value });

      // status is both a resting state and a parent (interview/interview_2nd/offer):
      // applications sitting here with nothing decided yet still need to be
      // accounted for, or this node's inflow would exceed its outflow.
      if (CHILDREN[status] && directCount[status] > 0) {
        const pendingNode = `${target} (in progress)`;
        nodeNames.add(pendingNode);
        links.push({ source: target, target: pendingNode, value: directCount[status] });
      }
    }
  }

  return { nodes: [...nodeNames].map((name) => ({ name })), links };
}

module.exports = { PARENT, LABELS, STATUSES, buildFunnel };
