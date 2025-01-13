// @ts-check

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

/** @type {EditorNode | null} */
let moved = null;

/** @type {[number, number, number, number]} */
const coords = [0, 0, 0, 0];

/** @param {MouseEvent} e */
const continueDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  moved?.move(coords[0], coords[1]);
};

/** @param {MouseEvent} e */
const endDrag = e => {
  moved = null;
  document.onmousemove = null;
  document.onmouseup = null;
};

/**
 * @param {MouseEvent} e
 * @param {EditorNode} node
 */
const startDrag = (e, node) => {
  moved = node;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueDrag;
  document.onmouseup = endDrag;
};

export class EditorNode {
  /** @type {number} */
  #x;
  /** @type {number} */
  #y;
  /** @type {string} */
  #name;
  /** @type {string} */
  #color;
  /** @type {SocketBase[]} */
  #sockets;
  /** @type {HTMLDivElement} */
  #root;

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {string} color
   * @param {SocketBase[]} sockets
   */
  constructor(x, y, name, color, sockets) {
    this.#x = x;
    this.#y = y;
    this.#name = name;
    this.#color = color;
    this.#sockets = sockets;
    this.#root = document.createElement("div");
  }

  /** @param {HTMLElement} parent */
  render(parent) {
    this.#root.className = "node";
    this.#root.style.left = `${this.#x}px`;
    this.#root.style.top = `${this.#y}px`;
    this.#root.style.backgroundColor = this.#color;
    const name = document.createElement("p");
    name.innerText = this.#name;
    this.#root.appendChild(name);

    for (const socket of this.#sockets) {
      socket.render(this.#root);
    }

    parent.appendChild(this.#root);

    this.#root.onmousedown = e => {
      e.preventDefault();
      startDrag(e, this);
    };
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  move(x, y) {
    this.#root.style.left = `${this.#x}px`;
    this.#root.style.top = `${this.#y}px`;
  }
}