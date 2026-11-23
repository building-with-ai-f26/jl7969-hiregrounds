// Coffee chat tracker page: people you've met or plan to meet.
let chats = [];
let statuses = [];
let editingChatId = null; // person being edited, or null when adding

// Dates are stored as YYYY-MM-DD calendar days; compare and show them in local time.
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const dayLabel = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: y === new Date().getFullYear() ? undefined : 'numeric' });
};
const slug = (status) => status.toLowerCase().replace(/[^a-z]+/g, '-');

const isUpcoming = (c) => c.status !== 'Completed' && Boolean(c.nextChatDate) && c.nextChatDate >= todayKey();
const needsFollowUp = (c) => c.status === 'Follow-up needed' || (Boolean(c.followUpDate) && c.followUpDate <= todayKey() && c.status !== 'Completed');

function render() {
  $('stat-upcoming').textContent = chats.filter(isUpcoming).length;
  $('stat-followups').textContent = chats.filter(needsFollowUp).length;
  $('stat-completed').textContent = chats.filter((c) => c.status === 'Completed' || c.lastChatDate).length;
  $('stat-total').textContent = chats.length;

  const query = $('search').value.trim().toLowerCase();
  const status = $('status-filter').value;
  const visible = chats.filter((c) => (!status || c.status === status) &&
    (!query || [c.name, c.company, c.role, c.notes, c.howConnected, c.email].join(' ').toLowerCase().includes(query)));

  // Each person appears once, in the first group that fits.
  const upcoming = visible.filter(isUpcoming).sort((a, b) => a.nextChatDate.localeCompare(b.nextChatDate));
  const followUps = visible.filter((c) => !isUpcoming(c) && needsFollowUp(c))
    .sort((a, b) => (a.followUpDate || '9999').localeCompare(b.followUpDate || '9999'));
  const rest = visible.filter((c) => !isUpcoming(c) && !needsFollowUp(c))
    .sort((a, b) => (b.lastChatDate || b.updatedAt).localeCompare(a.lastChatDate || a.updatedAt));

  const groups = [
    ['Upcoming chats', upcoming, 'No upcoming chats scheduled.'],
    ['Needs follow-up', followUps, 'No follow-ups due.'],
    ['Everyone else', rest, chats.length ? 'Nobody else here.' : 'No one yet. Click "Add a person" to start your tracker.'],
  ];
  $('chat-groups').replaceChildren(...groups
    .filter(([, list], i) => list.length || i === 2 || !(query || status))
    .map(([title, list, empty]) => group(title, list, empty)));
}

function group(title, list, emptyText) {
  const section = document.createElement('section');
  section.className = 'chat-group';
  const heading = document.createElement('h2');
  heading.className = 'group-title';
  heading.textContent = `${title} `;
  const count = document.createElement('span');
  count.className = 'group-count';
  count.textContent = list.length;
  heading.append(count);
  section.append(heading);
  if (!list.length) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = emptyText;
    section.append(empty);
  }
  for (const chat of list) section.append(chatCard(chat));
  return section;
}

function chatCard(chat) {
  const card = document.createElement('article');
  card.className = 'chat-card ph-no-capture';

  const top = document.createElement('div');
  top.className = 'chat-top';
  const who = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'chat-name';
  name.textContent = chat.name;
  const job = document.createElement('div');
  job.className = 'chat-job';
  job.textContent = [chat.role, chat.company].filter(Boolean).join(' · ') || 'Role and company not added';
  who.append(name, job);
  const badge = document.createElement('span');
  badge.className = `status-badge status-${slug(chat.status)}`;
  badge.textContent = chat.status;
  top.append(who, badge);
  card.append(top);

  const facts = [];
  if (chat.nextChatDate) facts.push(['Next chat', dayLabel(chat.nextChatDate) + (chat.nextChatDate === todayKey() ? ' (today)' : '')]);
  if (chat.lastChatDate) facts.push(['Last chat', dayLabel(chat.lastChatDate)]);
  if (chat.followUpDate) facts.push(['Follow up by', dayLabel(chat.followUpDate) + (chat.followUpDate < todayKey() && chat.status !== 'Completed' ? ' (overdue)' : '')]);
  if (chat.howConnected) facts.push(['Connected via', chat.howConnected]);
  facts.push(['Thank-you', chat.thankYouSent ? 'Sent' : 'Not yet']);
  const dl = document.createElement('dl');
  dl.className = 'chat-facts';
  for (const [label, value] of facts) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dt, dd);
    dl.append(wrap);
  }
  card.append(dl);

  if (chat.notes) {
    const notes = document.createElement('p');
    notes.className = 'chat-notes';
    notes.textContent = chat.notes;
    card.append(notes);
  }

  const actions = document.createElement('div');
  actions.className = 'chat-actions';
  const prep = document.createElement('a');
  prep.className = 'button primary small-link';
  prep.href = `/?chat=${encodeURIComponent(chat.id)}`;
  prep.textContent = 'Prep for this chat';
  prep.addEventListener('click', () => track('prep from tracker', {}));
  actions.append(prep);
  if (chat.email) {
    const mail = document.createElement('a');
    mail.className = 'button secondary small-link';
    mail.href = `mailto:${chat.email}`;
    mail.textContent = 'Email';
    actions.append(mail);
  }
  const href = chat.linkedinUrl ? linkedinHref(chat.linkedinUrl) : '';
  if (href) {
    const li = document.createElement('a');
    li.className = 'button secondary small-link';
    li.href = href;
    li.target = '_blank';
    li.rel = 'noopener noreferrer';
    li.textContent = 'LinkedIn';
    actions.append(li);
  }
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'secondary small';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => openChatEditor(chat));
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'secondary small danger';
  del.textContent = 'Delete';
  del.addEventListener('click', () => deleteChat(chat));
  actions.append(edit, del);
  card.append(actions);
  return card;
}

