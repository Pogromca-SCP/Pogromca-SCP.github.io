// @ts-check
import { doAction } from "./history.js";

const props = /** @type {HTMLDivElement} */ (document.getElementById("properties"));
/** @type {Property[]} */
let showedProps = [];

/** @template T */
class ChangePropertyAction {
  /** @type {Property<T>} */
  #target;
  /** @type {T} */
  #oldValue;
  /** @type {T} */
  #newValue;

  /**
   * @param {Property<T>} target
   * @param {T} oldValue
   * @param {T} newValue
   */
  constructor(target, oldValue, newValue) {
    this.#target = target;
    this.#oldValue = oldValue;
    this.#newValue = newValue;
  }

  do() {
    this.#target.transientUpdate(this.#newValue);
  }

  undo() {
    this.#target.transientUpdate(this.#oldValue);
  }
}

/** @template T */
class Property {
  /** @type {boolean} */
  #transient;
  /** @type {boolean} */
  #readonly;
  /** @type {HTMLInputElement | null} */
  #display;
  /** @type {HTMLButtonElement | null} */
  #reset;
  /** @type {T} */
  #value;
  /** @type {T} */
  #default;
  /** @type {((x: T) => void)[]} */
  #listeners;

  /**
   * @param {T} defaultValue
   * @param {boolean} isTransient
   * @param {boolean} isReadonly
   */
  constructor(defaultValue, isTransient, isReadonly) {
    if (this.constructor === Property) {
      throw new Error("Cannot instantiate abstract class 'Property'.");
    }

    this.#transient = isTransient;
    this.#readonly = isReadonly;
    this.#display = null;
    this.#reset = null;
    this.#default = defaultValue;
    this.#value = defaultValue;
    this.#listeners = [];
  }

  isTransient() {
    return this.#transient;
  }

  isReadonly() {
    return this.#readonly;
  }

  getInputType() {
    return "text";
  }

  getValue() {
    return this.#value;
  }

  getDefaultValue() {
    return this.#default;
  }

  /** @param {T} x */
  toString(x) {
    return "";
  }

  /**
   * @param {string} x
   * @returns {T}
   */
  processValue(x) {
    throw new Error("Method 'processValue' is not implemented.");
  }

  /** @param {string} newValue */
  setValue(newValue) {
    if (this.#readonly) {
      return;
    }

    const val = this.processValue(newValue);

    if (this.isTransient() || this.#value === val) {
      this.transientUpdate(val);
      return;
    }

    doAction(new ChangePropertyAction(this, this.#value, val));
  }

  setDefault() {
    if (this.#readonly) {
      return;
    }

    this.setValue(this.toString(this.#default));
  }

  /** @param {T} newValue */
  transientUpdate(newValue) {
    if (this.#readonly) {
      return;
    }

    const notify = this.#value !== newValue;
    this.#value = newValue;
    this.updateDisplay();

    if (notify) {
      for (const listener of this.#listeners) {
        listener(newValue);
      }
    }
  }

  /** @param {(x: T) => void} listener */
  addChangeListener(listener) {
    this.#listeners.push(listener);
  }

  /** @param {(x: T) => void} listener */
  removeChangeListener(listener) {
    this.#listeners = this.#listeners.filter(lis => lis !== listener);
  }

  clearChangeListeners() {
    this.#listeners = [];
  }

  updateDisplay() {
    if (this.#display === null) {
      return;
    }

    const tmp = this.#display.onchange;
    this.#display.onchange = null;
    const value = this.toString(this.#value);

    if (this.#display.type === "checkbox") {
      this.#display.checked = value.length > 0;
    } else {
      this.#display.value = value;
    }
    
    this.#display.onchange = tmp;

    if (this.#reset !== null) {
      this.#reset.hidden = this.#value === this.#default;
    }
  }

  clearDisplay() {
    if (this.#display === null) {
      return;
    }

    this.#display.onchange = null;
    this.#display = null;

    if (this.#reset === null) {
      return;
    }

    this.#reset.onclick = null;
    this.#reset = null;
  }

  /** @param {string} name */
  draw(name) {
    this.clearDisplay();
    const id = `prop-${name}`;
    const element = document.createElement("div");
    const label = document.createElement("label");
    label.innerText = name;
    label.htmlFor = id;
    element.appendChild(label);
    const input = document.createElement("input");
    input.id = id;
    input.type = this.getInputType();
    input.disabled = this.#readonly;
    input.onchange = input.type === "checkbox" ? e => this.setValue(input.checked ? "on" : "") : e => this.setValue(input.value);
    this.#display = input;
    element.appendChild(input);
    
    if (!this.#readonly) {
      const button = document.createElement("button");
      button.innerText = "<";
      button.onclick = e => this.setDefault();
      this.#reset = button;
      element.appendChild(button);
    }

    props.appendChild(element);
    this.updateDisplay();
  }
}

class ChangeBooleanPropertyAction {
  /** @type {BooleanProperty} */
  #target;
  /** @type {boolean} */
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
export class BooleanProperty extends Property {
  constructor(defaultValue = false, isTransient = false, isReadonly = false) {
    super(defaultValue, isTransient, isReadonly);
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
}

export const NO_FLAGS = 0;
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
  /** @type {number} */
  #flags;
  /** @type {null | number} */
  #min;
  /** @type {null | number} */
  #max;

  /**
   * @param {number} defaultValue
   * @param {number} flags
   * @param {null | number} minValue
   * @param {null | number} maxValue
   * @param {boolean} isTransient
   * @param {boolean} isReadonly
   */
  constructor(defaultValue = 0, flags = 0, minValue = null, maxValue = null, isTransient = false, isReadonly = false) {
    super(processNumber(defaultValue, flags, minValue, maxValue), isTransient, isReadonly);
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
}

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
  /** @type {null | number} */
  #maxLength;

  /**
   * @param {string} defaultValue
   * @param {null | number} maxLength
   * @param {boolean} isTransient
   * @param {boolean} isReadonly
   */
  constructor(defaultValue = "", maxLength = null, isTransient = false, isReadonly = false) {
    super(processText(defaultValue, maxLength), isTransient, isReadonly);
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
}

/**
 * @param {string} title
 * @param {unknown} obj
 */
export const showProperties = (title, obj) => {
  for (const prop of showedProps) {
    prop.clearDisplay();
  }
  
  showedProps = [];
  props.innerHTML = "";

  if (typeof(obj) !== "object" || obj === null) {
    return;
  }

  const par = document.createElement("p");
  par.innerText = title;
  props.appendChild(par);

  for (const key in obj) {
    const value = obj[key];

    if (value instanceof Property) {
      value.draw(key);
    }
  }
};

export const clearProperties = () => showProperties("", null);