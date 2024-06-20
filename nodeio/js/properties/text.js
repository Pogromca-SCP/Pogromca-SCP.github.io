// @ts-check
import { NO_FLAGS, Property } from "../properties.js";

/**
 * @param {string} x
 * @param {null | number} maxLength
 */
const processText = (x, maxLength) => {
  if (maxLength !== null && x.length > maxLength) {
    x = maxLength < 1 ? "" : x.substring(0, maxLength);
  }

  return x;
};

/** @extends Property<string> */
export default class TextProperty extends Property {
  /**
   * @type {null | number}
   * @readonly
   */
  #maxLength;

  /**
   * @param {string} defaultValue
   * @param {null | number} maxLength
   * @param {number} metaflags
   */
  constructor(defaultValue = "", maxLength = null, metaflags = NO_FLAGS) {
    super(processText(defaultValue, maxLength), metaflags);
    this.#maxLength = maxLength;
  }

  getMaxLength() {
    return this.#maxLength;
  }

  /** @param {string} x */
  toString(x) {
    return x;
  }

  /** @param {string} x */
  processValue(x) {
    return processText(x, this.#maxLength);
  }

  copy() {
    const cp = new TextProperty(this.getDefaultValue(), this.getMaxLength(), this.getMetaflags());
    cp.transientUpdate(this.getValue());
    return cp;
  }
}