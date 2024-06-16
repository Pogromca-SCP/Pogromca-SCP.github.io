// @ts-check
import { doAction } from "../history.js";
import { ChangePropertyAction, NO_FLAGS, Property } from "../properties.js";

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
export class TextProperty extends Property {
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

const NAME_MAX_LENGTH = 50;
const namePattern = /^[a-zA-Z_0-9]+$/;

/** @extends Property<string> */
export class NameProperty extends Property {
  /** @param {string} value */
  constructor(value) {
    super("", NO_FLAGS);
    value = this.processValue(value);

    if (namePattern.test(value)) {
      this.transientUpdate(value);
    }
  }

  /** @param {string} x */
  toString(x) {
    return x;
  }

  /** @param {string} x */
  processValue(x) {
    return processText(x, NAME_MAX_LENGTH);
  }

  /** @param {string} newValue */
  setValue(newValue) {
    const val = this.processValue(newValue);
    const oldVal = this.getValue();

    if (!namePattern.test(val)) {
      this.transientUpdate(oldVal);
      return;
    }

    if (oldVal === val) {
      this.transientUpdate(val);
      return;
    }

    doAction(new ChangePropertyAction(this, oldVal, val));
  }

  copy() {
    return new NameProperty(this.getValue());
  }
}