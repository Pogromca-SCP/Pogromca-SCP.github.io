// @ts-check
import { CompiledNode } from "../compiler/nodes.js";
import { doAction } from "../history.js";
import { hasFlag } from "../utils.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

const NODE_CLASS = "node";
const SELECTION_CLASS = "node selected";
export const DRAG_DROP_DATA_FORMAT = "text/plain";
export const UNIQUE = 1;
/** @type {[number, number, number, number]} */
const coords = [0, 0, 0, 0];

/** @param {MouseEvent} e */
const continueDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  const x = coords[0];
  const y = coords[1];

  for (const node of EditorNode.selectedNodes) {
    node.moveVisualOnly(x, y);
  }
};

/** @param {MouseEvent} e */
const endDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;
  const node = EditorNode.selectedNodes[0];
  node?.finishMove();
};

/** @param {MouseEvent} e */
const startDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueDrag;
  document.onmouseup = endDrag;
};

class PlaceNodesAction {
  /**
   * @type {readonly EditorNode[]}
   * @readonly
   */
  nodes;

  /**
   * @type {boolean}
   * @readonly
   */
  isPlaceOp;

  /**
   * @param {readonly EditorNode[]} nodes
   * @param {boolean} isPlaceOp
   */
  constructor(nodes, isPlaceOp) {
    this.nodes = nodes;
    this.isPlaceOp = isPlaceOp;
  }

  do() {
    if (this.isPlaceOp) {
      this.#showNodes();
    } else {
      this.#hideNodes();
    }
  }

  undo() {
    if (this.isPlaceOp) {
      this.#hideNodes();
    } else {
      this.#showNodes();
    }
  }

  #showNodes() {
    for (const node of this.nodes) {
      node.transientAdd();
    }
  }

  #hideNodes() {
    for (const node of this.nodes) {
      node.transientDelete();
    }
  }
}

class MoveNodesAction {
  /**
   * @type {readonly EditorNode[]}
   * @readonly
   */
  nodes;

  /**
   * @type {number}
   * @readonly
   */
  offsetX;

  /**
   * @type {number}
   * @readonly
   */
  offsetY;

  /**
   * @param {readonly EditorNode[]} nodes
   * @param {number} offsetX
   * @param {number} offsetY
   */
  constructor(nodes, offsetX, offsetY) {
    this.nodes = nodes;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  do() {
    this.#moveNodes(this.offsetX, this.offsetY);
  }

  undo() {
    this.#moveNodes(-this.offsetX, -this.offsetY);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  #moveNodes(x, y) {
    for (const node of this.nodes) {
      node.transientMove(x, y);
    }
  }
}

export class EditorNode {
  /**
   * @type {Set<EditorNode>}
   * @readonly
   */
  static #selection = new Set();
  /**
   * @type {number}
   * @readonly
   */
  #flags;
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

  /**
   * @param {number} flags
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {string} color
   * @param {...SocketBase} sockets
   */
  constructor(flags, x, y, name, color, ...sockets) {
    this.#flags = flags;
    x -= graph.offsetLeft;
    y -= graph.offsetTop;
    this.#x = x;
    this.#y = y;
    const root = document.createElement("div");
    root.className = NODE_CLASS;
    const style = root.style;
    style.left = `${x}px`;
    style.top = `${y}px`;
    style.backgroundColor = color;
    const title = document.createElement("p");
    title.innerText = name;
    root.appendChild(title);
    this.#title = title;

    root.onmousedown = e => {
      if (this.isSelected) {
        startDrag(e);
      }
    };

    root.onclick = e => {
      e.stopPropagation();

      if (!this.isSelected) {
        this.select();
      }
    };

    this.#root = root;

    for (const socket of sockets) {
      socket.render(root);
    }
  }

  static get selectedNodes() {
    return Array.from(EditorNode.#selection);
  }

  get flags() {
    return this.#flags;
  }

  get x() {
    return this.#x;
  }

  get y() {
    return this.#y;
  }

  get isSelected() {
    return EditorNode.#selection.has(this);
  }

  get isVisible() {
    return this.#root.parentElement !== null;
  }

  static clearSelection() {
    for (const node of EditorNode.selectedNodes) {
      node.diselect();
    }
  }

  static deleteSelection() {
    doAction(new PlaceNodesAction(EditorNode.selectedNodes, false));
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  static moveSelection(x, y) {
    doAction(new MoveNodesAction(EditorNode.selectedNodes, x, y));
  }

  select() {
    this.#root.className = SELECTION_CLASS;
    EditorNode.#selection.add(this);
  }

  diselect() {
    this.#root.className = NODE_CLASS;
    EditorNode.#selection.delete(this);
  }

  add() {
    if (this.isVisible) {
      return false;
    }

    if (hasFlag(this.#flags, UNIQUE)) {
      this.transientAdd();
    } else {
      doAction(new PlaceNodesAction([this], true));
    }

    return true;
  }

  transientAdd() {
    graph.appendChild(this.#root);
  }

  delete() {
    if (!this.isVisible || hasFlag(this.#flags, UNIQUE)) {
      return false;
    }

    doAction(new PlaceNodesAction([this], false));
    return true;
  }

  transientDelete() {
    this.diselect();
    graph.removeChild(this.#root);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  move(x, y) {
    if (this.#x === x && this.#y === y) {
      return false;
    }

    doAction(new MoveNodesAction([this], this.#x - x, this.#y - y));
    return true;
  }

  finishMove() {
    const root = this.#root;
    EditorNode.moveSelection(root.offsetLeft - this.#x, root.offsetTop - this.#y);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  transientMove(x, y) {
    this.#x += x;
    this.#y += y;
    const style = this.#root.style;
    style.left = `${this.#x}px`;
    style.top = `${this.#y}px`;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  moveVisualOnly(x, y) {
    const root = this.#root;
    x = root.offsetLeft - x;
    y = root.offsetTop - y;
    const style = root.style;
    style.left = `${x}px`;
    style.top = `${y}px`;
  }
}

graph.addEventListener("dragover", e => e.preventDefault());

graph.addEventListener("drop", e => {
  const node = CompiledNode.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");

  if (node === undefined) {
    return;
  }

  node.instantiate(e.clientX, e.clientY).add();
});

graph.addEventListener("click", e => EditorNode.clearSelection());