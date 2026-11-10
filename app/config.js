// Change the model here. This is the only place it is set.
// Options include 'claude-opus-5-5' (best writing) and 'claude-haiku-5-5' (cheapest).
// If you change MODEL, also update PRICE_PER_MILLION so the cost log stays accurate.
module.exports = {
  MODEL: 'claude-opus-5-5',

  // How much Claude reasons before answering: 'low', 'medium', or 'high'.
  // Higher can improve quality but costs more and takes longer.
  EFFORT: 'medium',

  // USD per 1M tokens, used to estimate the cost of each generation.
  // Claude Opus 5.5: input 4, output 20. Claude Haiku 5.5: input 0.1, output 0.5.
  PRICE_PER_MILLION: { input: 4, output: 20 },

  MAX_EMAIL_WORDS: 120,
};
