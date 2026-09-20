'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFunnel, LABELS, PARENT } = require('../funnel');

test('empty input returns an empty funnel', () => {
  assert.deepEqual(buildFunnel([]), { nodes: [], links: [] });
});

test('no two statuses share a label (no Sankey node-name collisions)', () => {
  const labels = Object.values(LABELS);
  assert.equal(new Set(labels).size, labels.length);
});

test('applied has no parent and is a valid default status', () => {
  assert.equal(PARENT.applied, null);
});

test('flow balances at every node, including apps left in-progress mid-funnel', () => {
  const rows = [
    ...Array(3).fill({ status: 'applied', used_cover_letter: 1 }),
    ...Array(2).fill({ status: 'no_response', used_cover_letter: 1 }),
    ...Array(1).fill({ status: 'rejected', used_cover_letter: 0 }),
    ...Array(4).fill({ status: 'interview', used_cover_letter: 1 }), // in-progress
    ...Array(2).fill({ status: 'interview_never_scheduled', used_cover_letter: 1 }),
    ...Array(1).fill({ status: 'interview_no_offer', used_cover_letter: 1 }),
    ...Array(2).fill({ status: 'interview_2nd', used_cover_letter: 1 }), // in-progress
    ...Array(1).fill({ status: 'interview_2nd_no_offer', used_cover_letter: 0 }),
    ...Array(3).fill({ status: 'offer', used_cover_letter: 0 }), // in-progress
    ...Array(1).fill({ status: 'offer_accepted', used_cover_letter: 0 }),
    ...Array(2).fill({ status: 'offer_declined', used_cover_letter: 0 }),
  ];

  const { links } = buildFunnel(rows);
  const outflow = new Map();
  const inflow = new Map();
  for (const { source, target, value } of links) {
    outflow.set(source, (outflow.get(source) || 0) + value);
    inflow.set(target, (inflow.get(target) || 0) + value);
  }

  for (const [node, out] of outflow) {
    if (node === 'Applications') continue; // root: outflow only, no parent to balance against
    assert.equal(inflow.get(node), out, `inflow/outflow mismatch at "${node}"`);
  }
});

test('root outflow equals total row count', () => {
  const rows = [
    { status: 'applied', used_cover_letter: 1 },
    { status: 'no_response', used_cover_letter: 0 },
    { status: 'offer_accepted', used_cover_letter: 1 },
  ];
  const { links } = buildFunnel(rows);
  const rootOutflow = links.filter((l) => l.source === 'Applications').reduce((acc, l) => acc + l.value, 0);
  assert.equal(rootOutflow, rows.length);
});

test('a branch with zero rows contributes no nodes or links', () => {
  const rows = [{ status: 'applied', used_cover_letter: 1 }];
  const { nodes } = buildFunnel(rows);
  const names = nodes.map((n) => n.name);
  assert.ok(!names.includes('No Cover Letter'));
});
