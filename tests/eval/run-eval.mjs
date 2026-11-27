// Runs the 10-case test set against a Hire Grounds server and saves every output plus automatic checks.
//
// Usage (from the repo root, with the app running):
//   node tests/eval/run-eval.mjs --label before --mode before --base http://127.0.0.1:3000
//   node tests/eval/run-eval.mjs --label after  --mode after  --base http://127.0.0.1:3000
//
// --mode controls where target roles, career goal, and "what I want to learn" go:
//   before: into the fields the app had before Build 4 (personal stories and "Anything else"),
//           which is how a user would have typed them.
//   after:  into the dedicated fields added in Build 4.
// The information is identical in both modes; only the field it's sent in changes.
// Each case is one real Claude call (about $0.10). The server's rate limit is 10 generations per 15 minutes.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith('--') ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []));
const label = args.label || 'run';
const mode = args.mode || 'before';
const base = args.base || 'http://127.0.0.1:3000';
const only = args.only ? args.only.split(',') : null;

// Current and previous companies for each case, used by the "questions mention the company" check.
const COMPANIES = {
  N1: ['Northwind', 'Fictional Advisory'],
  N2: ['Harborline', 'Stoneway'],
  N3: ['Bright Meadow', 'agency'],
  N4: ['Example Energy', 'Sample Consulting'],
  N5: ['Mercy Peak', 'Lumen'],
  M6: ['brightloop'],
  M7: ['startup'],
  M8: ['Pebble Pay', 'Copperline'],
  A9: ['Lumora', 'Seabright'],
  A10: ['Solaris'],
};

function requestBody(c) {
  const p = c.profile;
  const k = c.contact;
  const body = {
    resumeText: p.resumeText,
    personalStories: p.personalStories,
    myLinkedinText: p.myLinkedinText,
    name: k.name,
    role: k.role,
    company: k.company,
    pastExperience: k.pastExperience,
    connection: k.connection,
    notes: k.notes,
    linkedinText: k.linkedinText,
    tone: c.tone,
  };
  if (mode === 'before') {
    const extra = [p.targetRoles && `Target roles: ${p.targetRoles}`, p.careerGoal && `Career goal: ${p.careerGoal}`].filter(Boolean).join('\n');
    if (extra) body.personalStories = [p.personalStories, extra].filter(Boolean).join('\n');
    if (k.wantToLearn) body.notes = [k.notes, `What I want to learn from them: ${k.wantToLearn}`].filter(Boolean).join('\n');
  } else {
    body.targetRoles = p.targetRoles;
    body.careerGoal = p.careerGoal;
    body.wantToLearn = k.wantToLearn;
  }
  return body;
}

const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const joinSegments = (segs) => (Array.isArray(segs) ? segs.map((s) => s.text).join('') : segs || '');

function autoChecks(c, out) {
  const companies = (COMPANIES[c.id] || [c.contact.company]).map((x) => x.toLowerCase());
  const q = out.questions || [];
  const t1 = joinSegments(out.tmay_1min);
  const t2 = joinSegments(out.tmay_2min);
  return {
    emailWords: words(out.outreach_email),
    emailUnder120: words(out.outreach_email) < 120,
    questionCount: q.length,
    questionsMentioningCompany: q.filter((x) => companies.some((co) => x.toLowerCase().includes(co))).length,
    tmay1Thanks: /thank/i.test(t1),
    tmay2Thanks: /thank/i.test(t2),
    tmay1Words: words(t1),
    tmay2Words: words(t2),
    addedPhrases1: Array.isArray(out.tmay_1min) ? out.tmay_1min.filter((s) => s.added).length : null,
    addedPhrases2: Array.isArray(out.tmay_2min) ? out.tmay_2min.filter((s) => s.added).length : null,
  };
}

const { cases } = JSON.parse(readFileSync(join(here, 'test-set.json'), 'utf8'));
const outDir = join(here, 'results', label);
mkdirSync(outDir, { recursive: true });
const summary = [];

for (const c of cases.filter((x) => !only || only.includes(x.id))) {
  const body = requestBody(c);
  const started = Date.now();
  let status = 0;
  let out = {};
  try {
    const res = await fetch(`${base}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    status = res.status;
    out = await res.json().catch(() => ({}));
  } catch (err) {
    out = { error: String(err) };
  }
  const ms = Date.now() - started;
  const checks = status === 200 ? autoChecks(c, out) : null;
  writeFileSync(join(outDir, `${c.id}.json`), JSON.stringify({ id: c.id, category: c.category, label: c.label, mode, status, ms, request: body, response: out, checks }, null, 2));
  summary.push({ id: c.id, category: c.category, status, seconds: Math.round(ms / 1000), ...(checks || { error: out.error, toneFeedback: out.tone_feedback }) });
  console.log(`${c.id} (${c.category}) -> HTTP ${status} in ${Math.round(ms / 1000)}s`, checks ? JSON.stringify(checks) : JSON.stringify(out).slice(0, 200));
}

writeFileSync(join(outDir, 'summary.json'), JSON.stringify({ label, mode, base, ranAt: new Date().toISOString(), summary }, null, 2));
console.log(`Saved ${summary.length} results to ${outDir}`);
