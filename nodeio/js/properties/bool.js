// @ts-check
import { doAction } from "../history.js";
import { NO_FLAGS, Property } from "../properties.js";

class ChangeBooleanPropertyAction {
  /**
   * @type {BooleanProperty}
   * @readonly
   */
  #target;
  /**
   * @type {boolean}
   * @readonly
   */
  #newValue;

  /**
   * @param {BooleanProperty} target
   * @param {boolean} newValue
   */
  constructor(target, newValue) {
    this.#target = target;
    this.#newValue = newValue;
  }

  do() {
    this.#target.transientUpdate(this.#newValue);
  }

  undo() {
    this.#target.transientUpdate(!this.#newValue);
  }
}

/** @extends Property<boolean> */
export default class BooleanProperty extends Property {
  constructor(defaultValue = false, metaflags = NO_FLAGS) {
    super(defaultValue, metaflags);
  }

  getInputType() {
    return "checkbox";
  }

  /** @param {boolean} x */
  toString(x) {
    return x ? "on" : "";
  }

  /** @param {string} x */
  processValue(x) {
    return x.length > 0;
  }

  /** @param {string} newValue */
  setValue(newValue) {
    if (this.isReadonly()) {
      return;
    }

    const val = this.processValue(newValue);

    if (this.isTransient() || this.getValue() === val) {
      this.transientUpdate(val);
      return;
    }

    doAction(new ChangeBooleanPropertyAction(this, val));
  }

  toggle() {
    if (this.isReadonly()) {
      return;
    }

    this.setValue(this.getValue() ? "" : "on");
  }

  copy() {
    const cp = new BooleanProperty(this.getDefaultValue(), this.getMetaflags());
    cp.transientUpdate(this.getValue());
    return cp;
  }
}