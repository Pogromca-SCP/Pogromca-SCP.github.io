// @ts-check

export const NO_FLAGS = 0;
export const ERROR_CLASS = "error";

/**
 * @param {number} flags
 * @param {number} expected
 */
export const hasFlag = (flags, expected) => (flags & expected) !== 0;

/** @param {Event} e */
export const stopDefault = e => e.preventDefault();

/** @param {Event} e */
export const dontPropagate = e => e.stopPropagation();