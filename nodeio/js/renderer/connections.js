// @ts-check

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

const org = /** @type {HTMLDivElement} */ (document.getElementById("origin"));
const SVG_URL = "http://www.w3.org/2000/svg";

class ConnectionsGroup {
  /**
   * @type {SVGElement}
   * @readonly
   */
  #svg;
  /**
   * @type {Set<Connection>}
   * @readonly
   */
  #connections;

  constructor() {
    console.debug("created new group");
    this.#svg = document.createElementNS(SVG_URL, "svg");
    this.#connections = new Set();
  }

  /** @param {Connection} connection */
  add(connection) {
    const svg = this.#svg;
    const connections = this.#connections;

    if (connections.size < 1) {
      org.appendChild(svg);
    }

    svg.appendChild(connection.path);
    connections.add(connection);
  }

  /** @param {Connection} connection */
  remove(connection) {
    const svg = this.#svg;
    const connections = this.#connections;
    svg.removeChild(connection.path);
    connections.delete(connection);

    if (connections.size < 1) {
      org.removeChild(svg);
    }
  }
}

/** @type {ConnectionsGroup | null} */
let drawnGroup = null;
/** @type {Connection | null} */
let current = null;
/** @type {[number, number, number, number]} */
const coords = [0, 0, 0, 0];

/** @param {MouseEvent} e */
const continueDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  current?.drawInProgress(coords[0], coords[1]);
};

/** @param {MouseEvent} e */
const endDrag = e => {
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

export class Connection {
  /**
   * @type {SVGPathElement}
   * @readonly
   */
  path;
  /** @type {SocketBase | null} */
  #input;
  /** @type {SocketBase | null} */
  #output;
  /** @type {ConnectionsGroup | null} */
  #group;

  /**
   * @param {SocketBase} socket
   * @param {boolean} isInput
   */
  constructor(socket, isInput) {
    this.path = document.createElementNS(SVG_URL, "path");
    this.#input = isInput ? socket : null;
    this.#output = isInput ? null : socket;
    this.#group = null;
  }

  /** @param {SocketBase} socket */
  finalize(socket) {
    this.#input ??= socket;
    this.#output ??= socket;
    drawnGroup = null;
    this.redraw();
  }

  /** @param {MouseEvent} e */
  startDraw(e) {
    current = this;
    startDrag(e);
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

  cancelDraw() {
    current = null;
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
    this.#group?.remove(this);
  }

  /**
   * @param {number} fromX
   * @param {number} fromY
   * @param {number} toX
   * @param {number} toY
   */
  #draw(fromX, fromY, toX, toY) {
    console.debug("drawing connection");

    if (this.#group === null) {
      drawnGroup ??= new ConnectionsGroup();
      this.#group = drawnGroup;
      drawnGroup.add(this);
    }

    this.path.style.d = `C ${fromX},${fromY} ${fromX + ((toX - fromX) / 2)},${fromY + ((toY - fromY) / 2)} ${toX},${toY}`;
  }
}