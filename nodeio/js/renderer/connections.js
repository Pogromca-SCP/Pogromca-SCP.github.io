// @ts-check
import { startDrag, SVG_URL } from "./graph.js";

/**
 * @typedef {import("./graph.js").NodeGraph} NodeGraph
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 * @typedef {import("./sockets.js").OutputSocket} OutputSocket
 */

/** @abstract */
class ConnectionBase {
  /**
   * @type {SVGPathElement}
   * @readonly
   */
  #path;
  /**
   * @type {NodeGraph}
   * @readonly
   */
  #graph;

  /** @param {NodeGraph} graph */
  constructor(graph) {
    if (this.constructor === ConnectionBase) {
      throw new Error("Cannot instantiatea an abstract class: ConnectionBase");
    }

    this.#path = document.createElementNS(SVG_URL, "path");
    this.#graph = graph;
  }

  remove() {
    const path = this.#path;

    if (path.parentElement !== null) {
      this.#graph.removeConnection(path);
    }
  }

  /**
   * @param {number} fromX
   * @param {number} fromY
   * @param {number} toX
   * @param {number} toY
   */
  draw(fromX, fromY, toX, toY) {
    const half = fromX + ((toX - fromX) / 2);
    const minFromX = fromX + 100;
    const minToX = toX - 100;
    const path = this.#path;

    if (path.parentElement === null) {
      this.#graph.addConnection(path);
    }

    path.setAttribute("d",
      `M ${fromX} ${fromY} C ${minFromX < half ? half : minFromX} ${fromY}, ${minToX > half ? half : minToX} ${toY}, ${toX} ${toY}`);
    console.debug(`M ${fromX} ${fromY} C ${minFromX < half ? half : minFromX} ${fromY}, ${minToX > half ? half : minToX} ${toY}, ${toX} ${toY}`);
  }
}

export class Connection extends ConnectionBase {
  /**
   * @type {Set<Connection>}
   * @readonly
   */
  static #toRedraw = new Set();
  /**
   * @type {SocketBase}
   * @readonly
   */
  #input;
  /**
   * @type {SocketBase}
   * @readonly
   */
  #output;

  /**
   * @param {NodeGraph} graph
   * @param {SocketBase} input
   * @param {SocketBase} output
   */
  constructor(graph, input, output) {
    super(graph);
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

  redraw() {
    const start = this.#output;
    const end = this.#input;
    this.draw(start.right, start.height, end.left, end.height);
  }

  queueRedraw() {
    Connection.#toRedraw.add(this);
  }
}

export class DraggableConnection extends ConnectionBase {
  /**
   * @type {SocketBase}
   * @readonly
   */
  #socket;
  /**
   * @type {boolean}
   * @readonly
   */
  #isInput;
  /** @type {number} */
  #x;
  /** @type {number} */
  #y;

  /**
   * @param {NodeGraph} graph
   * @param {SocketBase} socket
   * @param {boolean} isInput
   */
  constructor(graph, socket, isInput) {
    super(graph);
    this.#socket = socket;
    this.#isInput = isInput;
    this.#x = isInput ? socket.left : socket.right;
    this.#y = socket.height;
  }

  get socket() {
    return this.#socket;
  }

  get isInput() {
    return this.#isInput;
  }

  /** @param {MouseEvent} e */
  startDraw(e) {
    startDrag(e, (x, y) => this.drawInProgress(x, y), () => this.remove());
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  drawInProgress(offsetX, offsetY) {
    const socket = this.#socket;
    this.#x -= offsetX;
    this.#y -= offsetY;

    if (this.#isInput) {
      this.draw(this.#x, this.#y, socket.left, socket.height);
    } else {
      this.draw(socket.right, socket.height, this.#x, this.#y);
    }
  }
}