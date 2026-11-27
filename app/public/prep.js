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
  setMessage($('generate-message'), 'Reading their LinkedIn PDF...');
  try {
    $('their-linkedin-text').value = await pdfText(file);
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

// Up to maxTones tones, kept in the tone field as a comma-separated list, e.g. "Warm, Curious".
let maxTones = 3;
let toneSuggestions = [];
const sameTone = (a, b) => a.toLowerCase() === b.toLowerCase();
const toneItems = () => $('tone').value.split(',').map((t) => t.trim()).filter(Boolean);
const setToneItems = (items) => { $('tone').value = items.join(', '); };

// Clicking a chip adds or removes that tone, up to the limit.
function toggleTone(value) {
  const items = toneItems();
  const index = items.findIndex((t) => sameTone(t, value));
  if (index >= 0) items.splice(index, 1);
  else if (items.length < maxTones) items.push(value);
  setToneItems(items);
  updateToneChips();
  $('tone-feedback').hidden = true;
}

// A suggested alternative after pushback replaces the typed tones and keeps any chips already picked.
function useAlternative(value) {
  const kept = toneItems().filter((t) => toneSuggestions.some((s) => sameTone(s, t)) && !sameTone(t, value));
  setToneItems([...kept.slice(0, maxTones - 1), value]);
  updateToneChips();
  $('tone-feedback').hidden = true;
  $('tone').focus();
}

function updateToneChips() {
  const items = toneItems();
  const full = items.length >= maxTones;
  for (const chip of $('tone-chips').children) {
    const on = items.some((t) => sameTone(t, chip.textContent));
    chip.classList.toggle('active', on);
    chip.setAttribute('aria-pressed', String(on));
    chip.disabled = full && !on;
  }
  const over = items.length > maxTones;
  $('tone-count').textContent = over
    ? `That's ${items.length} tones. Pick up to ${maxTones}.`
    : items.length
      ? `${items.length} of ${maxTones} selected${full ? '. Remove one to pick another.' : ''}`
      : `Pick up to ${maxTones}.`;
  $('tone-count').classList.toggle('error', over);
}

api('/api/tones')
  .then(({ suggestions, maxTones: limit }) => {
    toneSuggestions = suggestions;
    if (limit) maxTones = limit;
    $('tone-chips').replaceChildren(...suggestions.map((t) => chipButton(t, () => toggleTone(t))));
    updateToneChips();
  })
  .catch(() => {});

$('tone').addEventListener('input', () => {
  updateToneChips();
  $('tone-feedback').hidden = true;
});

function showToneFeedback(feedback) {
  $('tone-feedback-text').textContent = feedback.reason || "That tone may not land well in a networking chat.";
  $('tone-feedback-chips').replaceChildren(...(feedback.suggestions || []).map((t) => chipButton(t, () => useAlternative(t))));
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
  if (toneItems().length > maxTones) {
    setMessage($('generate-message'), `Pick up to ${maxTones} tones.`, true);
    $('tone').focus();
    return;
  }
  const button = $('generate');
  button.disabled = true;
  button.classList.add('is-loading');
  setMessage($('generate-message'), 'Generating. This can take up to 30 seconds.');
  const startedAt = Date.now();
  const usedTheirLinkedin = Boolean($('their-linkedin-text').value.trim());
  try {
    // Your profile lives in this browser, so the chosen resume and profile text go with the request.
    const fresh = loadProfile();
    const resume = fresh.resumes.find((r) => r.id === $('resume-select').value) || fresh.resumes[0];
    if (!resume) throw new Error('Add a resume to your profile first.');
    const fields = Object.fromEntries(new FormData(event.target));
    delete fields.resumeId;
    const result = await api('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...fields,
        resumeText: resume.text,
        personalStories: fresh.personalStories,
        myLinkedinText: fresh.linkedinText,
        targetRoles: fresh.targetRoles,
        careerGoal: fresh.careerGoal,
      }),
    });
    // Remember the chosen resume so it's selected next time.
    if (fresh.activeResumeId !== resume.id) {
      fresh.activeResumeId = resume.id;
      try { saveProfile(fresh); } catch { /* not critical */ }
    }
    $('overlap').textContent = result.overlap_assessment;
    $('cards').replaceChildren();
    addCard({
      title: 'Outreach Email',
      text: result.outreach_email,
      note: result.email_over_limit
        ? `${result.email_words} words, which is over the 120-word limit. Trim before sending.`
        : `${result.email_words} words`,
      noteIsError: result.email_over_limit,
    });
    addCard({ title: '5 Questions to Ask', list: result.questions });
    const legendFor = (segments) => {
      const count = segments.filter((s) => s.added).length;
      const base = `Tone: ${result.tone}. `;
      return count
        ? `${base}Highlighted text was added for tone or flow. It isn't a fact from your resume, stories, or LinkedIn. The AI labels these, so give it a quick read.`
        : `${base}No added phrases were flagged. The AI labels these, so give it a quick read.`;
    };
    addCard({ title: 'Tell Me About Yourself: 1 Minute', segments: result.tmay_1min, legend: legendFor(result.tmay_1min) });
    addCard({ title: 'Tell Me About Yourself: 2 Minutes', segments: result.tmay_2min, legend: legendFor(result.tmay_2min) });
    $('results').hidden = false;
    showTrackerCta();
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

