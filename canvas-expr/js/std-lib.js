// @ts-check

/**
 * @typedef {(...args: number[]) => number}  StdFuncBody
 */

/**
 * @typedef {Object} StdFunction
 * @property {number} arity
 * @property {StdFuncBody} func
 */

/**
 * @param {(() => number) | ((x: number) => number) | ((x: number, y: number) => number) | ((x: number, y: number, z: number) => number)} func
 * @param {number} arity
 * @returns {StdFunction}
 */
const makeStdFunction = (func, arity) => ({
  arity: arity,
  func: func
});

/** @type {Record<string, StdFunction | undefined>} */
const stdFunctions = {
  rand: makeStdFunction(() => Math.random(), 0),
  sin: makeStdFunction(/** @param {number} x */ (x) => Math.sin(x), 1),
  cos: makeStdFunction(/** @param {number} x */ (x) => Math.cos(x), 1),
  tan: makeStdFunction(/** @param {number} x */ (x) => Math.tan(x), 1),
  asin: makeStdFunction(/** @param {number} x */ (x) => Math.asin(x), 1),
  acos: makeStdFunction(/** @param {number} x */ (x) => Math.acos(x), 1),
  atan: makeStdFunction(/** @param {number} x */ (x) => Math.atan(x), 1),
  sqrt: makeStdFunction(/** @param {number} x */ (x) => Math.sqrt(x), 1),
  floor: makeStdFunction(/** @param {number} x */ (x) => Math.floor(x), 1),
  ceil: makeStdFunction(/** @param {number} x */ (x) => Math.ceil(x), 1),
  round: makeStdFunction(/** @param {number} x */ (x) => Math.round(x), 1),
  abs: makeStdFunction(/** @param {number} x */ (x) => Math.abs(x), 1),
  atan2: makeStdFunction(/** @param {number} x @param {number} y */ (x, y) => Math.atan(x === 0 ? 0 : y / x), 2),
  min: makeStdFunction(/** @param {number} x @param {number} y */ (x, y) => Math.min(x, y), 2),
  max: makeStdFunction(/** @param {number} x @param {number} y */ (x, y) => Math.max(x, y), 2),
  if: makeStdFunction(/** @param {number} cond @param {number} a @param {number} b */ (cond, a, b) => cond < 1 ? b : a, 3),
  lerp: makeStdFunction(/** @param {number} frac @param {number} a @param {number} b */ (frac, a, b) => (a * frac + b * (1 - frac)), 3)
};