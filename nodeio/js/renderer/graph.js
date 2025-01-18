// @ts-check
import { CompiledNode } from "../compiler/nodes.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

export const DRAG_DROP_DATA_FORMAT = "text/plain";
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

/** @param {MouseEvent} e */
const startDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueDrag;
  document.onmouseup = endDrag;
};

export class EditorNode {
  /**
   * @type {readonly SocketBase[]}
   * @readonly
   */
  #sockets;
  /**
   * @type {HTMLDivElement}
   * @readonly
   */
  #root;
  /**
   * @type {HTMLParagraphElement}
   * @readonly
   */
  #title;
  /** @type {number} */
  #x;
  /** @type {number} */
  #y;
  /** @type {string} */
  #name;
  /** @type {string} */
  #color;

  /**
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {string} color
   * @param {...SocketBase} sockets
   */
  constructor(x, y, name, color, ...sockets) {
    this.#sockets = sockets;
    const root = document.createElement("div");
    root.className = "node";
    root.style.left = `${x - graph.offsetLeft}px`;
    root.style.top = `${y - graph.offsetTop}px`;
    root.style.backgroundColor = color;
    const title = document.createElement("p");
    title.innerText = name;
    root.appendChild(title);
    this.#title = title;

    root.onmousedown = e => {
      moved = this;
      startDrag(e);
    };

    this.#root = root;
    this.#x = x - graph.offsetLeft;
    this.#y = y - graph.offsetTop;
    this.#name = name;
    this.#color = color;

    for (const socket of sockets) {
      socket.render(root);
    }
  }

  show() {
    graph.appendChild(this.#root);
  }

  hide() {
    graph.removeChild(this.#root);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  move(x, y) {
    const root = this.#root;
    this.#x = root.offsetLeft - x;
    this.#y = root.offsetTop - y;
    const style = root.style;
    style.left = `${this.#x}px`;
    style.top = `${this.#y}px`;
  }
}

graph.addEventListener("dragover", e => e.preventDefault());

graph.addEventListener("drop", e => {
  const node = CompiledNode.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");

  if (node === undefined) {
    return;
  }

  node.instantiate(e.clientX, e.clientY).show();
});