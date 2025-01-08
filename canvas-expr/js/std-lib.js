// @ts-check

/**
 * @callback StdFuncBody
 * @param {...number} args
 * @returns {number}
 * 
 * @typedef {object} StdFunction
 * @property {number} arity
 * @property {StdFuncBody} func
 */

/**
 * @param {StdFuncBody} func
 * @param {number} arity
 */
const makeStdFunction = (func, arity) => ({
  arity: arity,
  func: func,
});

/** @type {Readonly<Record<string, Readonly<StdFunction>>>} */
const stdFunctions = {
  rand: makeStdFunction(() => Math.random(), 0),
  sin: makeStdFunction(x => Math.sin(x), 1),
  cos: makeStdFunction(x => Math.cos(x), 1),
  tan: makeStdFunction(x => Math.tan(x), 1),
  asin: makeStdFunction(x => Math.asin(x), 1),
  acos: makeStdFunction(x => Math.acos(x), 1),
  atan: makeStdFunction(x => Math.atan(x), 1),
  sqrt: makeStdFunction(x => Math.sqrt(x), 1),
  floor: makeStdFunction(x => Math.floor(x), 1),
  ceil: makeStdFunction(x => Math.ceil(x), 1),
  round: makeStdFunction(x => Math.round(x), 1),
  abs: makeStdFunction(x => Math.abs(x), 1),
  atan2: makeStdFunction((x, y) => Math.atan(x === 0 ? 0 : y / x), 2),
  min: makeStdFunction((x, y) => Math.min(x, y), 2),
  max: makeStdFunction((x, y) => Math.max(x, y), 2),
  if: makeStdFunction((cond, a, b) => cond === 0 ? b : a, 3),
  lerp: makeStdFunction((frac, a, b) => (a * frac + b * (1 - frac)), 3),
};

export default stdFunctions;