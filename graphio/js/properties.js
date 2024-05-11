// @ts-check
import { doAction } from "./history.js";

const props = /** @type {HTMLDivElement} */ (document.getElementById("properties"));
/** @type {Property[]} */
let showedProps = [];

class Property {
  /** @type {boolean} */
  #transient;
  /** @type {HTMLInputElement | null} */
  #display;
  /** @type {HTMLButtonElement | null} */
  #button;

  constructor(isTransient = false) {
    if (this.constructor === Property) {
      throw new Error("Cannot instantiate abstract class 'Property'.");
    }

    this.#transient = isTransient;
    this.#display = null;
    this.#button = null;
  }

  getInputType() {
    return "text";
  }

  /** @returns {null | boolean | number | string} */
  getValue() {
    return null;
  }

  /** @returns {null | boolean | number | string} */
  getDefaultValue() {
    return null;
  }

  toString() {
    return "";
  }

  /** @param {string} newValue */
  setValue(newValue) {}
  setDefault() {}

  isTransient() {
    return this.#transient;
  }

  updateDisplay() {
    if (this.#display === null) {
      return;
    }

    const tmp = this.#display.onchange;
    this.#display.onchange = null;
    const value = this.toString();

    if (this.#display.type === "checkbox") {
      this.#display.checked = value.length > 0;
    } else {
      this.#display.value = value;
    }
    
    this.#display.onchange = tmp;

    if (this.#button !== null) {
      this.#button.hidden = this.getValue() === this.getDefaultValue();
    }
  }

  clearDisplay() {
    if (this.#display === null) {
      return;
    }

    this.#display.onchange = null;
    this.#display = null;

    if (this.#button === null) {
      return;
    }

    this.#button.onclick = null;
    this.#button = null;
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
    input.onchange = input.type === "checkbox" ? e => this.setValue(input.checked ? "on" : "") : e => this.setValue(input.value);
    this.#display = input;
    element.appendChild(input);
    const button = document.createElement("button");
    button.innerText = "<";
    button.onclick = e => this.setDefault();
    this.#button = button;
    element.appendChild(button);
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

export class BooleanProperty extends Property {
  /** @type {boolean} */
  #value;
  /** @type {boolean} */
  #default;

  constructor(defaultValue = false, isTransient = false) {
    super(isTransient);
    this.#default = defaultValue;
    this.#value = defaultValue;
  }

  getInputType() {
    return "checkbox";
  }

  getValue() {
    return this.#value;
  }

  getDefaultValue() {
    return this.#default;
  }

  toString() {
    return this.#value ? "on" : "";
  }

  /** @param {string} newValue */
  setValue(newValue) {
    const val = newValue.length > 0;

    if (this.isTransient() || this.#value === val) {
      this.transientUpdate(val);
      return;
    }

    doAction(new ChangeBooleanPropertyAction(this, val));
  }

  setDefault() {
    this.setValue(this.#default ? "on" : "");
  }

  /** @param {boolean} newValue */
  transientUpdate(newValue) {
    this.#value = newValue;
    this.updateDisplay();
  }

  toggle() {
    this.setValue(this.#value ? "" : "on");
  }
}

class ChangeNumberPropertyAction {
  /** @type {NumberProperty} */
  #target;
  /** @type {number} */
  #oldValue;
  /** @type {number} */
  #newValue;

  /**
   * @param {NumberProperty} target
   * @param {number} oldValue
   * @param {number} newValue
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
    this.#target.transientUpdate(this.#oldValue)
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

export class NumberProperty extends Property {
  /** @type {number} */
  #value;
  /** @type {number} */
  #flags;
  /** @type {number} */
  #default;
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
   */
  constructor(defaultValue = 0, flags = 0, minValue = null, maxValue = null, isTransient = false) {
    super(isTransient);
    defaultValue = clamp(defaultValue, minValue, maxValue);
    defaultValue = applyFlags(defaultValue, flags);
    this.#default = defaultValue;
    this.#flags = flags;
    this.#min = minValue;
    this.#max = maxValue;
    this.#value = defaultValue;
  }

  getInputType() {
    return "number";
  }

  getValue() {
    return this.#value;
  }

  getDefaultValue() {
    return this.#default;
  }

  toString() {
    return this.#value.toString();
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

  /** @param {string} newValue */
  setValue(newValue) {
    let val = parseFloat(newValue);
    val = clamp(val, this.#min, this.#max);
    val = applyFlags(val, this.#flags);

    if (this.isTransient() || this.#value === val) {
      this.transientUpdate(val);
      return;
    }

    doAction(new ChangeNumberPropertyAction(this, this.#value, val));
  }

  setDefault() {
    this.setValue(this.#default.toString());
  }

  /** @param {number} newValue */
  transientUpdate(newValue) {
    this.#value = newValue;
    this.updateDisplay();
  }

  inc() {
    this.setValue((this.#value + 1).toString());
  }

  dec() {
    this.setValue((this.#value - 1).toString());
  }
}

class ChangeTextPropertyAction {
  /** @type {TextProperty} */
  #target;
  /** @type {string} */
  #oldValue;
  /** @type {string} */
  #newValue;

  /**
   * @param {TextProperty} target
   * @param {string} oldValue
   * @param {string} newValue
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
    this.#target.transientUpdate(this.#oldValue)
  }
}

export class TextProperty extends Property {
  /** @type {string} */
  #value;
  /** @type {string} */
  #default;
  /** @type {null | number} */
  #maxLength;

  /**
   * @param {string} defaultValue
   * @param {null | number} maxLength
   * @param {boolean} isTransient
   */
  constructor(defaultValue = "", maxLength = null, isTransient = false) {
    super(isTransient);
    
    if (maxLength !== null && defaultValue.length > maxLength) {
      defaultValue = maxLength < 1 ? "" : defaultValue.substring(0, maxLength);
    }

    this.#default = defaultValue;
    this.#value = defaultValue;
    this.#maxLength = maxLength;
  }

  getValue() {
    return this.#value;
  }

  getDefaultValue() {
    return this.#default;
  }

  toString() {
    return this.#value;
  }

  getMaxLength() {
    return this.#maxLength;
  }

  /** @param {string} newValue */
  setValue(newValue) {
    if (this.#maxLength !== null && newValue.length > this.#maxLength) {
      newValue = this.#maxLength < 1 ? "" : newValue.substring(0, this.#maxLength);
    }

    if (this.isTransient() || this.#value === newValue) {
      this.transientUpdate(newValue);
      return;
    }

    doAction(new ChangeTextPropertyAction(this, this.#value, newValue));
  }

  setDefault() {
    this.setValue(this.#default);
  }

  /** @param {string} newValue */
  transientUpdate(newValue) {
    this.#value = newValue;
    this.updateDisplay();
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