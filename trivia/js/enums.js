// @ts-check

export const gameStates = {
  initial: 0,
  settings: 1,
  loading: 2,
  question: 3,
  results: 4,
  ending: 5
};

export const responseCodes = {
  success: 0,
  noResults: 1,
  invalidParameter: 2,
  tokenNotFound: 3,
  tokenEmpty: 4,
  rateLimit: 5
};