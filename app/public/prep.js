// Coffee chat prep page: who you're meeting, tone, Generate, and results.
let profile = null;

wireOpenButton($('their-linkedin-url'), $('open-their-linkedin'));

function renderResumeSelect(next) {
  profile = next;
  const select = $('resume-select');
  select.replaceChildren(...profile.resumes.map((r) => new Option(r.name, r.id, false, r.id === profile.activeResumeId)));
}

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
    track('linkedin pdf added', { whose: 'theirs' });
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

// ---------- Tone ----------

function setTone(value) {
  $('tone').value = value;
  updateToneChips();
  $('tone-feedback').hidden = true;
  $('tone').focus();
}

function updateToneChips() {
  const current = $('tone').value.trim().toLowerCase();
  for (const chip of $('tone-chips').children) chip.classList.toggle('active', chip.textContent.toLowerCase() === current);
}

api('/api/tones')
  .then(({ suggestions }) => {
    $('tone-chips').replaceChildren(...suggestions.map((t) => chipButton(t, () => setTone(t))));
    updateToneChips();
  })
  .catch(() => {});

$('tone').addEventListener('input', () => {
  updateToneChips();
  $('tone-feedback').hidden = true;
});

function showToneFeedback(feedback) {
  $('tone-feedback-text').textContent = feedback.reason || "That tone may not land well in a networking chat.";
  $('tone-feedback-chips').replaceChildren(...(feedback.suggestions || []).map((t) => chipButton(t, () => setTone(t))));
  $('tone-feedback').hidden = false;
  $('tone-feedback').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ---------- Results ----------

const segmentsText = (segments) => segments.map((s) => s.text).join('');

function addCard({ title, text, list, segments, legend, note, noteIsError }) {
  if (segments) text = segmentsText(segments);
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
      track('output copied', { section: title });
    } catch {
      copy.textContent = 'Copy failed';
    }
    setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
  });
  head.append(heading, copy);
  card.append(head);

  if (list) {
    const ol = document.createElement('ol');
    ol.className = 'ph-no-capture';
    for (const item of list) {
      const li = document.createElement('li');
      li.textContent = item;
      ol.append(li);
    }
    card.append(ol);
  } else if (segments) {
    if (legend) {
      const legendEl = document.createElement('p');
      legendEl.className = 'card-legend';
      const swatch = document.createElement('span');
      swatch.className = 'legend-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      legendEl.append(swatch, legend);
      card.append(legendEl);
    }
    const body = document.createElement('p');
    body.className = 'card-body ph-no-capture';
    for (const segment of segments) {
      if (segment.added) {
        const mark = document.createElement('mark');
        mark.className = 'tone-added';
        mark.title = 'Added for tone or flow. Not a fact from your inputs.';
        mark.textContent = segment.text;
        body.append(mark);
      } else {
        body.append(document.createTextNode(segment.text));
      }
    }
    card.append(body);
  } else {
    const body = document.createElement('p');
    body.className = 'card-body ph-no-capture';
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
    location.href = '/profile?setup=1';
    return;
  }
  const button = $('generate');
  button.disabled = true;
  button.classList.add('is-loading');
  setMessage($('generate-message'), 'Generating. This can take up to 30 seconds.');
  const startedAt = Date.now();
  const usedTheirLinkedin = Boolean($('their-linkedin-text').value.trim());
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
    const legendFor = (segments) => {
      const count = segments.filter((s) => s.added).length;
      const base = `Tone: ${result.tone}. `;
      return count
        ? `${base}Highlighted text was added for tone or flow. It isn't a fact from your resume, stories, or LinkedIn. The AI labels these, so give it a quick read.`
        : `${base}No added phrases were flagged. The AI labels these, so give it a quick read.`;
    };
    addCard({ title: 'Tell me about yourself: 1 minute', segments: result.tmay_1min, legend: legendFor(result.tmay_1min) });
    addCard({ title: 'Tell me about yourself: 2 minutes', segments: result.tmay_2min, legend: legendFor(result.tmay_2min) });
    $('results').hidden = false;
    setMessage($('generate-message'), '');
    track('prep generated', {
      duration_ms: Date.now() - startedAt,
      resume_count: profile.resumes.length,
      used_their_linkedin_pdf: usedTheirLinkedin,
      email_words: result.email_words,
      email_over_limit: result.email_over_limit,
      tone_kind: result.tone_kind,
      added_phrases_1min: result.tmay_1min.filter((s) => s.added).length,
      added_phrases_2min: result.tmay_2min.filter((s) => s.added).length,
    });
    $('results').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    if (err.body && err.body.tone_feedback) {
      track('tone pushed back', {});
      showToneFeedback(err.body.tone_feedback);
      setMessage($('generate-message'), 'Pick a different tone to continue. Nothing was generated.', true);
      return;
    }
    track('prep generation failed', { duration_ms: Date.now() - startedAt });
    setMessage($('generate-message'), err.message, true);
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
  }
});

// ---------- Start ----------

// New users set up their profile first.
api('/api/profile')
  .then(({ profile: loaded }) => {
    if (!loaded.resumes.length) {
      location.replace('/profile?setup=1');
      return;
    }
    renderResumeSelect(loaded);
  })
  .catch((err) => setMessage($('generate-message'), err.message, true));
