// @ts-check
import { CompiledNode } from "../compiler/nodes.js";
import { stopDefault } from "../utils.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));
const org = /** @type {HTMLDivElement} */ (document.getElementById("origin"));

export const DRAG_DROP_DATA_FORMAT = "text/plain";
export const SVG_URL = "http://www.w3.org/2000/svg";
/** @type {[number, number, number, number]} */
const coords = [0, 0, 0, 0];
/** @type {((x: number, y: number) => void) | null} */
let onDrag = null;
/** @type {(() => void) | null} */
let onEnd = null;
/** @type {SVGElement | null} */
let connectionsGroup = null;

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
  const style = org.style;
  style.left = `${org.offsetLeft - coords[0]}px`;
  style.top = `${org.offsetTop - coords[1]}px`;
};

/** @param {MouseEvent} e */
const endDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;

  if (onEnd !== null) {
    onEnd();
  }

  onDrag = null;
  onEnd = null;
};

/** @param {MouseEvent} e */
const endBgDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;
};

/**
 * @param {MouseEvent} e
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

/** @param {MouseEvent} e */
const startBgDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueBgDrag;
  document.onmouseup = endBgDrag;
};

/** @param {HTMLElement} element */
export const addElement = element => {
  org.appendChild(element)

  if (connectionsGroup !== null && connectionsGroup.children.length < 1) {
    org.removeChild(connectionsGroup);
  }

  connectionsGroup = null;
};

/** @param {HTMLElement} element */
export const removeElement = element => org.removeChild(element);

/** @param {number} x */
export const getOffsetTop = x => x - org.offsetTop - graph.offsetTop;

/** @param {number} x */
export const getOffsetLeft = x => x - org.offsetLeft - graph.offsetLeft;

/** @param {SVGPathElement} connection */
export const addConnection = connection => {
  if (connectionsGroup === null) {
    connectionsGroup = document.createElementNS(SVG_URL, "svg");
    org.appendChild(connectionsGroup);
  }

  connectionsGroup.appendChild(connection);
  return connectionsGroup;
};

/**
 * @param {SVGElement} group
 * @param {SVGPathElement} connection
 */
export const removeConnection = (group, connection) => {
  group.removeChild(connection);

  if (group !== connectionsGroup && group.children.length < 1) {
    org.removeChild(group);
  }
};

/** @param {() => void} handler */
export const bindGraphClick = handler => graph.addEventListener("click", handler);

graph.addEventListener("dragover", stopDefault);

graph.addEventListener("drop", e => {
  const node = CompiledNode.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");

  if (node === undefined) {
    return;
  }

  node.instantiate(e.clientX, e.clientY).add();
});

graph.addEventListener("mousedown", startBgDrag);