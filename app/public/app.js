const $ = (id) => document.getElementById(id);

let profile = null;
let editingId = null; // resume being edited, or null when adding
let replacingId = null; // resume whose PDF is being replaced

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
  if (!response.ok) throw new Error(body.error || 'Something went wrong.');
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
const updateMyOpen = wireOpenButton($('my-linkedin-url'), $('open-my-linkedin'));
wireOpenButton($('their-linkedin-url'), $('open-their-linkedin'));

// ---------- Profile rendering ----------

function renderProfile(next, { keepOpen = false } = {}) {
  profile = next;
  const count = profile.resumes.length;

  $('resume-list').replaceChildren(...profile.resumes.map(resumeCard));
  if (!count) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No resumes yet. Add one to get started.';
    $('resume-list').append(empty);
  }

  const select = $('resume-select');
  select.replaceChildren(...profile.resumes.map((r) => new Option(r.name, r.id, false, r.id === profile.activeResumeId)));
  select.disabled = !count;
  if (!count) select.append(new Option('Add a resume in step 1 first', '', true, true));

  $('personal-stories').value = profile.personalStories || '';
  $('my-linkedin-url').value = profile.linkedinUrl || '';
  updateMyOpen();
  $('my-linkedin-status').hidden = !profile.linkedinText;
  $('my-linkedin-summary').textContent = profile.linkedinText
    ? `LinkedIn PDF added (${wordCount(profile.linkedinText)} words).`
    : '';

  $('profile-status').textContent = count
    ? `${count} resume${count === 1 ? '' : 's'}${profile.updatedAt ? ` · Updated ${shortDate(profile.updatedAt)}` : ''}`
    : 'Not set up yet';
  if (!count || keepOpen) $('profile-section').open = true;
}

function resumeCard(resume) {
  const card = document.createElement('article');
  card.className = resume.id === profile.activeResumeId ? 'resume-card active' : 'resume-card';

  const info = document.createElement('div');
  info.className = 'resume-info';
  const name = document.createElement('div');
  name.className = 'resume-name';
  name.textContent = resume.name;
  if (resume.id === profile.activeResumeId) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Selected';
    name.append(' ', badge);
  }
  const meta = document.createElement('div');
  meta.className = 'resume-meta';
  meta.textContent = `${resume.source === 'pdf' ? 'From PDF' : 'Pasted text'} · ${wordCount(resume.text)} words · Updated ${shortDate(resume.updatedAt)}`;
  info.append(name, meta);

  const actions = document.createElement('div');
  actions.className = 'resume-actions';
  const button = (label, onClick, extra = '') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `secondary small ${extra}`.trim();
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  };
  actions.append(
    button('Edit', () => openEditor(resume)),
    button('Replace PDF', () => {
      replacingId = resume.id;
      $('replace-file').click();
    }),
    button('Delete', () => deleteResume(resume), 'danger'),
  );

  card.append(info, actions);
  return card;
}

// ---------- Resume editor ----------

function openEditor(resume = null) {
  editingId = resume ? resume.id : null;
  $('editor-title').textContent = resume ? `Edit "${resume.name}"` : 'Add a resume';
  $('editor-name').value = resume ? resume.name : '';
  $('editor-text').value = resume ? resume.text : '';
  $('editor-file').value = '';
  setMessage($('editor-message'), '');
  $('resume-editor').hidden = false;
  $('add-resume').hidden = true;
  $('editor-name').focus();
}

function closeEditor() {
  editingId = null;
  $('resume-editor').hidden = true;
  $('add-resume').hidden = false;
}

$('add-resume').addEventListener('click', () => openEditor());
$('editor-cancel').addEventListener('click', closeEditor);

$('resume-editor').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('editor-save');
  const form = new FormData(event.target);
  if (!$('editor-file').files.length) form.delete('resumeFile');
  button.disabled = true;
  setMessage($('editor-message'), 'Saving...');
  try {
    const url = editingId ? `/api/resumes/${encodeURIComponent(editingId)}` : '/api/resumes';
    const { profile: next } = await api(url, { method: editingId ? 'PUT' : 'POST', body: form });
    closeEditor();
    renderProfile(next, { keepOpen: true });
    setMessage($('resume-message'), 'Resume saved.');
  } catch (err) {
    setMessage($('editor-message'), err.message, true);
  } finally {
    button.disabled = false;
  }
});

$('replace-file').addEventListener('change', async () => {
  const file = $('replace-file').files[0];
  if (!file || !replacingId) return;
  const form = new FormData();
  form.append('resumeFile', file);
  setMessage($('resume-message'), 'Replacing...');
  try {
    const { profile: next } = await api(`/api/resumes/${encodeURIComponent(replacingId)}`, { method: 'PUT', body: form });
    renderProfile(next, { keepOpen: true });
    setMessage($('resume-message'), 'Resume replaced with the new PDF.');
  } catch (err) {
    setMessage($('resume-message'), err.message, true);
  } finally {
    replacingId = null;
    $('replace-file').value = '';
  }
});

