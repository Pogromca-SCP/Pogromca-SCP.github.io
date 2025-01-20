// @ts-check

export const NO_FLAGS = 0;

/**
 * @param {number} flags
 * @param {number} expected
 */
export const hasFlag = (flags, expected) => (flags & expected) !== 0;