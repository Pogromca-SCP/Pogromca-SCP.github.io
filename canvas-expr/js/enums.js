// @ts-check

/** @enum {number} */
export const tokenTypes = {
  // Operators
  /** @readonly */
  equal: 0,
  /** @readonly */
  plus: 1,
  /** @readonly */
  minus: 2,
  /** @readonly */
  star: 3,
  /** @readonly */
  slash: 4,
  /** @readonly */
  exp: 5,
  /** @readonly */
  modulo: 6,
  /** @readonly */
  less: 7,
  /** @readonly */
  greater: 8,
  /** @readonly */
  lessEqual: 9,
  /** @readonly */
  greaterEqual: 10,
  /** @readonly */
  equalEqual: 11,
  /** @readonly */
  bangEqual: 12,
  /** @readonly */
  and: 13,
  /** @readonly */
  or: 14,
  /** @readonly */
  bang: 15,
  /** @readonly */
  leftParen: 16,
  /** @readonly */
  rightParen: 17,
  /** @readonly */
  semicolon: 18,
  /** @readonly */
  comma: 19,

  // Literals
  /** @readonly */
  number: 20,
  /** @readonly */
  identifier: 21,

  // Technical
  /** @readonly */
  error: 22,
  /** @readonly */
  end: 23,
};

/** @enum {number} */
export const opCodes = {
  /** @readonly */
  constant: 0,
  /** @readonly */
  pop: 1,
  /** @readonly */
  get: 2,
  /** @readonly */
  set: 3,
  /** @readonly */
  equal: 4,
  /** @readonly */
  greater: 5,
  /** @readonly */
  less: 6,
  /** @readonly */
  add: 7,
  /** @readonly */
  subtract: 8,
  /** @readonly */
  multiply: 9,
  /** @readonly */
  divide: 10,
  /** @readonly */
  not: 11,
  /** @readonly */
  negate: 12,
  /** @readonly */
  call: 13,
  /** @readonly */
  exp: 14,
  /** @readonly */
  mod: 15,
  /** @readonly */
  and: 16,
  /** @readonly */
  or: 17,
  /** @readonly */
  getFunc: 18,
  /** @readonly */
  getInput: 19,
};

/** @enum {number} */
export const precedenceLevels = {
  /** @readonly */
  none: 0,
  /** @readonly */
  assignment: 1,
  /** @readonly */
  or: 2,
  /** @readonly */
  and: 3,
  /** @readonly */
  equality: 4,
  /** @readonly */
  comparison: 5,
  /** @readonly */
  term: 6,
  /** @readonly */
  factor: 7,
  /** @readonly */
  exp: 8,
  /** @readonly */
  unary: 9,
  /** @readonly */
  call: 10,
  /** @readonly */
  primary: 11,
};