async function deleteResume(resume) {
  if (!window.confirm(`Delete "${resume.name}"? This can't be undone.`)) return;
  try {
    const { profile: next } = await api(`/api/resumes/${encodeURIComponent(resume.id)}`, { method: 'DELETE' });
    renderProfile(next, { keepOpen: true });
    setMessage($('resume-message'), 'Resume deleted.');
  } catch (err) {
    setMessage($('resume-message'), err.message, true);
  }
}

// ---------- About you ----------

$('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('save-profile');
  button.disabled = true;
  setMessage($('profile-message'), 'Saving...');
  try {
    const { profile: next } = await api('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personalStories: $('personal-stories').value, linkedinUrl: $('my-linkedin-url').value }),
    });
    renderProfile(next, { keepOpen: true });
    setMessage($('profile-message'), 'Saved.');
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  } finally {
    button.disabled = false;
  }
});

$('my-linkedin-file').addEventListener('change', async () => {
  const file = $('my-linkedin-file').files[0];
  if (!file) return;
  const form = new FormData();
  form.append('linkedinFile', file);
  setMessage($('profile-message'), 'Reading your LinkedIn PDF...');
  try {
    const { profile: next } = await api('/api/profile/linkedin', { method: 'POST', body: form });
    renderProfile(next, { keepOpen: true });
    setMessage($('profile-message'), '');
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  } finally {
    $('my-linkedin-file').value = '';
  }
});

$('my-linkedin-remove').addEventListener('click', async () => {
  try {
    const { profile: next } = await api('/api/profile/linkedin', { method: 'DELETE' });
    renderProfile(next, { keepOpen: true });
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  }
});

// ---------- Their LinkedIn PDF ----------

$('their-linkedin-file').addEventListener('change', async () => {
  const file = $('their-linkedin-file').files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  setMessage($('generate-message'), 'Reading their LinkedIn PDF...');
  try {
    const { text } = await api('/api/extract-pdf', { method: 'POST', body: form });
    $('their-linkedin-text').value = text;
    $('their-linkedin-preview').hidden = false;
    setMessage($('generate-message'), '');
  } catch (err) {
    setMessage($('generate-message'), err.message, true);
  } finally {
    $('their-linkedin-file').value = '';
  }
});

$('their-linkedin-remove').addEventListener('click', () => {
  $('their-linkedin-text').value = '';
  $('their-linkedin-preview').hidden = true;
});

// ---------- Results ----------

function addCard({ title, text, list, note, noteIsError }) {
  const card = document.createElement('article');
  card.className = 'card';

  const head = document.createElement('div');
  head.className = 'card-head';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'copy';
  copy.textContent = 'Copy';
  copy.addEventListener('click', async () => {
    const value = list ? list.map((item, i) => `${i + 1}. ${item}`).join('\n') : text;
    try {
      await navigator.clipboard.writeText(value);
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Copy failed';
    }
    setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
  });
  head.append(heading, copy);
  card.append(head);

  if (list) {
    const ol = document.createElement('ol');
    for (const item of list) {
      const li = document.createElement('li');
      li.textContent = item;
      ol.append(li);
    }
    card.append(ol);
  } else {
    const body = document.createElement('p');
    body.className = 'card-body';
    body.textContent = text;
    card.append(body);
  }

  if (note) {
    const noteEl = document.createElement('p');
    noteEl.className = noteIsError ? 'card-note error' : 'card-note';
    noteEl.textContent = note;
    card.append(noteEl);
  }
  $('cards').append(card);
}

$('contact-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!profile || !profile.resumes.length) {
    setMessage($('generate-message'), 'Add a resume in step 1 first.', true);
    $('profile-section').open = true;
    return;
  }
  const button = $('generate');
  button.disabled = true;
  button.classList.add('is-loading');
  setMessage($('generate-message'), 'Generating. This can take up to 30 seconds.');
  try {
    const result = await api('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.target))),
    });
    $('overlap').textContent = result.overlap_assessment;
    $('cards').replaceChildren();
    addCard({
      title: 'Outreach email',
      text: result.outreach_email,
      note: result.email_over_limit
        ? `${result.email_words} words, which is over the 120-word limit. Trim before sending.`
        : `${result.email_words} words`,
      noteIsError: result.email_over_limit,
    });
    addCard({ title: '5 questions to ask', list: result.questions });
    addCard({ title: 'Tell me about yourself: 1 minute', text: result.tmay_1min });
    addCard({ title: 'Tell me about yourself: 2 minutes', text: result.tmay_2min });
    $('results').hidden = false;
    setMessage($('generate-message'), '');
    $('results').scrollIntoView({ behavior: 'smooth' });
    // The server remembers the chosen resume; reflect that in the list.
    api('/api/profile').then(({ profile: next }) => renderProfile(next)).catch(() => {});
  } catch (err) {
    setMessage($('generate-message'), err.message, true);
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
  }
});

// ---------- Start ----------

api('/api/profile')
  .then(({ profile: loaded }) => {
    renderProfile(loaded);
    if (loaded.resumes.length) $('profile-section').open = false;
  })
  .catch((err) => setMessage($('resume-message'), err.message, true));
