// Helpers shared by the profile page (profile.js) and the prep page (prep.js).
const $ = (id) => document.getElementById(id);

function setMessage(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle('error', isError);
}

async function api(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error('Could not reach the local server. Is it still running?');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'Something went wrong.');
    error.body = body;
    throw error;
  }
  return body;
}

const shortDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/).length : 0);

// Returns an https linkedin.com URL, or '' if the input isn't one.
function linkedinHref(value) {
  const raw = value.trim();
  if (!raw) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)linkedin\.com$/i.test(url.hostname)) return '';
    url.protocol = 'https:';
    return url.toString();
  } catch {
    return '';
  }
}

// Keeps an "Open" link pointing at the LinkedIn URL typed in the input, or disabled if it isn't one.
function wireOpenButton(input, link) {
  const update = () => {
    const href = linkedinHref(input.value);
    if (href) {
      link.href = href;
      link.removeAttribute('aria-disabled');
    } else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
    }
  };
  input.addEventListener('input', update);
  update();
  return update;
}

function chipButton(label, onClick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = label;
  chip.addEventListener('click', onClick);
  return chip;
}

// ---------- Browser storage ----------
// Your profile and chat tracker are saved in this browser only (localStorage), never on the server.
// Each visitor's data stays on their own device, so nobody can see anyone else's.

const STORE_KEYS = {
  profile: 'hireGrounds.profile.v1',
  chats: 'hireGrounds.chats.v1',
  imported: 'hireGrounds.importedLocalData.v1',
};

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    throw new Error("Your browser couldn't save this. Storage may be full or turned off (for example, in a private window).");
  }
}

const emptyProfile = () => ({ resumes: [], activeResumeId: null, personalStories: '', linkedinUrl: '', linkedinText: '', updatedAt: null });

function loadProfile() {
  const profile = { ...emptyProfile(), ...readStore(STORE_KEYS.profile, {}) };
  if (!Array.isArray(profile.resumes)) profile.resumes = [];
  if (!profile.resumes.some((r) => r.id === profile.activeResumeId)) {
    profile.activeResumeId = profile.resumes.length ? profile.resumes[0].id : null;
  }
  return profile;
}

function saveProfile(profile) {
  profile.updatedAt = new Date().toISOString();
  writeStore(STORE_KEYS.profile, profile);
  return profile;
}

function loadChats() {
  const chats = readStore(STORE_KEYS.chats, []);
  return Array.isArray(chats) ? chats : [];
}

function saveChats(chats) {
  writeStore(STORE_KEYS.chats, chats);
  return chats;
}

const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// ---------- Chat tracker entries ----------

const CHAT_STATUSES = ['To reach out', 'Reached out', 'Scheduled', 'Completed', 'Follow-up needed'];
const MAX_CHATS = 1000;

// A calendar day in YYYY-MM-DD form (from the date picker), or ''. Rejects impossible dates such as Feb 31.
function cleanDay(value, label) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const parsed = new Date(`${raw}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new Error(`${label} isn't a valid date.`);
  }
  return raw;
}

// Builds a tracker entry from form input, validating every field.
function buildChat(input, existing = {}) {
  const text = (value, max) => String(value || '').trim().slice(0, max);
  const name = text(input.name, 100);
  if (!name) throw new Error("Add the person's name.");
  const email = text(input.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email address doesn't look right.");
  const linkedinRaw = text(input.linkedinUrl, 300);
  const linkedinUrl = linkedinHref(linkedinRaw);
  if (linkedinRaw && !linkedinUrl) throw new Error('Use a linkedin.com profile URL.');
  return {
    id: existing.id || newId(),
    createdAt: existing.createdAt || new Date().toISOString(),
    name,
    email,
    linkedinUrl,
    company: text(input.company, 100),
    role: text(input.role, 100),
    status: CHAT_STATUSES.includes(input.status) ? input.status : 'To reach out',
    nextChatDate: cleanDay(input.nextChatDate, 'Next chat date'),
    lastChatDate: cleanDay(input.lastChatDate, 'Last chat date'),
    followUpDate: cleanDay(input.followUpDate, 'Follow-up date'),
    howConnected: text(input.howConnected, 300),
    notes: text(input.notes, 5000),
    thankYouSent: input.thankYouSent === true || input.thankYouSent === 'true' || input.thankYouSent === 'on',
    updatedAt: new Date().toISOString(),
  };
}

// Reads a PDF on the server (nothing is saved there) and returns its text.
async function pdfText(file) {
  const form = new FormData();
  form.append('file', file);
  const { text } = await api('/api/extract-pdf', { method: 'POST', body: form });
  return text;
}

// One time per browser: copies a profile and tracker that an older version saved on this laptop.
// The import route only exists when the app runs locally, so on the hosted site this does nothing.
async function importLocalDataOnce() {
  if (readStore(STORE_KEYS.imported, false)) return null;
  let imported = null;
  try {
    const empty = !loadProfile().resumes.length && !loadChats().length;
    if (empty) {
      const response = await fetch('/api/local-import');
      if (response.ok) {
        const data = await response.json();
        const resumes = data.profile && Array.isArray(data.profile.resumes) ? data.profile.resumes.length : 0;
        const chats = Array.isArray(data.chats) ? data.chats.length : 0;
        if (resumes || chats) {
          if (data.profile) writeStore(STORE_KEYS.profile, data.profile);
          writeStore(STORE_KEYS.chats, data.chats || []);
          imported = { resumes, chats };
        }
      }
    }
    writeStore(STORE_KEYS.imported, true);
  } catch {
    // If the import fails, the app still works with an empty profile.
  }
  return imported;
}

// Marks the current page in the header navigation.
for (const link of document.querySelectorAll('.site-nav a')) {
  if (link.dataset.page === document.body.dataset.page) link.setAttribute('aria-current', 'page');
}
