// @ts-check
import { CompiledNode } from "../compiler/nodes.js";
import { doAction } from "../history.js";
import { diselect, getSelection, isSelected, select, startDrag } from "./selection.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

const NODE_CLASS = "node";
const SELECTION_CLASS = "node selected";
export const DRAG_DROP_DATA_FORMAT = "text/plain";
export const REMOVABLE = 1;

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
      node.applyMove(x, y);
    }
  }
}

export class EditorNode {
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
      if (this.selected) {
        startDrag(e);
      }
    };

    root.onclick = e => {
      if (this.selected) {
        this.diselect();
      } else {
        this.select();
      }
    };

    this.#root = root;

    for (const socket of sockets) {
      socket.render(root);
    }
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

  get selected() {
    return isSelected(this);
  }

  get visible() {
    return this.#root.parentElement !== null;
  }

  static deleteSelection() {
    doAction(new PlaceNodesAction(getSelection(), false));
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  static moveSelection(x, y) {
    doAction(new MoveNodesAction(getSelection(), x, y));
  }

  select() {
    this.#root.className = SELECTION_CLASS;
    select(this);
  }

  diselect() {
    this.#root.className = NODE_CLASS;
    diselect(this);
  }

  add() {
    if (this.visible) {
      return false;
    }

    doAction(new PlaceNodesAction([this], true));
    return true;
  }

  transientAdd() {
    graph.appendChild(this.#root);
  }

  delete() {
    if (!this.visible) {
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
   * @returns {[number, number]}
   */
  calculateOffsets(x, y) {
    const root = this.#root;
    return [this.#x - (root.offsetLeft - x), this.#y - (root.offsetTop - y)];
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} [applyOffset]
   */
  move(x, y, applyOffset = true) {
    if (applyOffset) {
      const root = this.#root;
      x = root.offsetLeft - x;
      y = root.offsetTop - y;
    }

    if (this.#x === x && this.#y === y) {
      return false;
    }

    doAction(new MoveNodesAction([this], this.#x - x, this.#y - y));
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  finishMove(x, y) {
    const root = this.#root;
    x = root.offsetLeft - x;
    y = root.offsetTop - y;
    EditorNode.moveSelection(this.#x - x, this.#y - y);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {boolean} [applyOffset]
   */
  transientMove(x, y, applyOffset = true) {
    const root = this.#root;
    
    if (applyOffset) {
      x = root.offsetLeft - x;
      y = root.offsetTop - y;
    }

    const style = root.style;
    style.left = `${x}px`;
    style.top = `${y}px`;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  applyMove(x, y) {
    this.#x += x;
    this.#y += y;
    const style = this.#root.style;
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

  node.instantiate(e.clientX, e.clientY).add();
});