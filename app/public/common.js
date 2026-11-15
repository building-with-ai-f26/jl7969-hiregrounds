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

// Marks the current page in the header navigation.
for (const link of document.querySelectorAll('.site-nav a')) {
  if (link.dataset.page === document.body.dataset.page) link.setAttribute('aria-current', 'page');
}
