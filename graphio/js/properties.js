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

  constructor(isTransient = false) {
    if (this.constructor === Property) {
      throw new Error("Cannot instantiate abstract class Property");
    }

    this.#transient = isTransient;
    this.#display = null;
  }

  getInputType() {
    return "text";
  }

  /** @param {string} newValue */
  setValue(newValue) {}
  setDefault() {}

  isTransient() {
    return this.#transient;
  }

  /** @param {string} value */
  updateDisplay(value) {
    if (this.#display === null) {
      return;
    }

    const tmp = this.#display.onchange;
    this.#display.onchange = null;

    if (this.#display.type === "checkbox") {
      this.#display.checked = value.length > 0;
    } else {
      this.#display.value = value;
    }
    
    this.#display.onchange = tmp;
  }

  clearDisplay() {
    if (this.#display === null) {
      return;
    }

    this.#display.onchange = null;
    this.#display = null;
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
    props.appendChild(element);
  }
}

class ChangeBooleanPropertyAction {
  /** @type {BooleanProperty} */
  #target;
  /** @type {boolean} */
  #oldValue;
  /** @type {boolean} */
  #newValue;

  /**
   * @param {BooleanProperty} target
   * @param {boolean} oldValue
   * @param {boolean} newValue
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

  /** @param {string} newValue */
  setValue(newValue) {
    if (this.isTransient()) {
      this.transientUpdate(newValue.length > 0);
      return;
    }

    doAction(new ChangeBooleanPropertyAction(this, this.#value, newValue.length > 0));
  }

  setDefault() {
    this.setValue(this.#default ? "on" : "");
  }

  /** @param {boolean} newValue */
  transientUpdate(newValue) {
    this.#value = newValue;
    this.updateDisplay(newValue ? "on" : "");
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

export class NumberProperty extends Property {
  /** @type {number} */
  #value;
  /** @type {boolean} */
  #isInt;
  /** @type {number} */
  #default;

  constructor(defaultValue = 0, isInteger = false, isTransient = false) {
    super(isTransient);
    const val = isInteger ? Math.floor(defaultValue) : defaultValue;
    this.#default = val;
    this.#isInt = isInteger;
    this.#value = val;
  }

  getInputType() {
    return "number";
  }

  isInteger() {
    return this.#isInt;
  }

  /** @param {string} newValue */
  setValue(newValue) {
    const val = this.#isInt ? parseInt(newValue) : parseFloat(newValue);

    if (this.isTransient()) {
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
    this.updateDisplay(newValue.toString());
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

  constructor(defaultValue = "", isTransient = false) {
    super(isTransient);
    this.#default = defaultValue;
    this.#value = defaultValue;
  }

  /** @param {string} newValue */
  setValue(newValue) {
    if (this.isTransient()) {
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
    this.updateDisplay(newValue);
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