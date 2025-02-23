// @ts-check
import { addConnection, removeConnection, startDrag, SVG_URL } from "./graph.js";

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 * @typedef {import("./sockets.js").OutputSocket} OutputSocket
 */

export class Connection {
  /**
   * @type {SVGPathElement}
   * @readonly
   */
  #path;
  /** @type {SocketBase | null} */
  #input;
  /** @type {OutputSocket | null} */
  #output;
  /** @type {SVGElement | null} */
  #group;

  /**
   * @param {SocketBase} socket
   * @param {boolean} isInput
   */
  constructor(socket, isInput) {
    this.#path = document.createElementNS(SVG_URL, "path");
    this.#input = isInput ? socket : null;
    this.#output = isInput ? null : socket;
    this.#group = null;
  }

  get output() {
    return this.#output;
  }

  /** @param {SocketBase} socket */
  finalize(socket) {
    this.#input ??= socket;
    this.#output ??= socket;
    this.redraw();
  }

  /** @param {MouseEvent} e */
  startDraw(e) {
    startDrag(e, (x, y) => this.drawInProgress(x, y), null);
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  drawInProgress(offsetX, offsetY) {
    const start = this.#output;
    const end = this.#input;

    if (end !== null) {
      this.#draw(offsetX, offsetY, end.left, end.height);
    } else if (start !== null) {
      this.#draw(start.right, start.height, offsetX, offsetY);
    }
  }

  redraw() {
    const start = this.#output;
    const end = this.#input;

    if (start === null || end === null) {
      return;
    }

    this.#draw(start.right, start.height, end.left, end.height);
  }

  remove() {
    const group = this.#group;

    if (group !== null) {
      removeConnection(group, this.#path);
    }
  }

  /**
   * @param {number} fromX
   * @param {number} fromY
   * @param {number} toX
   * @param {number} toY
   */
  #draw(fromX, fromY, toX, toY) {
    this.#group ??= addConnection(this.#path);
    this.#path.setAttribute("d", `M ${fromX} ${fromY} L ${toX} ${toY} Z`);
  }
}