// ---------- Coffee chat tracker ----------

// Arriving from the tracker (/?chat=<id>) fills in that person's details.
function prefillFromTracker(chatId) {
  try {
    const chat = loadChats().find((c) => c.id === chatId);
    if (!chat) return;
    const f = $('contact-form');
    f.elements.name.value = chat.name;
    f.elements.role.value = chat.role || '';
    f.elements.company.value = chat.company || '';
    f.elements.connection.value = chat.howConnected || '';
    f.elements.notes.value = chat.notes || '';
    $('their-linkedin-url').value = chat.linkedinUrl || '';
    $('their-linkedin-url').dispatchEvent(new Event('input'));
    $('chat-id').value = chat.id;
    $('from-tracker').textContent = `Prepping for ${chat.name} from your coffee chat tracker. Check the details below, then generate.`;
    $('from-tracker').hidden = false;
  } catch {
    // The form still works if the tracker can't be read.
  }
}

// After generating, offer to save this person to the tracker (or link to them if already there).
function showTrackerCta() {
  const inTracker = Boolean($('chat-id').value);
  $('tracker-cta-text').textContent = inTracker
    ? 'This person is in your coffee chat tracker. Update their status or notes there after your chat.'
    : 'Keep track of this person: save them to your coffee chat tracker.';
  $('add-to-tracker').hidden = inTracker;
  $('open-in-tracker').hidden = !inTracker;
  if (inTracker) $('open-in-tracker').href = `/chats?open=${encodeURIComponent($('chat-id').value)}`;
  $('tracker-cta').hidden = false;
}

$('add-to-tracker').addEventListener('click', () => {
  const f = $('contact-form');
  const button = $('add-to-tracker');
  button.disabled = true;
  try {
    const chats = loadChats();
    if (chats.length >= MAX_CHATS) throw new Error('Your tracker is full (1,000 people). Delete some to add more.');
    const chat = buildChat({
      name: f.elements.name.value,
      role: f.elements.role.value,
      company: f.elements.company.value,
      linkedinUrl: $('their-linkedin-url').value,
      howConnected: f.elements.connection.value,
      notes: f.elements.notes.value,
      status: 'To reach out',
    });
    saveChats([...chats, chat]);
    $('chat-id').value = chat.id;
    track('chat added', { status: 'To reach out', from: 'prep page' });
    showTrackerCta();
    $('tracker-cta-text').textContent = `Added ${chat.name} to your coffee chat tracker.`;
  } catch (err) {
    $('tracker-cta-text').textContent = err.message;
  } finally {
    button.disabled = false;
  }
});

// ---------- Start ----------

// New users set up their profile first. Your profile is read from this browser.
importLocalDataOnce().then(() => {
  const loaded = loadProfile();
  if (!loaded.resumes.length) {
    location.replace('/profile?setup=1');
    return;
  }
  renderResumeSelect(loaded);
  const chatId = new URLSearchParams(location.search).get('chat');
  if (chatId) prefillFromTracker(chatId);
});
