// PostHog analytics for the local app (pageviews, clicks, named events, and session replay).
// The project key below is public by design: it can only send events, not read them.
// Privacy: session replay masks every input and all page text, and resume cards and AI output carry
// the ph-no-capture class, so resumes, contact details, and generated text never reach PostHog.
const POSTHOG_KEY = 'phc_mHZGGXmxQTV7pm5NhcLViUZhhSwX3MmhA59ZrgvjwDym';
const POSTHOG_HOST = 'https://us.i.posthog.com';

if (window.posthog && typeof window.posthog.init === 'function') {
  window.posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-08-30',
    session_recording: { maskAllInputs: true, maskTextSelector: '*' },
  });
}

// Sends a named event. Does nothing if PostHog didn't load (for example, offline).
window.track = function track(event, properties) {
  try {
    if (window.posthog && typeof window.posthog.capture === 'function') window.posthog.capture(event, properties);
  } catch {
    // Analytics must never break the app.
  }
};
