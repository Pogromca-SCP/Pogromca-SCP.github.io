// @ts-check

export const gameStates = {
  /** @readonly */
  initial: 0,
  /** @readonly */
  settings: 1,
  /** @readonly */
  loading: 2,
  /** @readonly */
  question: 3,
  /** @readonly */
  results: 4
};

export const responseCodes = {
  /** @readonly */
  success: 0,
  /** @readonly */
  noResults: 1,
  /** @readonly */
  invalidParameter: 2,
  /** @readonly */
  tokenNotFound: 3,
  /** @readonly */
  tokenEmpty: 4,
  /** @readonly */
  rateLimit: 5
};