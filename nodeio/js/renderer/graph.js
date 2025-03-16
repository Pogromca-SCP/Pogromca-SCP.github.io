// @ts-check
import { stopDefault } from "../utils.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * @typedef {import("../compiler/nodes.js").CompiledNode} CompiledNode
 * @typedef {import("./nodes.js").EditorNode} EditorNode
 */

export const DRAG_DROP_DATA_FORMAT = "text/plain";
export const SVG_URL = "http://www.w3.org/2000/svg";
export const ROOT = "Root";

export class NodeGraph {
  /** @type {NodeGraph} */
  static #currentGraph = /** @type {NodeGraph} */ ({ remove() {} });

  /**
   * @type {HTMLDivElement}
   * @readonly
   */
  #origin;

  /**
   * @type {SVGSVGElement}
   * @readonly
   */
  #connections;

  /**
   * @type {Set<EditorNode>}
   * @readonly
   */
  #nodes;

  constructor() {
    const origin = document.createElement("div");
    origin.className = "origin";
    const connections = document.createElementNS(SVG_URL, "svg");
    origin.appendChild(connections);
    this.#origin = origin;
    this.#connections = connections;
    this.#nodes = new Set();
  }

  static get currentGraph() {
    return this.#currentGraph;
  }

  get offsetLeft() {
    return this.#origin.offsetLeft;
  }

  get offsetTop() {
    return this.#origin.offsetTop;
  }

  /** @param {NodeGraph} gr */
  static switchGraph(gr) {
    const current = NodeGraph.#currentGraph;
    
    if (current === gr) {
      return;
    }

    current.remove();
    NodeGraph.#currentGraph = gr;
    gr.attach();
  }

  /** @param {NodeGraph} gr */
  static switchToRootIfDeleted(gr) {
    if (NodeGraph.#currentGraph === gr) {
      library.get(ROOT)?.openInEditor();
    }
  }

  centerOrigin() {
    const org = this.#origin;
    const style = org.style;
    style.left = "0";
    style.top = "0";
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  moveOrigin(x, y) {
    const org = this.#origin;
    const style = org.style;
    style.left = `${org.offsetLeft - x}px`;
    style.top = `${org.offsetTop - y}px`;
  }

  attach() {
    const org = this.#origin;

    if (org.parentElement === null) {
      graph.appendChild(org);
    }
  }

  remove() {
    const org = this.#origin;

    if (org.parentElement !== null) {
      graph.removeChild(org);
    }
  }

  /**
   * @param {EditorNode} node
   * @param {HTMLElement} child
   */
  addNode(node, child) {
    if (node.type !== null) {
      this.#nodes.add(node);
    }

    this.#origin.appendChild(child);
  }

  /**
   * @param {EditorNode} node
   * @param {HTMLElement} child
   */
  removeNode(node, child) {
    if (node.type !== null) {
      this.#nodes.delete(node);
    }

    this.#origin.removeChild(child);
  }

  /** @param {SVGPathElement} connection */
  addConnection(connection) {
    this.#connections.appendChild(connection);
  }

  /** @param {SVGPathElement} connection */
  removeConnection(connection) {
    this.#connections.removeChild(connection);
  }
}

/** @type {Map<string, CompiledNode>} */
const library = new Map();
/** @type {[number, number, number, number]} */
const coords = [0, 0, 0, 0];
/** @type {((x: number, y: number) => void) | null} */
let onDrag = null;
/** @type {(() => void) | null} */
let onEnd = null;

/** @param {MouseEvent} e */
const continueDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  
  if (onDrag !== null) {
    onDrag(coords[0], coords[1]);
  }
};

/** @param {MouseEvent} e */
const continueBgDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  NodeGraph.currentGraph.moveOrigin(coords[0], coords[1]);
};

/** @param {Readonly<MouseEvent>} e */
const endDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;

  if (onEnd !== null) {
    onEnd();
  }

  onDrag = null;
  onEnd = null;
};

/** @param {Readonly<MouseEvent>} e */
const endBgDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;
};

/**
 * @param {Readonly<MouseEvent>} e
 * @param {((x: number, y: number) => void) | null} dragHandler
 * @param {(() => void) | null} endHandler
 */
export const startDrag = (e, dragHandler, endHandler) => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  onDrag = dragHandler;
  onEnd = endHandler;
  document.onmousemove = continueDrag;
  document.onmouseup = endDrag;
};

/** @param {Readonly<MouseEvent>} e */
const startBgDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueBgDrag;
  document.onmouseup = endBgDrag;
};

export const getAllNodes = () => library.values();

/**
 * @param {string} id
 * @param {CompiledNode} node
 */
export const registerNode = (id, node) => library.set(id, node);

/** @param {string} id */
export const unregiserNode = id => library.delete(id);

/** @param {string} id */
export const nodeExists = id => library.has(id);

/** @param {string} id */
export const getNode = id => library.get(id);

/** @param {number} x */
export const getOffsetTop = x => x - NodeGraph.currentGraph.offsetTop - graph.offsetTop;

/** @param {number} x */
export const getOffsetLeft = x => x - NodeGraph.currentGraph.offsetLeft - graph.offsetLeft;

/** @param {() => void} handler */
export const bindGraphClick = handler => graph.addEventListener("click", handler);

graph.addEventListener("dragover", stopDefault);

graph.addEventListener("drop", e => {
  const node = library.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");

  if (node === undefined) {
    return;
  }

  node.instantiate(e.clientX, e.clientY).add();
});

graph.addEventListener("mousedown", startBgDrag);