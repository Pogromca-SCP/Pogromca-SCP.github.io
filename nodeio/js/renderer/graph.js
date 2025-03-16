// @ts-check
import { stopDefault } from "../utils.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * @typedef {import("../compiler/nodes.js").CompiledNode} CompiledNode
 * @typedef {import("../compiler/nodes.js").NodeGraph} NodeGraph
 * @typedef {import("./nodes.js").EditorNode} EditorNode
 */

export const DRAG_DROP_DATA_FORMAT = "text/plain";
export const SVG_URL = "http://www.w3.org/2000/svg";

/** @type {Map<string, CompiledNode>} */
const library = new Map();
/** @type {NodeGraph} */
let nodeGraph = /** @type {NodeGraph} */ ({ remove() {} });
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
  nodeGraph.moveOrigin(coords[0], coords[1]);
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

/** @param {NodeGraph} gr */
export const openGraph = gr => {
  nodeGraph.remove();
  nodeGraph = gr;
  nodeGraph.attach(graph);
};

export const centerViewport = () => nodeGraph.centerOrigin();

/**
 * @param {EditorNode} node
 * @param {HTMLElement} element
 */
export const addElement = (node, element) => nodeGraph.addNode(node, element);

/**
 * @param {EditorNode} node
 * @param {HTMLElement} element
 */
export const removeElement = (node, element) => nodeGraph.removeNode(node, element);

/** @param {number} x */
export const getOffsetTop = x => x - nodeGraph.offsetTop - graph.offsetTop;

/** @param {number} x */
export const getOffsetLeft = x => x - nodeGraph.offsetLeft - graph.offsetLeft;

/** @param {SVGPathElement} connection */
export const addConnection = connection => nodeGraph.addConnection(connection);

/** @param {SVGPathElement} connection */
export const removeConnection = connection => nodeGraph.removeConnection(connection);

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