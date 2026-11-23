// Profile page: resumes, personal stories, and your LinkedIn. Everything is saved in this browser.
let profile = emptyProfile();
let editingId = null; // resume being edited, or null when adding
let replacingId = null; // resume whose PDF is being replaced
let aboutDirty = false; // unsaved changes in "About you"

const MAX_DOC_CHARS = 40000;
const updateMyOpen = wireOpenButton($('my-linkedin-url'), $('open-my-linkedin'));

if (new URLSearchParams(location.search).has('setup')) $('welcome').hidden = false;

function renderProfile(next) {
  profile = next;
  const count = profile.resumes.length;

  $('resume-list').replaceChildren(...profile.resumes.map(resumeCard));
  if (!count) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No resumes yet. Add one to get started.';
    $('resume-list').append(empty);
  }

  if (!aboutDirty) {
    $('personal-stories').value = profile.personalStories || '';
    $('my-linkedin-url').value = profile.linkedinUrl || '';
    updateMyOpen();
  }
  $('my-linkedin-status').hidden = !profile.linkedinText;
  $('my-linkedin-summary').textContent = profile.linkedinText
    ? `LinkedIn PDF added (${wordCount(profile.linkedinText)} words).`
    : '';

  $('profile-status').textContent = count
    ? `${count} resume${count === 1 ? '' : 's'}${profile.updatedAt ? ` · Updated ${shortDate(profile.updatedAt)}` : ''}`
    : 'Not set up yet';

  // You can only move on to prep once there's at least one resume.
  const ready = count > 0;
  $('continue').toggleAttribute('aria-disabled', !ready);
  if (ready) $('continue').href = '/';
  else $('continue').removeAttribute('href');
  $('continue-hint').textContent = ready
    ? 'Your profile is saved in this browser. You can come back and edit it anytime.'
    : 'Add at least one resume to continue.';
}

function resumeCard(resume) {
  const card = document.createElement('article');
  card.className = resume.id === profile.activeResumeId ? 'resume-card active' : 'resume-card';

  const info = document.createElement('div');
  info.className = 'resume-info ph-no-capture';
  const name = document.createElement('div');
  name.className = 'resume-name';
  name.textContent = resume.name;
  if (resume.id === profile.activeResumeId) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Last used';
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
  const file = $('editor-file').files[0];
  button.disabled = true;
  setMessage($('editor-message'), file ? 'Reading your PDF...' : 'Saving...');
  try {
    // A chosen PDF wins over pasted text.
    const text = (file ? await pdfText(file) : $('editor-text').value.trim()).slice(0, MAX_DOC_CHARS);
    if (!text) throw new Error(editingId ? "A resume can't be empty. Delete it instead." : 'Add the resume as a PDF or pasted text.');
    const name = $('editor-name').value.trim().slice(0, 60);
    const wasEditing = Boolean(editingId);
    const next = loadProfile();
    if (wasEditing) {
      const resume = next.resumes.find((r) => r.id === editingId);
      if (!resume) throw new Error('That resume no longer exists. Refresh the page.');
      Object.assign(resume, { name: name || resume.name, text, source: file ? 'pdf' : 'text', updatedAt: new Date().toISOString() });
    } else {
      const resume = { id: newId(), name: name || `Resume ${next.resumes.length + 1}`, text, source: file ? 'pdf' : 'text', updatedAt: new Date().toISOString() };
      next.resumes.push(resume);
      next.activeResumeId = resume.id;
    }
    saveProfile(next);
    track(wasEditing ? 'resume updated' : 'resume added', { source: file ? 'pdf' : 'text', resume_count: next.resumes.length });
    closeEditor();
    renderProfile(next);
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
  setMessage($('resume-message'), 'Reading your PDF...');
  try {
    const text = (await pdfText(file)).slice(0, MAX_DOC_CHARS);
    const next = loadProfile();
    const resume = next.resumes.find((r) => r.id === replacingId);
    if (!resume) throw new Error('That resume no longer exists. Refresh the page.');
    Object.assign(resume, { text, source: 'pdf', updatedAt: new Date().toISOString() });
    saveProfile(next);
    track('resume pdf replaced', { resume_count: next.resumes.length });
    renderProfile(next);
    setMessage($('resume-message'), 'Resume replaced with the new PDF.');
  } catch (err) {
    setMessage($('resume-message'), err.message, true);
  } finally {
    replacingId = null;
    $('replace-file').value = '';
  }
});

function deleteResume(resume) {
  if (!window.confirm(`Delete "${resume.name}"? This can't be undone.`)) return;
  try {
    const next = loadProfile();
    next.resumes = next.resumes.filter((r) => r.id !== resume.id);
    if (next.activeResumeId === resume.id) next.activeResumeId = next.resumes.length ? next.resumes[0].id : null;
    saveProfile(next);
    track('resume deleted', { resume_count: next.resumes.length });
    renderProfile(next);
    setMessage($('resume-message'), 'Resume deleted.');
  } catch (err) {
    setMessage($('resume-message'), err.message, true);
  }
}

// ---------- About you ----------

for (const id of ['personal-stories', 'my-linkedin-url']) {
  $(id).addEventListener('input', () => {
    aboutDirty = true;
    setMessage($('profile-message'), 'Unsaved changes.');
  });
}

function saveAbout() {
  const url = $('my-linkedin-url').value.trim();
  const href = linkedinHref(url);
  if (url && !href) throw new Error('Use a linkedin.com profile URL.');
  const next = loadProfile();
  next.personalStories = $('personal-stories').value.trim().slice(0, MAX_DOC_CHARS);
  next.linkedinUrl = href;
  saveProfile(next);
  aboutDirty = false;
  track('profile saved', { has_stories: Boolean(next.personalStories), has_linkedin_url: Boolean(next.linkedinUrl) });
  renderProfile(next);
}

$('profile-form').addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    saveAbout();
    setMessage($('profile-message'), 'Saved.');
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  }
});

$('my-linkedin-file').addEventListener('change', async () => {
  const file = $('my-linkedin-file').files[0];
  if (!file) return;
  setMessage($('profile-message'), 'Reading your LinkedIn PDF...');
  try {
    const text = (await pdfText(file)).slice(0, MAX_DOC_CHARS);
    const next = loadProfile();
    next.linkedinText = text;
    saveProfile(next);
    track('linkedin pdf added', { whose: 'mine' });
    renderProfile(next);
    setMessage($('profile-message'), aboutDirty ? 'Unsaved changes.' : '');
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  } finally {
    $('my-linkedin-file').value = '';
  }
});

$('my-linkedin-remove').addEventListener('click', () => {
  try {
    const next = loadProfile();
    next.linkedinText = '';
    saveProfile(next);
    renderProfile(next);
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  }
});

// ---------- Continue to prep ----------

// Saves unsaved "About you" changes before leaving, so nothing typed is lost.
$('continue').addEventListener('click', (event) => {
  if (!profile.resumes.length) {
    event.preventDefault();
    return;
  }
  if (!aboutDirty) return;
  event.preventDefault();
  try {
    saveAbout();
    location.href = '/';
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  }
});

window.addEventListener('beforeunload', (event) => {
  if (aboutDirty) event.preventDefault();
});

// ---------- Start ----------

importLocalDataOnce().then((imported) => {
  renderProfile(loadProfile());
  if (imported) {
    setMessage($('resume-message'), `Moved your saved profile into this browser (${imported.resumes} resume${imported.resumes === 1 ? '' : 's'}).`);
  }
});
