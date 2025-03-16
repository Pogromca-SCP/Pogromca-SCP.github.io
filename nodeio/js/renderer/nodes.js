// @ts-check
import { doAction } from "../history.js";
import { closeContextMenu, showContextMenu } from "../menu.js";
import { ERROR_CLASS, hasFlag } from "../utils.js";
import { Connection } from "./connections.js";
import { addElement, bindGraphClick, getOffsetLeft, getOffsetTop, removeElement, startDrag } from "./graph.js";

/**
 * @typedef {import("../compiler/nodes.js").CompiledNode} CompiledNode
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 */

const NODE_CLASS = "node";
const SELECTION_CLASS = "node selected";
export const UNIQUE = 1;

const nodeDragEnd = () => {
  const node = EditorNode.selectedNodes[0];
  node?.finalizeMove();
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

    Connection.finishMassRedraw();
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

    Connection.finishMassRedraw();
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
   * @type {CompiledNode | null}
   * @readonly
   */
  #type;
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
  /**
   * @type {readonly SocketBase[]}
   * @readonly
   */
  #sockets;
  /** @type {number} */
  #x;
  /** @type {number} */
  #y;

  /**
   * @param {number} flags
   * @param {CompiledNode | null} type
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {string} color
   * @param {...SocketBase} sockets
   */
  constructor(flags, type, x, y, name, color, ...sockets) {
    this.#flags = flags;
    this.#type = type;
    this.#x = getOffsetLeft(x);
    this.#y = getOffsetTop(y);
    const root = document.createElement("div");
    this.#root = root;
    this.#title = document.createElement("p");
    this.#sockets = sockets.sort((s1, s2) => s1.slot - s2.slot);
    this.#createRoot(color);
    this.#createTitle(name);
    this.#bindEvents();

    for (const socket of sockets) {
      socket.render(root);
    }
  }

  static get selectedNodes() {
    return Array.from(EditorNode.#selection);
  }

  static get selectedNonUniqueNodes() {
    return EditorNode.selectedNodes.filter(n => !hasFlag(n.#flags, UNIQUE));
  }

  get flags() {
    return this.#flags;
  }

  get type() {
    return this.#type;
  }

  get sockets() {
    return this.#sockets;
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

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  static moveSelection(offsetX, offsetY) {
    if (EditorNode.#selection.size > 0 && offsetX !== 0 && offsetY !== 0) {
      doAction(new MoveNodesAction(EditorNode.selectedNodes, offsetX, offsetY));
    }
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  static moveSelectionVisualOnly(offsetX, offsetY) {
    for (const node of EditorNode.#selection) {
      node.moveVisualOnly(offsetX, offsetY);
    }

    Connection.finishMassRedraw();
  }

  select() {
    this.#root.className = SELECTION_CLASS;
    EditorNode.#selection.add(this);
  }

  diselect() {
    this.#root.className = NODE_CLASS;
    EditorNode.#selection.delete(this);
  }

  /** @param {string} name */
  setName(name) {
    const title = this.#title;
    title.className = "";
    title.innerHTML = "";
    title.innerText = name;
    this.refreshConnections();
    Connection.finishMassRedraw();
  }

  /** @param {readonly string[]} issues */
  setIssues(issues) {
    const length = issues.length;

    if (length < 1) {
      return;
    }

    const title = this.#title;
    title.className = ERROR_CLASS;
    title.innerHTML = "";
    title.appendChild(document.createTextNode(issues[0]));

    for (let i = 1; i < length; ++i) {
      title.appendChild(document.createElement("br"));
      title.appendChild(document.createTextNode(issues[i]));
    }

    this.refreshConnections();
    Connection.finishMassRedraw();
  }

  /** @param {string} color */
  setColor(color) {
    this.#root.style.backgroundColor = `#${color}`;
  }

  add() {
    if (this.isVisible) {
      return false;
    }

    if (hasFlag(this.#flags, UNIQUE)) {
      this.transientAdd();
      Connection.finishMassRedraw();
    } else {
      doAction(new PlaceNodesAction([this], true));
    }

    return true;
  }

  transientAdd() {
    addElement(this, this.#root);
    this.refreshConnections();
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
    removeElement(this, this.#root);

    for (const socket of this.#sockets) {
      socket.hideConnections();
    }
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

  finalizeMove() {
    const root = this.#root;
    EditorNode.moveSelection(root.offsetLeft - this.#x, root.offsetTop - this.#y);
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  transientMove(offsetX, offsetY) {
    this.#x += offsetX;
    this.#y += offsetY;
    const style = this.#root.style;
    style.left = `${this.#x}px`;
    style.top = `${this.#y}px`;
    this.refreshConnections();
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  moveVisualOnly(offsetX, offsetY) {
    const root = this.#root;
    offsetX = root.offsetLeft - offsetX;
    offsetY = root.offsetTop - offsetY;
    const style = root.style;
    style.left = `${offsetX}px`;
    style.top = `${offsetY}px`;
    this.refreshConnections();
  }

  refreshConnections() {
    for (const socket of this.#sockets) {
      socket.refreshConnections();
    }
  }

  /** @param {string} color */
  #createRoot(color) {
    const root = this.#root;
    root.className = NODE_CLASS;
    const style = root.style;
    style.left = `${this.#x}px`;
    style.top = `${this.#y}px`;
    style.backgroundColor = `#${color}`;
  }

  /** @param {string} name */
  #createTitle(name) {
    const title = this.#title;
    title.innerText = name;
    this.#root.appendChild(title);
  }

  #bindEvents() {
    const root = this.#root;

    root.onmousedown = e => {
      e.stopPropagation();

      if (this.isSelected) {
        startDrag(e, EditorNode.moveSelectionVisualOnly, nodeDragEnd);
      }
    };

    root.onclick = e => {
      e.stopPropagation();
      closeContextMenu();

      if (!this.isSelected) {
        this.select();
      }
    };

    if (!hasFlag(this.#flags, UNIQUE)) {
      root.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();

        showContextMenu(e.clientX, e.clientY, [
          [
            { name: "Delete", handler: e => this.delete() },
          ],
        ]);
      };
    }
  }
}

bindGraphClick(EditorNode.clearSelection);