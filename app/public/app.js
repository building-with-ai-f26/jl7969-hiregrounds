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
  if (!response.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
}

function showProfile(profile) {
  $('resume-text').value = profile.resumeText;
  $('personal-stories').value = profile.personalStories;
  const saved = new Date(profile.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  $('profile-status').textContent = `Saved ${saved}`;
  $('profile-section').open = false;
}

api('/api/profile')
  .then(({ profile }) => { if (profile) showProfile(profile); })
  .catch((err) => setMessage($('profile-message'), err.message, true));

$('profile-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('save-profile');
  button.disabled = true;
  setMessage($('profile-message'), 'Saving...');
  try {
    const { profile } = await api('/api/profile', { method: 'POST', body: new FormData(event.target) });
    $('resume-file').value = '';
    setMessage($('profile-message'), '');
    showProfile(profile);
  } catch (err) {
    setMessage($('profile-message'), err.message, true);
  } finally {
    button.disabled = false;
  }
});

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
  } catch (err) {
    setMessage($('generate-message'), err.message, true);
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
  }
});
