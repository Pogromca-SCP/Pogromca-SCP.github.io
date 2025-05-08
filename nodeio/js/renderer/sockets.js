// @ts-check
import { doAction } from "../history.js";
import { closeContextMenu, showContextMenu } from "../menu.js";
import { dontPropagate, hasFlag, textToInt } from "../utils.js";
import { Connection, DraggableConnection } from "./connections.js";

/**
 * @typedef {import("./nodes.js").EditorNode} EditorNode
 */

const borderSize = textToInt(getComputedStyle(document.body).getPropertyValue("--selection-size"));

/** @param {MouseEvent} e */
const removeContext = e => {
  e.stopPropagation();
  closeContextMenu();
};

/** @type {DraggableConnection | null} */
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
    this.socket.transientChangeConnection(this.newValue, true);
    Connection.finishMassRedraw();
  }

  undo() {
    this.socket.transientChangeConnection(this.oldValue, true);
    Connection.finishMassRedraw();
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
   * @type {EditorNode}
   * @readonly
   */
  #node;
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
   * @type {Set<Connection> | null}
   * @readonly
   */
  #connections;
  /** @type {T} */
  #value;
  /** @type {SocketBase | null} */
  #connection;

  /**
   * @param {number} flags
   * @param {EditorNode} node
   * @param {string} name
   * @param {T} def
   */
  constructor(flags, node, name, def) {
    if (this.constructor === SocketBase) {
      throw new Error("Cannot instantiatea an abstract class: SocketBase");
    }

    this.#flags = flags;
    this.#node = node;
    this.#root = document.createElement("div");
    this.#input = hasFlag(flags, IN_WRITE) ? document.createElement("input") : (hasFlag(flags, IN_SELECT) ? document.createElement("select") : null);
    this.#connections = hasFlag(flags, OUTPUT) ? new Set() : null;
    this.#value = def;
    this.#connection = null;
    this.#createSocket(name);
  }

  get flags() {
    return this.#flags;
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
    return this.#node.x + borderSize;
  }

  get right() {
    return this.left + this.#root.offsetWidth;
  }

  get height() {
    const root = this.#root;
    return this.#node.y + root.offsetTop + borderSize + (root.offsetHeight / 2);
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
    if (this.#connection === connection || !this.validateConnection(connection)) {
      return false;
    }

    doAction(new ChangeConnectionAction(this, this.#connection, connection));
    return true;
  }

  /**
   * @param {SocketBase | null} connection
   * @param {boolean} updateOther
   */
  transientChangeConnection(connection, updateOther) {
    const oldConnection = this.#connection;
    this.#connection = connection;
    const input = this.#input;

    if (input !== null) {
      input.hidden = connection !== null;
    }

    if (oldConnection !== null && oldConnection.#connections !== null) {
      this.#removeConnection(oldConnection.#connections, updateOther);
    }
    
    if (connection !== null) {
      this.#addConnection(connection, updateOther);
    }
  }

  /** @param {SocketBase | null} connection */
  validateConnection(connection) {
    return hasFlag(this.#flags, INPUT) && (connection === null || hasFlag(connection.#flags, OUTPUT));
  }

  restoreConnections() {
    const connections = this.#connections;

    if (connections !== null) {
      for (const connect of connections) {
        connect.input.transientChangeConnection(this, false);
        connect.queueRedraw();
      }
    }

    const connection = this.#connection;

    if (connection !== null) {
      this.#addConnection(connection, true);
    }
  }

  refreshConnections() {
    let connections = this.#connections;

    if (connections !== null) {
      for (const connect of connections) {
        connect.queueRedraw();
      }
    }

    connections = this.#connection === null ? null : this.#connection.#connections;

    if (connections !== null) {
      for (const connect of connections) {
        if (connect.input === this) {
          connect.queueRedraw();
        }
      }
    }
  }

  hideConnections() {
    let connections = this.#connections;

    if (connections !== null) {
      for (const connect of connections) {
        connect.input.transientChangeConnection(null, false);
      }
    }

    connections = this.#connection === null ? null : this.#connection.#connections;

    if (connections !== null) {
      this.#removeConnection(connections, true);
    }
  }

  /** @param {HTMLElement} parent */
  render(parent) {
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
        tmpConnection = new DraggableConnection(this.#node.graph, this, true);
        tmpConnection.startDraw(e);
      };

      element.onmouseup = e => {
        if (tmpConnection !== null) {
          this.changeConnection(tmpConnection.socket);
        }

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
        tmpConnection = new DraggableConnection(this.#node.graph, this, false);
        tmpConnection.startDraw(e);
      };

      element.onmouseup = e => {
        tmpConnection?.socket.changeConnection(this);
        tmpConnection = null;
      };
    }

    return element;
  }

  /**
   * @param {SocketBase} connection
   * @param {boolean} updateOther
   */
  #addConnection(connection, updateOther) {
    if (!updateOther) {
      return;
    }

    const connect = new Connection(this.#node.graph, this, connection);
    connect.queueRedraw();
    connection.#connections?.add(connect);
  }

  /**
   * @param {Set<Connection>} connections
   * @param {boolean} updateOther
   */
  #removeConnection(connections, updateOther) {
    const toRemove = Array.from(connections).filter(c => c.input === this);

    for (const connect of toRemove) {
      connect.remove();
        
      if (updateOther) {
        connections.delete(connect);
      }
    }
  }
}

/** @extends {SocketBase<null>} */
export class NamedSocket extends SocketBase {
  /**
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   * @param {string} name
   */
  constructor(node, parent, name) {
    super(INPUT, node, name, null);
    this.render(parent);
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
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   * @param {string} name
   * @param {number} def
   * @param {boolean} connective
   * @param {number | null} min
   * @param {number | null} max
   * @param {number | null} step
   */
  constructor(node, parent, name, def, connective, min, max, step) {
    super(connective ? INPUT | IN_WRITE : IN_WRITE, node, name, def);
    this.#min = min;
    this.#max = max;
    this.#step = step;
    this.render(parent);
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
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   * @param {string} name
   * @param {string} def
   * @param {readonly string[]} options
   */
  constructor(node, parent, name, def, options) {
    super(IN_SELECT, node, name, def);
    this.#options = options;
    this.render(parent);
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
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   * @param {string} name
   * @param {boolean} def
   * @param {boolean} connective
   * @param {string} active
   * @param {string} inactive
   */
  constructor(node, parent, name, def, connective, active, inactive) {
    super(connective ? INPUT | IN_SELECT : IN_SELECT, node, name, def);
    this.#active = active;
    this.#inactive = inactive;
    this.render(parent);
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
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   * @param {string} name
   * @param {string} def
   * @param {boolean} connective
   * @param {number | null} min
   * @param {number | null} max
   * @param {string} valid
   */
  constructor(node, parent, name, def, connective, min, max, valid) {
    super(connective ? INPUT | IN_WRITE : IN_WRITE, node, name, def);
    this.#min = min;
    this.#max = max;
    this.#valid = valid;
    this.render(parent);
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
   * @param {EditorNode} node
   * @param {HTMLElement} parent
   * @param {string} name
   */
  constructor(node, parent, name) {
    super(OUTPUT, node, name, null);
    this.render(parent);
  }
}