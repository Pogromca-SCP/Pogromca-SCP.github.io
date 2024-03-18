/**
 * @typedef {(() => number) | ((x: number) => number) | ((x: number, y: number) => number) | ((x: number, y: number, z: number) => number)}  StdFuncBody
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

const stdFunctions = {
    rand: makeStdFunction(() => Math.random(), 0),
    
    /** @param {number} x */
    sin: makeStdFunction((x) => Math.sin(x), 1),

    /** @param {number} x */
    cos: makeStdFunction((x) => Math.cos(x), 1),

    /** @param {number} x */
    tan: makeStdFunction((x) => Math.tan(x), 1),

    /** @param {number} x */
    asin: makeStdFunction((x) => Math.asin(x), 1),

    /** @param {number} x */
    acos: makeStdFunction((x) => Math.acos(x), 1),

    /** @param {number} x */
    atan: makeStdFunction((x) => Math.atan(x), 1),

    /** @param {number} x */
    sqrt: makeStdFunction((x) => Math.sqrt(x), 1),

    /** @param {number} x */
    floor: makeStdFunction((x) => Math.floor(x), 1),

    /** @param {number} x */
    ceil: makeStdFunction((x) => Math.ceil(x), 1),

    /** @param {number} x */
    round: makeStdFunction((x) => Math.round(x), 1),

    /** @param {number} x */
    abs: makeStdFunction((x) => Math.abs(x), 1),

    /**
     * @param {number} x
     * @param {number} y
     */
    atan2: makeStdFunction((x, y) => Math.atan2(x, y), 2),

    /**
     * @param {number} x
     * @param {number} y
     */
    min: makeStdFunction((x, y) => Math.min(x, y), 2),

    /**
     * @param {number} x
     * @param {number} y
     */
    max: makeStdFunction((x, y) => Math.max(x, y), 2),

    /**
     * @param {number} cond
     * @param {number} a
     * @param {number} b
     */
    if: makeStdFunction((cond, a, b) => cond < 1 ? b : a, 3),

    /**
     * @param {number} frac
     * @param {number} a
     * @param {number} b
     */
    lerp: makeStdFunction((frac, a, b) => (a * frac + b * (1 - frac)), 3)
};