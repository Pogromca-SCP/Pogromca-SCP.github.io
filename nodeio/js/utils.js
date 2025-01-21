// @ts-check

export const NO_FLAGS = 0;
export const ERROR_CLASS = "error";

/**
 * @param {number} flags
 * @param {number} expected
 */
export const hasFlag = (flags, expected) => (flags & expected) !== 0;