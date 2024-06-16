// @ts-check
import { NO_FLAGS, Property } from "../properties.js";

export const INTEGER = 1;
export const UNSIGNED = 2;
export const ALLOW_NAN = 4;

/**
 * @param {number} x
 * @param {null | number} min
 * @param {null | number} max
 */
const clamp = (x, min, max) => {
  if (min !== null && x < min) {
    return min;
  }

  if (max !== null && x > max) {
    return max;
  }

  return x;
};

/**
 * @param {number} x
 * @param {number} flags
 */
const applyFlags = (x, flags) => {
  if ((flags & INTEGER) !== 0) {
    x = Math.trunc(x);
  }

  if ((flags & UNSIGNED) !== 0) {
    x = Math.abs(x);
  }

  if ((flags & ALLOW_NAN) === 0 && Number.isNaN(x)) {
    x = 0;
  }

  return x;
};

/**
 * @param {number} x
 * @param {number} flags
 * @param {null | number} min
 * @param {null | number} max
 */
const processNumber = (x, flags, min, max) => {
  x = clamp(x, min, max);
  x = applyFlags(x, flags);
  return x;
};

/** @extends Property<number> */
export class NumberProperty extends Property {
  /**
   * @type {number}
   * @readonly
   */
  #flags;
  /**
   * @type {null | number}
   * @readonly
   */
  #min;
  /**
   * @type {null | number}
   * @readonly
   */
  #max;

  /**
   * @param {number} defaultValue
   * @param {number} flags
   * @param {null | number} minValue
   * @param {null | number} maxValue
   * @param {number} metaflags
   */
  constructor(defaultValue = 0, flags = 0, minValue = null, maxValue = null, metaflags = NO_FLAGS) {
    super(processNumber(defaultValue, flags, minValue, maxValue), metaflags);
    this.#flags = flags;
    this.#min = minValue;
    this.#max = maxValue;
  }

  getInputType() {
    return "number";
  }

  /** @param {number} x */
  toString(x) {
    return x.toString();
  }

  /** @param {string} x */
  processValue(x) {
    return processNumber(parseFloat(x), this.#flags, this.#min, this.#max);
  }

  getFlags() {
    return this.#flags;
  }

  getMinValue() {
    return this.#min;
  }

  getMaxValue() {
    return this.#max;
  }

  inc() {
    if (this.isReadonly()) {
      return;
    }

    this.setValue((this.getValue() + 1).toString());
  }

  dec() {
    if (this.isReadonly()) {
      return;
    }

    this.setValue((this.getValue() - 1).toString());
  }

  copy() {
    const cp = new NumberProperty(this.getDefaultValue(), this.getFlags(), this.getMinValue(), this.getMaxValue(), this.getMetaflags());
    cp.transientUpdate(this.getValue());
    return cp;
  }
}