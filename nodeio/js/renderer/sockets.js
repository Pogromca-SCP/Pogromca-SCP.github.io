// @ts-check
import { doAction } from "../history.js";
import { closeContextMenu } from "../menu.js";
import { dontPropagate } from "../utils.js";

const NONE = 0;
const INPUT = 1;
const OUTPUT = 2;

/** @param {MouseEvent} e */
const removeContext = e => {
  e.stopPropagation();
  closeContextMenu();
};

/** @template T */
class ChangeValueAction {
  /**
   * @type {SocketBase<T>}
   * @readonly
   */
  socket;
  /**
   * @type {T}
   * @readonly
   */
  oldValue;
  /**
   * @type {T}
   * @readonly
   */
  newValue;

  /**
   * @param {SocketBase<T>} socket
   * @param {T} oldValue
   * @param {T} newValue
   */
  constructor(socket, oldValue, newValue) {
    this.socket = socket;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  do() {
    this.socket.transientChangeValue(this.newValue);
  }

  undo() {
    this.socket.transientChangeValue(this.oldValue);
  }
}

/**
 * @template T
 * @abstract
 */
export class SocketBase {
  /**
   * @type {number}
   * @readonly
   */
  #direction;
  /**
   * @type {number}
   * @readonly
   */
  #slot;
  /**
   * @type {string}
   * @readonly
   */
  #name;
  /** @type {HTMLDivElement | null} */
  #root;
  /** @type {HTMLInputElement | HTMLSelectElement | null} */
  #input;
  /** @type {T} */
  #value;

  /**
   * @param {number} direction
   * @param {number} slot
   * @param {string} name
   * @param {T} def
   */
  constructor(direction, slot, name, def) {
    if (this.constructor === SocketBase) {
      throw new Error("Cannot instantiatea an abstract class: SocketBase");
    }

    this.#direction = direction;
    this.#slot = slot;
    this.#name = name;
    this.#root = null;
    this.#input = null;
    this.#value = def;
  }

  get slot() {
    return this.#slot;
  }

  get value() {
    return this.#value;
  }

