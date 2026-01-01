// @ts-check
import { stopDefault } from "../utils.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * @typedef {import("../compiler/nodes.js").CompiledNode} CompiledNode
 * @typedef {import("./nodes.js").EditorNode} EditorNode
 */

export const DRAG_DROP_DATA_FORMAT = "text/plain";
export const SVG_URL = "http://www.w3.org/2000/svg";
export const ROOT = "root";

export class NodeGraph {
  static onGraphChange = () => {};
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

  /** @type {EditorNode | null} */
  #outputsNode;

  /** @type {EditorNode | null} */
  #inputsNode;

  constructor() {
    const origin = document.createElement("div");
    origin.className = "origin";
    const connections = document.createElementNS(SVG_URL, "svg");
    origin.appendChild(connections);
    this.#origin = origin;
    this.#connections = connections;
    this.#nodes = new Set();
    this.#outputsNode = null;
    this.#inputsNode = null;
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

  get outputsNode() {
    return this.#outputsNode;
  }

  get inputsNode() {
    return this.#inputsNode;
  }

  get addedNodes() {
    return Array.from(this.#nodes);
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
    const out = gr.#outputsNode;
    const ins = gr.#inputsNode;

    if (out !== null && !out.isVisible) {
      out.add();
    }

    if (ins !== null && !ins.isVisible) {
      ins.add();
    }
  }

  /** @param {NodeGraph} gr */
  static switchToRootIfDeleted(gr) {
    if (NodeGraph.#currentGraph === gr) {
      library.get(ROOT)?.openInEditor();
    }
  }

  static centerCurrent() {
    NodeGraph.#currentGraph.centerOrigin();
  }

  centerOrigin() {
    const style = this.#origin.style;
    const value = "0";
    style.left = value;
    style.top = value;
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  moveOrigin(offsetX, offsetY) {
    const org = this.#origin;
    const style = org.style;
    style.left = `${org.offsetLeft - offsetX}px`;
    style.top = `${org.offsetTop - offsetY}px`;
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
      NodeGraph.onGraphChange();
    }
  }

  /** @param {EditorNode} inputs */
  addInputs(inputs) {
    this.#inputsNode ??= inputs;
  }

  /** @param {EditorNode} outputs */
  addOutputs(outputs) {
    this.#outputsNode ??= outputs;
  }

  /**
   * @param {HTMLElement} child
   * @param {EditorNode} node
   */
  addNode(child, node) {
    if (node.type !== null) {
      this.#nodes.add(node);
    }

    this.#origin.appendChild(child);
  }

  /**
   * @param {HTMLElement} child
   * @param {EditorNode} node
   */
  removeNode(child, node) {
    this.#nodes.delete(node);
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
let draggedType = "";

/** @param {MouseEvent} e */
const continueDrag = e => {
  e.preventDefault();
  const clX = e.clientX;
  const clY = e.clientY;
  coords[0] = coords[2] - clX;
  coords[1] = coords[3] - clY;
  coords[2] = clX;
  coords[3] = clY;
  
  if (onDrag !== null) {
    onDrag(coords[0], coords[1]);
  }
};

/** @param {MouseEvent} e */
const continueBgDrag = e => {
  e.preventDefault();
  const clX = e.clientX;
  const clY = e.clientY;
  coords[0] = coords[2] - clX;
  coords[1] = coords[3] - clY;
  coords[2] = clX;
  coords[3] = clY;
  NodeGraph.currentGraph.moveOrigin(coords[0], coords[1]);
};

/** @param {TouchEvent} e */
const continueTouch = e => {
  e.preventDefault();
  const touches = e.targetTouches[0];
  const clX = touches.pageX;
  const clY = touches.pageY;
  coords[0] = coords[2] - clX;
  coords[1] = coords[3] - clY;
  coords[2] = clX;
  coords[3] = clY;
  
  if (onDrag !== null) {
    onDrag(coords[0], coords[1]);
  }
};

/** @param {TouchEvent} e */
const continueBgTouch = e => {
  e.preventDefault();
  const touches = e.targetTouches[0];
  const clX = touches.pageX;
  const clY = touches.pageY;
  coords[0] = coords[2] - clX;
  coords[1] = coords[3] - clY;
  coords[2] = clX;
  coords[3] = clY;
  NodeGraph.currentGraph.moveOrigin(coords[0], coords[1]);
};

const endBgDrag = () => {
  document.onmousemove = null;
  document.onmouseup = null;
};

/** @param {Readonly<MouseEvent>} e */
const endDrag = e => {
  endBgDrag();

  if (onEnd !== null) {
    onEnd();
  }

  onDrag = null;
  onEnd = null;
};

const endBgTouch = () => {
  document.ontouchmove = null;
  document.ontouchend = null;
  document.ontouchcancel = null;
};

/** @param {Readonly<TouchEvent>} e */
const endTouch = e => {
  endBgTouch();

  if (onEnd !== null) {
    onEnd();
  }

  onDrag = null;
  onEnd = null;
};

/**
 * @param {Readonly<MouseEvent>} e
 * @param {((x: number, y: number) => void) | null} dragHandler
 * @param {(() => void) | null} endHandler
 */
export const startDrag = (e, dragHandler, endHandler) => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;

  if (onEnd !== null) {
    onEnd();
    onEnd = null;
  }
  
  endBgTouch();
  onDrag = dragHandler;
  onEnd = endHandler;
  document.onmousemove = continueDrag;
  document.onmouseup = endDrag;
};

/** @param {Readonly<MouseEvent>} e */
const startBgDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  
  if (onEnd !== null) {
    onEnd();
    onEnd = null;
  }

  endBgTouch();
  document.onmousemove = continueBgDrag;
  document.onmouseup = endBgDrag;
};

/**
 * @param {Readonly<TouchEvent>} e
 * @param {((x: number, y: number) => void) | null} touchHandler
 * @param {(() => void) | null} endHandler
 */
export const startTouch = (e, touchHandler, endHandler) => {
  const touches = e.targetTouches[0];
  coords[2] = touches.pageX;
  coords[3] = touches.pageY;

  if (onEnd !== null) {
    onEnd();
    onEnd = null;
  }
  
  endBgDrag();
  onDrag = touchHandler;
  onEnd = endHandler;
  document.ontouchmove = continueTouch;
  document.ontouchend = endTouch;
  document.ontouchcancel = endTouch;
};

/** @param {Readonly<TouchEvent>} e */
const startBgTouch = e => {
  const touches = e.targetTouches[0];
  coords[2] = touches.pageX;
  coords[3] = touches.pageY;
  
  if (onEnd !== null) {
    onEnd();
    onEnd = null;
  }

  endBgDrag();
  document.ontouchmove = continueBgTouch;
  document.ontouchend = endBgTouch;
  document.ontouchcancel = endBgTouch;
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

/** @param {string} value */
export const setDraggedNode = value => draggedType = value;

/**
 * @param {number} x
 * @param {NodeGraph} gr
 */
const getOffsetTop = (x, gr) => x - gr.offsetTop - graph.offsetTop;

/**
 * @param {number} x
 * @param {NodeGraph} gr
 */
const getOffsetLeft = (x, gr) => x - gr.offsetLeft - graph.offsetLeft;

/** @param {() => void} handler */
export const bindGraphClick = handler => graph.addEventListener("click", handler);

graph.addEventListener("dragover", stopDefault);

graph.addEventListener("drop", e => {
  const node = library.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");
  draggedType = "";

  if (node !== undefined) {
    const gr = NodeGraph.currentGraph;
    node.instantiate(getOffsetLeft(e.clientX, gr), getOffsetTop(e.clientY, gr), gr).add();
  }
});

graph.addEventListener("touchend", e => {
  const node = library.get(draggedType);
  draggedType = "";

  if (node !== undefined) {
    const touches = e.targetTouches[0];
    const gr = NodeGraph.currentGraph;
    node.instantiate(getOffsetLeft(touches.pageX, gr), getOffsetTop(touches.pageY, gr), gr).add();
  }
});

graph.addEventListener("touchcancel", e => draggedType = "");
graph.addEventListener("mousedown", startBgDrag);
graph.addEventListener("touchstart", startBgTouch);