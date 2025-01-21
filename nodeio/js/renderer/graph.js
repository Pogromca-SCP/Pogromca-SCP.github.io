// @ts-check
import { CompiledNode } from "../compiler/nodes.js";
import { doAction } from "../history.js";
import { closeContextMenu, showContextMenu } from "../menu.js";
import { ERROR_CLASS, hasFlag } from "../utils.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));
const org = /** @type {HTMLDivElement} */ (document.getElementById("origin"));

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
const continueNodeDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  EditorNode.moveSelectionVisualOnly(coords[0], coords[1]);
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
const endNodeDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;
  const node = EditorNode.selectedNodes[0];
  node?.finalizeMove();
};

/** @param {MouseEvent} e */
const endBgDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;
};

/** @param {MouseEvent} e */
const startNodeDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueNodeDrag;
  document.onmouseup = endNodeDrag;
};

/** @param {MouseEvent} e */
const startBgDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueBgDrag;
  document.onmouseup = endBgDrag;
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
    this.#x = x - org.offsetLeft - graph.offsetLeft;
    this.#y = y - org.offsetTop - graph.offsetTop;
    const root = document.createElement("div");
    this.#root = root;
    this.#title = document.createElement("p");
    this.#createRoot(color);
    this.#createTitle(name);
    this.#bindEvents();

    for (const socket of sockets.sort((s1, s2) => s1.slot - s2.slot)) {
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
  }

  /** @param {string} color */
  setColor(color) {
    this.#root.style.backgroundColor = color;
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
    org.appendChild(this.#root);
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
    org.removeChild(this.#root);
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
  }

  /** @param {string} color */
  #createRoot(color) {
    const root = this.#root;
    root.className = NODE_CLASS;
    const style = root.style;
    style.left = `${this.#x}px`;
    style.top = `${this.#y}px`;
    style.backgroundColor = color;
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
        startNodeDrag(e);
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

graph.addEventListener("dragover", e => e.preventDefault());

graph.addEventListener("drop", e => {
  const node = CompiledNode.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");

  if (node === undefined) {
    return;
  }

  node.instantiate(e.clientX, e.clientY).add();
});

graph.addEventListener("click", e => EditorNode.clearSelection());
graph.addEventListener("mousedown", startBgDrag);