  /** @param {HTMLElement} parent */
  render(parent) {
    const root = document.createElement("div");
    const direction = this.#direction;

    if (direction === INPUT) {
      root.appendChild(this.#createConnector());
    }

    if (this.#name.trim().length > 0) {
      const label = document.createElement("label");
      label.textContent = this.#name;
      root.appendChild(label);
    }

    const input = this.createDirectInput(this.#value);

    if (input !== null) {
      input.onchange = e => {
        if (!this.changeValue(this.readValue(input.value))) {
          const tmp = input.onchange;
          input.onchange = null;
          this.transientChangeValue(this.#value);
          input.onchange = tmp;
        }
      };

      input.onclick = removeContext;
      input.onmousedown = dontPropagate;
      input.oncontextmenu = removeContext;
      root.appendChild(input);
    }

    if (direction === OUTPUT) {
      root.appendChild(this.#createConnector());
    }

    this.#root = root;
    this.#input = input;
    parent.appendChild(root);
  }

  /**
   * @param {T} def
   * @returns {HTMLInputElement | HTMLSelectElement | null}
   */
  createDirectInput(def) {
    return null;
  }

  /** @param {T} value */
  changeValue(value) {
    if (this.#value === value || !this.validateValue(value)) {
      return false;
    }

    doAction(new ChangeValueAction(this, this.#value, value));
    return true;
  }

  /** @param {T} value */
  transientChangeValue(value) {
    this.#value = value;
    const input = this.#input;

    if (input !== null) {
      input.value = this.writeValue(value);
    }
  }

  /** @param {T} value */
  validateValue(value) {
    return true;
  }

  /**
   * @param {string} value
   * @returns {T}
   */
  readValue(value) {
    throw new Error("Cannot execute an abstract method: readValue(value)");
  }

  /** @param {T} value */
  writeValue(value) {
    return "";
  }

  #createConnector() {
    return document.createElement("div");
  }
}

/** @extends {SocketBase<null>} */
export class NamedSocket extends SocketBase {
  /**
   * @param {number} slot
   * @param {string} name
   */
  constructor(slot, name) {
    super(INPUT, slot, name, null);
  }
}

/** @extends {SocketBase<number>} */
export class NumberSocket extends SocketBase {
  /**
   * @type {number | null}
   * @readonly
   */
  #min;
  /**
   * @type {number | null}
   * @readonly
   */
  #max;
  /**
   * @type {number | null}
   * @readonly
   */
  #step;

  /**
   * @param {number} slot
   * @param {string} name
   * @param {number} def
   * @param {boolean} connective
   * @param {number | null} min
   * @param {number | null} max
   * @param {number | null} step
   */
  constructor(slot, name, def, connective, min, max, step) {
    super(connective ? INPUT : NONE, slot, name, def);
    this.#min = min;
    this.#max = max;
    this.#step = step;
  }

  /** @param {number} def */
  createDirectInput(def) {
    const input = document.createElement("input");
    input.type = "number";

    if (this.#min !== null) {
      input.min = this.#min.toString();
    }

    if (this.#max !== null) {
      input.max = this.#max.toString();
    }

    if (this.#step !== null) {
      input.step = this.#step.toString();
    }

    input.value = this.writeValue(def);
    return input;
  }

  /** @param {number} value */
  validateValue(value) {
    if (this.#min !== null && value < this.#min) {
      return false;
    }

    if (this.#max !== null && value > this.#max) {
      return false;
    }

    if (this.#step !== null && value % this.#step !== 0) {
      return false;
    }

    return true;
  }

  /** @param {string} value */
  readValue(value) {
    return parseFloat(value);
  }

  /** @param {number} value */
  writeValue(value) {
    return value.toString();
  }
}

/** @extends {SocketBase<string>} */
export class SelectSocket extends SocketBase {
  /**
   * @type {readonly string[]}
   * @readonly
   */
  #options;

  /**
   * @param {number} slot
   * @param {string} name
   * @param {string} def
   * @param {readonly string[]} options
   */
  constructor(slot, name, def, options) {
    super(NONE, slot, name, def);
    this.#options = options;
  }

  /** @param {string} def */
  createDirectInput(def) {
    const select = document.createElement("select");

    for (const opt of this.#options) {
      const option = document.createElement("option");
      option.value = opt;
      option.innerText = opt;
      option.selected = opt === def;
      select.appendChild(option);
    }

    return select;
  }

  /** @param {string} value */
  validateValue(value) {
    return this.#options.includes(value);
  }

  /** @param {string} value */
  readValue(value) {
    return value;
  }

  /** @param {string} value */
  writeValue(value) {
    return value;
  }
}

/** @extends {SocketBase<boolean>} */
export class SwitchSocket extends SocketBase {
  /**
   * @type {string}
   * @readonly
   */
  #active;
  /**
   * @type {string}
   * @readonly
   */
  #inactive;

  /**
   * @param {number} slot
   * @param {string} name
   * @param {boolean} def
   * @param {boolean} connective
   * @param {string} active
   * @param {string} inactive
   */
  constructor(slot, name, def, connective, active, inactive) {
    super(connective ? INPUT : NONE, slot, name, def);
    this.#active = active;
    this.#inactive = inactive;
  }

  /** @param {boolean} def */
  createDirectInput(def) {
    const select = document.createElement("select");

    for (const opt of [false, true]) {
      const option = document.createElement("option");
      option.value = this.writeValue(opt);
      option.innerText = opt ? this.#active : this.#inactive;
      option.selected = opt === def;
      select.appendChild(option);
    }

    return select;
  }

  /** @param {string} value */
  readValue(value) {
    return value.length > 0;
  }

  /** @param {boolean} value */
  writeValue(value) {
    return value ? "on" : "";
  }
}

/** @extends {SocketBase<string>} */
export class TextSocket extends SocketBase {
  /**
   * @type {number | null}
   * @readonly
   */
  #min;
  /**
   * @type {number | null}
   * @readonly
   */
  #max;
  /**
   * @type {string}
   * @readonly
   */
  #valid;

  /**
   * @param {number} slot
   * @param {string} name
   * @param {string} def
   * @param {boolean} connective
   * @param {number | null} min
   * @param {number | null} max
   * @param {string} valid
   */
  constructor(slot, name, def, connective, min, max, valid) {
    super(connective ? INPUT : NONE, slot, name, def);
    this.#min = min;
    this.#max = max;
    this.#valid = valid;
  }

  /** @param {string} def */
  createDirectInput(def) {
    const input = document.createElement("input");
    input.type = "text";

    if (this.#min !== null) {
      input.minLength = this.#min;
    }

    if (this.#max !== null) {
      input.maxLength = this.#max;
    }

    input.value = def;
    return input;
  }

  /** @param {string} value */
  validateValue(value) {
    if (this.#min !== null && value.length < this.#min) {
      return false;
    }

    if (this.#max !== null && value.length > this.#max) {
      return false;
    }

    const valid = this.#valid;

    if (valid.length > 0 && value.length > 0) {
      for (const ch of value) {
        if (!valid.includes(ch)) {
          return false;
        }
      }
    }

    return true;
  }

  /** @param {string} value */
  readValue(value) {
    return value;
  }

  /** @param {string} value */
  writeValue(value) {
    return value;
  }
}

/** @extends {SocketBase<null>} */
export class OutputSocket extends SocketBase {
  /**
   * @param {number} slot
   * @param {string} name
   */
  constructor(slot, name) {
    super(OUTPUT, slot, name, null);
  }
}