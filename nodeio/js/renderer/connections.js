// @ts-check
import { addConnection, removeConnection, startDrag, SVG_URL } from "./graph.js";

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 * @typedef {import("./sockets.js").OutputSocket} OutputSocket
 */

/** @type {number | null} */
let tmpX = null;
/** @type {number | null} */
let tmpY = null;

export class Connection {
  /**
   * @type {Set<Connection>}
   * @readonly
   */
  static #toRedraw = new Set();
  /**
   * @type {SVGPathElement}
   * @readonly
   */
  #path;
  /**
   * @type {SocketBase | null}
   * @readonly
   */
  #input;
  /**
   * @type {SocketBase | null}
   * @readonly
   */
  #output;

  /**
   * @param {SocketBase | null} input
   * @param {SocketBase | null} output
   */
  constructor(input, output) {
    this.#path = document.createElementNS(SVG_URL, "path");
    this.#input = input;
    this.#output = output;
  }

  static finishMassRedraw() {
    for (const connect of Connection.#toRedraw) {
      connect.redraw();
    }

    Connection.#toRedraw.clear();
  }

  get input() {
    return this.#input;
  }

  get output() {
    return this.#output;
  }

  /** @param {MouseEvent} e */
  startDraw(e) {
    startDrag(e, (x, y) => this.drawInProgress(x, y), () => {
      tmpX = null;
      tmpY = null;
    });
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  drawInProgress(offsetX, offsetY) {
    const start = this.#output;
    const end = this.#input;

    if (end !== null) {
      tmpX ??= end.left;
      tmpY ??= end.height;
      this.#draw(tmpX - offsetX, tmpY - offsetY, end.left, end.height);
    } else if (start !== null) {
      tmpX ??= start.right;
      tmpY ??= start.height;
      this.#draw(start.right, start.height, tmpX - offsetX, tmpY - offsetY);
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

  queueRedraw() {
    Connection.#toRedraw.add(this);
  }

  remove() {
    Connection.#toRedraw.delete(this);
    const path = this.#path;

    if (path.parentElement !== null) {
      removeConnection(path);
    }
  }

  /**
   * @param {number} fromX
   * @param {number} fromY
   * @param {number} toX
   * @param {number} toY
   */
  #draw(fromX, fromY, toX, toY) {
    const path = this.#path;

    if (path.parentElement === null) {
      addConnection(path);
    }

    path.setAttribute("d", `M ${fromX} ${fromY} L ${toX} ${toY} Z`);
  }
}