// ---------- Editor ----------

function openChatEditor(chat = null) {
  editingChatId = chat ? chat.id : null;
  const form = $('chat-editor');
  form.reset();
  $('chat-editor-title').textContent = chat ? `Edit ${chat.name}` : 'Add a person';
  if (chat) {
    for (const key of ['name', 'role', 'company', 'email', 'linkedinUrl', 'status', 'nextChatDate', 'lastChatDate', 'followUpDate', 'howConnected', 'notes']) {
      form.elements[key].value = chat[key] || '';
    }
    form.elements.thankYouSent.checked = Boolean(chat.thankYouSent);
  }
  setMessage($('chat-editor-message'), '');
  form.hidden = false;
  $('add-chat').hidden = true;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('chat-name').focus({ preventScroll: true });
}

function closeChatEditor() {
  editingChatId = null;
  $('chat-editor').hidden = true;
  $('add-chat').hidden = false;
}

$('add-chat').addEventListener('click', () => openChatEditor());
$('chat-cancel').addEventListener('click', closeChatEditor);

$('chat-editor').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const body = Object.fromEntries(new FormData(form));
  body.thankYouSent = form.elements.thankYouSent.checked;
  try {
    const wasEditing = Boolean(editingChatId);
    const current = loadChats();
    let saved;
    if (wasEditing) {
      const index = current.findIndex((c) => c.id === editingChatId);
      if (index < 0) throw new Error('That person is no longer in your tracker. Refresh the page.');
      saved = buildChat(body, current[index]);
      current[index] = saved;
    } else {
      if (current.length >= MAX_CHATS) throw new Error('Your tracker is full (1,000 people). Delete some to add more.');
      saved = buildChat(body);
      current.push(saved);
    }
    chats = saveChats(current);
    track(wasEditing ? 'chat updated' : 'chat added', { status: saved.status, has_email: Boolean(saved.email), has_linkedin: Boolean(saved.linkedinUrl) });
    closeChatEditor();
    render();
    setMessage($('chats-message'), wasEditing ? 'Saved.' : `Added ${saved.name}.`);
  } catch (err) {
    setMessage($('chat-editor-message'), err.message, true);
  }
});

function deleteChat(chat) {
  if (!window.confirm(`Delete ${chat.name} from your tracker? This can't be undone.`)) return;
  try {
    chats = saveChats(loadChats().filter((c) => c.id !== chat.id));
    track('chat deleted', {});
    render();
    setMessage($('chats-message'), `Deleted ${chat.name}.`);
  } catch (err) {
    setMessage($('chats-message'), err.message, true);
  }
}

$('search').addEventListener('input', render);
$('status-filter').addEventListener('change', render);

// ---------- Start ----------

// The tracker is read from this browser.
importLocalDataOnce().then((imported) => {
  chats = loadChats();
  statuses = CHAT_STATUSES;
  $('status-filter').append(...statuses.map((s) => new Option(s, s)));
  $('chat-status').replaceChildren(...statuses.map((s) => new Option(s, s)));
  render();
  if (imported && imported.chats) setMessage($('chats-message'), `Moved ${imported.chats} saved ${imported.chats === 1 ? 'person' : 'people'} into this browser.`);
  // Arriving from the prep page's "Open in your tracker" opens that person.
  const openId = new URLSearchParams(location.search).get('open');
  const chat = openId && chats.find((c) => c.id === openId);
  if (chat) openChatEditor(chat);
});
