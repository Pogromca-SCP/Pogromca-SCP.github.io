// @ts-check
import { doAction } from "../history.js";
import { closeContextMenu, showContextMenu } from "../menu.js";
import { dontPropagate, hasFlag } from "../utils.js";
import { Connection } from "./connections.js";
import { getOffsetLeft, getOffsetTop } from "./graph.js";

/**
 * @typedef {import("./nodes.js").EditorNode} EditorNode
 */

/** @param {MouseEvent} e */
const removeContext = e => {
  e.stopPropagation();
  closeContextMenu();
};

/** @type {Connection | null} */
let tmpConnection = null;

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

class ChangeConnectionAction {
  /**
   * @type {SocketBase}
   * @readonly
   */
  socket;
  /**
   * @type {SocketBase | null}
   * @readonly
   */
  oldValue;
  /**
   * @type {SocketBase | null}
   * @readonly
   */
  newValue;

  /**
   * @param {SocketBase} socket
   * @param {SocketBase | null} oldValue
   * @param {SocketBase | null} newValue
   */
  constructor(socket, oldValue, newValue) {
    this.socket = socket;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  do() {
    this.socket.transientChangeConnection(this.newValue);
  }

  undo() {
    this.socket.transientChangeConnection(this.oldValue);
  }
}

export const INPUT = 1;
export const OUTPUT = 2;
export const IN_SELECT = 4;
export const IN_WRITE = 8;

/**
 * @template T
 * @abstract
 */
export class SocketBase {
  /**
   * @type {number}
   * @readonly
   */
  #flags;
  /**
   * @type {number}
   * @readonly
   */
  #slot;
  /**
   * @type {HTMLDivElement}
   * @readonly
   */
  #root;
  /**
   * @type {HTMLInputElement | HTMLSelectElement | null}
   * @readonly
   */
  #input;
  /**
   * @type {Set<Connection>}
   * @readonly
   */
  #connections;
  /** @type {EditorNode | null} */
  #node;
  /** @type {T} */
  #value;
  /** @type {SocketBase | null} */
  #connection;

  /**
   * @param {number} flags
   * @param {number} slot
   * @param {string} name
   * @param {T} def
   */
  constructor(flags, slot, name, def) {
    if (this.constructor === SocketBase) {
      throw new Error("Cannot instantiatea an abstract class: SocketBase");
    }

    this.#flags = flags;
    this.#slot = slot;
    this.#root = document.createElement("div");
    this.#input = hasFlag(flags, IN_WRITE) ? document.createElement("input") : (hasFlag(flags, IN_SELECT) ? document.createElement("select") : null);
    this.#connections = new Set();
    this.#node = null;
    this.#value = def;
    this.#connection = null;
    this.#createSocket(name);
  }

  get flags() {
    return this.#flags;
  }

  get slot() {
    return this.#slot;
  }

  get node() {
    return this.#node;
  }

  get value() {
    return this.#value;
  }

  get connection() {
    return this.#connection;
  }

  get left() {
    return this.#node?.x ?? 0;
  }

  get right() {
    return this.left + this.#root.offsetWidth;
  }

  get height() {
    return this.#node?.y ?? 0;
  }

