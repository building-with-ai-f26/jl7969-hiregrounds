// Change the model here. This is the only place it is set.
// Browse options at https://openrouter.ai/models
module.exports = {
  MODEL: 'google/gemini-2.5-flash-lite',

  // USD per 1M tokens. Only used as a fallback estimate if OpenRouter does not
  // report the actual cost. Update these if you change MODEL.
  PRICE_PER_MILLION: { input: 0.1, output: 0.4 },

  MAX_EMAIL_WORDS: 120,
};
