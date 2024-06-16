// @ts-check
import { doAction } from "./history.js";

const props = /** @type {HTMLDivElement} */ (document.getElementById("properties"));
/** @type {Property[]} */
let showedProps = [];

export const NO_FLAGS = 0;
export const TRANSIENT = 1;
export const READONLY = 2;
export const RESETABLE = 4;

/** @template T */
export class ChangePropertyAction {
  /**
   * @type {Property<T>}
   * @readonly
   */
  #target;
  /**
   * @type {T}
   * @readonly
   */
  #oldValue;
  /**
   * @type {T}
   * @readonly
   */
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
export class Property {
  /**
   * @type {number}
   * @readonly
   */
  #meta;
  /** @type {HTMLInputElement | null} */
  #display;
  /** @type {HTMLButtonElement | null} */
  #reset;
  /** @type {T} */
  #value;
  /**
   * @type {T}
   * @readonly
   */
  #default;
  /** @type {((oldVal: T, newVal: T) => void)[]} */
  #listeners;

  /**
   * @param {T} defaultValue
   * @param {number} metaflags
   */
  constructor(defaultValue, metaflags) {
    if (this.constructor === Property) {
      throw new Error("Cannot instantiate abstract class 'Property'.");
    }

    this.#meta = metaflags;
    this.#display = null;
    this.#reset = null;
    this.#default = defaultValue;
    this.#value = defaultValue;
    this.#listeners = [];
  }

  getMetaflags() {
    return this.#meta;
  }

  isTransient() {
    return (this.#meta & TRANSIENT) !== 0;
  }

  isReadonly() {
    return (this.#meta & READONLY) !== 0;
  }

  isResetable() {
    return (this.#meta & RESETABLE) !== 0;
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

  /**
   * @param {T} x
   * @param {T} y
   */
  equals(x, y) {
    return x === y;
  }

  /** @param {string} newValue */
  setValue(newValue) {
    if (this.isReadonly()) {
      return;
    }

    const val = this.processValue(newValue);

    if (this.isTransient() || this.equals(this.#value, val)) {
      this.transientUpdate(val);
      return;
    }

    doAction(new ChangePropertyAction(this, this.#value, val));
  }

  setDefault() {
    if (this.isReadonly()) {
      return;
    }

    this.setValue(this.toString(this.#default));
  }

  /** @param {T} newValue */
  transientUpdate(newValue) {
    if (this.isReadonly()) {
      return;
    }

    if (this.#value !== newValue) {
      for (const listener of this.#listeners) {
        listener(this.#value, newValue);
      }
    }

    this.#value = newValue;
    this.updateDisplay();
  }

  /** @param {(oldVal: T, newVal: T) => void} listener */
  addChangeListener(listener) {
    this.#listeners.push(listener);
  }

  /** @param {(oldVal: T, newVal: T) => void} listener */
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

  /**
   * @param {string} name
   * @param {boolean} readonly
   */
  draw(name, readonly) {
    this.clearDisplay();
    const isReadonly = this.isReadonly() || readonly;
    const id = `prop-${name}`;
    const element = document.createElement("div");
    const label = document.createElement("label");
    label.innerText = name;
    label.htmlFor = id;
    element.appendChild(label);
    const input = document.createElement("input");
    input.id = id;
    input.type = this.getInputType();
    input.disabled = isReadonly;
    this.#display = input;
    element.appendChild(input);
    
    if (!isReadonly) {
      input.onchange = input.type === "checkbox" ? e => this.setValue(input.checked ? "on" : "") : e => this.setValue(input.value);

      if (this.isResetable()) {
        const button = document.createElement("button");
        button.innerText = "<";
        button.onclick = e => this.setDefault();
        this.#reset = button;
        element.appendChild(button);
      }
    }

    props.appendChild(element);
    this.updateDisplay();
  }

  /** @returns {Property<T>} */
  copy() {
    throw new Error("Method 'copy' is not implemented.");
  }
}

/**
 * @param {string} title
 * @param {unknown} obj
 * @param {boolean} readonly
 */
export const showProperties = (title, obj, readonly = false) => {
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
      showedProps.push(value);
      value.draw(key, readonly);
    }
  }
};

export const clearProperties = () => showProperties("", null);