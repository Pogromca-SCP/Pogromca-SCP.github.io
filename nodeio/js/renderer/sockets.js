// @ts-check
const DEFAULT_NAME = "Label";
const NONE = 0;
const INPUT = 1;
const OUTPUT = 2;

/**
 * @template T
 * @abstract
 */
export class SocketBase {
  /** @type {number} */
  #direction;
  /** @type {number} */
  #slot;
  /** @type {string} */
  #name;
  /** @type {T} */
  #default;
  /** @type {HTMLDivElement | null} */
  #root;

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
    this.#default = def;
    this.#root = null;
  }

  get slot() {
    return this.#slot;
  }

  /** @param {HTMLElement} parent */
  render(parent) {
    this.#root = document.createElement("div");

    if (this.#direction === INPUT) {
      this.#root.appendChild(this.#createConnector());
    }

    if (this.#name.trim().length > 0) {
      const label = document.createElement("label");
      label.textContent = this.#name;
      this.#root.appendChild(label);
    }

    const input = this.createDirectInput(this.#default);

    if (input !== null) {
      input.onclick = e => e.stopPropagation();
      input.onmousedown = e => e.stopPropagation();
      this.#root.appendChild(input);
    }

    if (this.#direction === OUTPUT) {
      this.#root.appendChild(this.#createConnector());
    }

    parent.appendChild(this.#root);
  }

  /**
   * @param {T} def
   * @returns {HTMLElement | null}
   */
  createDirectInput(def) {
    return null;
  }

  show() {
    this.#setVisibility(true);
  }

  hide() {
    this.#setVisibility(false);
  }

  #createConnector() {
    return document.createElement("div");
  }

  /** @param {boolean} value */
  #setVisibility(value) {
    if (this.#root === null) {
      return;
    }

    this.#root.hidden = value;
  }
}

/** @extends {SocketBase<string>} */
export class NamedSocket extends SocketBase {
  /**
   * @param {number} slot
   * @param {string} name
   * @param {string} def
   */
  constructor(slot, name, def) {
    super(INPUT, slot, name.trim().length > 0 ? name : DEFAULT_NAME, def);
  }
}

/** @extends {SocketBase<number>} */
export class NumberSocket extends SocketBase {
  /** @type {number | null} */
  #min;
  /** @type {number | null} */
  #max;
  /** @type {number | null} */
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

    input.value = def.toString();
    return input;
  }
}

/** @extends {SocketBase<string>} */
export class SelectSocket extends SocketBase {
  /** @type {string[]} */
  #options;

  /**
   * @param {number} slot
   * @param {string} name
   * @param {string} def
   * @param {string[]} options
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
}

/** @extends {SocketBase<boolean>} */
export class SwitchSocket extends SocketBase {
  /** @type {string} */
  #active;
  /** @type {string} */
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
      option.value = opt ? "on" : "";
      option.innerText = opt ? this.#active : this.#inactive;
      option.selected = opt === def;
      select.appendChild(option);
    }

    return select;
  }
}

/** @extends {SocketBase<string>} */
export class TextSocket extends SocketBase {
  /** @type {number | null} */
  #min;
  /** @type {number | null} */
  #max;
  /** @type {string} */
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
}

/** @extends {SocketBase<null>} */
export class OutputSocket extends SocketBase {
  /**
   * @param {number} slot
   * @param {string} name
   */
  constructor(slot, name) {
    super(OUTPUT, slot, name.trim().length > 0 ? name : DEFAULT_NAME, null);
  }
}