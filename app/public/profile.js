// Profile page: resumes, personal stories, and your LinkedIn.
let profile = null;
let editingId = null; // resume being edited, or null when adding
let replacingId = null; // resume whose PDF is being replaced
let aboutDirty = false; // unsaved changes in "About you"

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
    ? 'Your profile is saved. You can come back and edit it anytime.'
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
  const form = new FormData(event.target);
  if (!$('editor-file').files.length) form.delete('resumeFile');
  button.disabled = true;
  setMessage($('editor-message'), 'Saving...');
  try {
    const wasEditing = Boolean(editingId);
    const usedPdf = form.has('resumeFile');
    const url = editingId ? `/api/resumes/${encodeURIComponent(editingId)}` : '/api/resumes';
    const { profile: next } = await api(url, { method: editingId ? 'PUT' : 'POST', body: form });
    track(wasEditing ? 'resume updated' : 'resume added', { source: usedPdf ? 'pdf' : 'text', resume_count: next.resumes.length });
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
  const form = new FormData();
  form.append('resumeFile', file);
  setMessage($('resume-message'), 'Replacing...');
  try {
    const { profile: next } = await api(`/api/resumes/${encodeURIComponent(replacingId)}`, { method: 'PUT', body: form });
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

async function deleteResume(resume) {
  if (!window.confirm(`Delete "${resume.name}"? This can't be undone.`)) return;
  try {
    const { profile: next } = await api(`/api/resumes/${encodeURIComponent(resume.id)}`, { method: 'DELETE' });
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

async function saveAbout() {
  const { profile: next } = await api('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personalStories: $('personal-stories').value, linkedinUrl: $('my-linkedin-url').value }),
  });
  aboutDirty = false;
  track('profile saved', { has_stories: Boolean(next.personalStories), has_linkedin_url: Boolean(next.linkedinUrl) });
  renderProfile(next);
}

$('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('save-profile');
  button.disabled = true;
  setMessage($('profile-message'), 'Saving...');
  try {
    await saveAbout();
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
    track('linkedin pdf added', { whose: 'mine' });
    renderProfile(next);
    setMessage($('profile-message'), aboutDirty ? 'Unsaved changes.' : '');
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  } finally {
    $('my-linkedin-file').value = '';
  }
});

$('my-linkedin-remove').addEventListener('click', async () => {
  try {
    const { profile: next } = await api('/api/profile/linkedin', { method: 'DELETE' });
    renderProfile(next);
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  }
});

// ---------- Continue to prep ----------

// Saves unsaved "About you" changes before leaving, so nothing typed is lost.
$('continue').addEventListener('click', async (event) => {
  if (!profile || !profile.resumes.length) {
    event.preventDefault();
    return;
  }
  if (!aboutDirty) return;
  event.preventDefault();
  try {
    await saveAbout();
    location.href = '/';
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  }
});

window.addEventListener('beforeunload', (event) => {
  if (aboutDirty) event.preventDefault();
});

api('/api/profile')
  .then(({ profile: loaded }) => renderProfile(loaded))
  .catch((err) => setMessage($('resume-message'), err.message, true));