  /**
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   */
  render(node, parent) {
    if (this.#root.parentElement !== null) {
      return;
    }

    this.#node = node;
    const input = this.#input;

    if (input !== null) {
      if (input instanceof HTMLInputElement) {
        this.setupDirectInput(input);
      }
      else {
        this.setupOptions(input);
      }

      input.onchange = e => {
        if (!this.changeValue(this.readValue(input.value))) {
          this.transientChangeValue(this.#value);
        }
      };
    }

    parent.appendChild(this.#root);
  }

  /** @param {HTMLInputElement} input */
  setupDirectInput(input) {}

  /** @param {HTMLSelectElement} input */
  setupOptions(input) {}

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
      const tmp = input.onchange;
      input.onchange = null;
      input.value = this.writeValue(value);
      input.onchange = tmp;
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

  /** @param {SocketBase | null} connection */
  changeConnection(connection) {
    if (!hasFlag(this.#flags, INPUT) || this.#connection === connection) {
      return false;
    }

    doAction(new ChangeConnectionAction(this, this.#connection, connection));
    return true;
  }

  /** @param {SocketBase | null} connection */
  transientChangeConnection(connection) {
    this.#connection = connection;
    const isRemove = connection === null;
    const input = this.#input;

    if (input !== null) {
      input.hidden = !isRemove;
    }

    if (isRemove) {
      const connections = this.#connections;
      const toRemove = Array.from(connections).filter(c => c.input === this);

      for (const connect of toRemove) {
        connections.delete(connect);
        const output = connect.output;

        if (output !== null) {
          output.#removeConnections(toRemove);
        }
      }
    } else {
      const connect = new Connection(this, connection);
      this.#connections.add(connect);
      connection.#addConnection(connect);
    }
  }

  refreshConnections() {
    for (const connect of this.#connections) {
      connect.queueRedraw();
    }
  }

  hideConnections() {
    for (const connect of this.#connections) {
      connect.remove();
    }
  }

  /** @param {string} name */
  #createSocket(name) {
    const root = this.#root;
    const flags = this.#flags;

    if (hasFlag(flags, INPUT)) {
      root.appendChild(this.#createConnector(true));
    }

    if (name.trim().length > 0) {
      const label = document.createElement("label");
      label.textContent = name;
      root.appendChild(label);
    }

    const input = this.#input;

    if (input !== null) {
      input.onclick = removeContext;
      input.onmousedown = dontPropagate;
      input.oncontextmenu = removeContext;
      root.appendChild(input);
    }

    if (hasFlag(flags, OUTPUT)) {
      root.appendChild(this.#createConnector(false));
    }
  }

  /** @param {boolean} isInput */
  #createConnector(isInput) {
    const element = document.createElement("div");

    if (isInput) {
      element.onmousedown = e => {
        e.stopPropagation();
        tmpConnection = new Connection(this, null);
        tmpConnection.startDraw(e);
      };

      element.onmouseup = e => {
        tmpConnection?.remove();
        this.changeConnection(tmpConnection?.output ?? null);
        tmpConnection = null;
      };

      element.oncontextmenu = e => {
        if (this.#connection === null) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        showContextMenu(e.clientX, e.clientY, [
          [
            { name: "Disconnect", handler: e => this.changeConnection(null) },
          ]
        ]);
      };
    } else {
      element.onmousedown = e => {
        e.stopPropagation();
        tmpConnection = new Connection(null, this);
        tmpConnection.startDraw(e);
      };

      element.onmouseup = e => {
        tmpConnection?.remove();
        tmpConnection?.output?.changeConnection(this);
        tmpConnection = null;
      };
    }

    return element;
  }

  /** @param {Connection} connection */
  #addConnection(connection) {
    this.#connections.add(connection);
    connection.redraw();
  }

  /** @param {readonly Connection[]} connections */
  #removeConnections(connections) {
    const tmp = this.#connections;

    for (const connect of connections) {
      tmp.delete(connect);
      connect.remove();
    }
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
    super(connective ? INPUT | IN_WRITE : IN_WRITE, slot, name, def);
    this.#min = min;
    this.#max = max;
    this.#step = step;
  }

  /** @param {HTMLInputElement} input */
  setupDirectInput(input) {
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

    input.value = this.value.toString();
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
    super(IN_SELECT, slot, name, def);
    this.#options = options;
  }

  /** @param {HTMLSelectElement} input */
  setupOptions(input) {
    const value = this.value;

    for (const opt of this.#options) {
      const option = document.createElement("option");
      option.value = opt;
      option.innerText = opt;
      option.selected = opt === value;
      input.appendChild(option);
    }
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
    super(connective ? INPUT | IN_SELECT : IN_SELECT, slot, name, def);
    this.#active = active;
    this.#inactive = inactive;
  }

  /** @param {HTMLSelectElement} input */
  setupOptions(input) {
    const value = this.value;

    for (const opt of [false, true]) {
      const option = document.createElement("option");
      option.value = this.writeValue(opt);
      option.innerText = opt ? this.#active : this.#inactive;
      option.selected = opt === value;
      input.appendChild(option);
    }
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
    super(connective ? INPUT | IN_WRITE : IN_WRITE, slot, name, def);
    this.#min = min;
    this.#max = max;
    this.#valid = valid;
  }

  /** @param {HTMLInputElement} input */
  setupDirectInput(input) {
    input.type = "text";

    if (this.#min !== null) {
      input.minLength = this.#min;
    }

    if (this.#max !== null) {
      input.maxLength = this.#max;
    }

    input.value = this.value;
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