// @ts-check

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

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
  /** @type {HTMLDivElement | null} */
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
    this.#root = null;
  }

  /** @param {HTMLElement} parent */
  render(parent) {
    this.#root = document.createElement("div");
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
  }
}