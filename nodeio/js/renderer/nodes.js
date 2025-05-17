// @ts-check
import { compileGraph } from "../compiler/compiler.js";
import { doAction } from "../history.js";
import { closeContextMenu, showContextMenu } from "../menu.js";
import { ERROR_CLASS } from "../utils.js";
import { Connection } from "./connections.js";
import { bindGraphClick, getOffsetLeft, getOffsetTop, NodeGraph, startDrag } from "./graph.js";
import { NamedSocket, NumberSocket, OutputSocket, RepetetiveSocket, SelectSocket, SwitchSocket, TextSocket } from "./sockets.js";

/**
 * @typedef {import("../compiler/nodes.js").CompiledNode} CompiledNode
 * @typedef {import("./sockets.js").SocketBase} SocketBase
 * @typedef {import("./sockets.js").SocketValue} SocketValue
 * 
 * @typedef {object} SocketDef
 * @property {DataSource<string>} name
 * @property {"named" | "number" | "select" | "switch" | "text" | "output" | "repetetive"} type
 * @property {string[] | string} [connectionType]
 * @property {DynamicData<boolean>} [visible]
 * 
 * @typedef {object} NumberDef
 * @property {number} def
 * @property {boolean} connective
 * @property {number} min
 * @property {number} max
 * @property {number} step
 * 
 * @typedef {object} SelectDef
 * @property {string} def
 * @property {string[]} options
 * 
 * @typedef {object} SwitchDef
 * @property {boolean} def
 * @property {boolean} connective
 * @property {string} active
 * @property {string} inactive
 * 
 * @typedef {object} TextDef
 * @property {string} def
 * @property {boolean} connective
 * @property {number} min
 * @property {number} max
 * @property {string} valid
 * 
 * @typedef {SocketDef & NumberDef} NumberSocketDef
 * @typedef {SocketDef & SelectDef} SelectSocketDef
 * @typedef {SocketDef & SwitchDef} SwitchSocketDef
 * @typedef {SocketDef & TextDef} TextSocketDef
 */

/**
 * @template T
 * @typedef {{ socketId: number, func: (x: SocketValue) => T, def: T }} DynamicData
 */

/**
 * @template T
 * @typedef {T | DynamicData<T>} DataSource
 */

const NODE_CLASS = "node";
const SELECTION_CLASS = "node selected";

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
    compileGraph();
  }

  #hideNodes() {
    for (const node of this.nodes) {
      node.transientDelete();
    }

    compileGraph();
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
   * @type {CompiledNode | null}
   * @readonly
   */
  #type;
  /**
   * @type {NodeGraph}
   * @readonly
   */
  #graph;
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
   * @param {CompiledNode | null} type
   * @param {NodeGraph} graph
   * @param {number} x
   * @param {number} y
   * @param {Readonly<DataSource<string>>} name
   * @param {Readonly<DataSource<string>>} color
   * @param {...Readonly<SocketDef | NumberSocketDef | SelectSocketDef | SwitchSocketDef | TextSocketDef>} sockets
   */
  constructor(type, graph, x, y, name, color, ...sockets) {
    this.#type = type;
    this.#graph = graph;
    this.#x = getOffsetLeft(x, graph);
    this.#y = getOffsetTop(y, graph);
    const root = document.createElement("div");
    this.#root = root;
    this.#title = document.createElement("p");
    this.#createRoot(color);
    this.#createTitle(name);
    this.#sockets = sockets.map(s => this.#loadSocket(s));
    this.#bindEvents();
    this.#setupListeners(name, color, sockets);
  }

  static get selectedNodes() {
    return Array.from(EditorNode.#selection);
  }

  static get selectedNonUniqueNodes() {
    return EditorNode.selectedNodes.filter(n => n.#type !== null);
  }

  get type() {
    return this.#type;
  }

  get graph() {
    return this.#graph;
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

  get left() {
    return this.#root.offsetLeft;
  }

  get top() {
    return this.#root.offsetTop;
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
    this.#title.innerText = name;
    this.refreshConnections();
    Connection.finishMassRedraw();
  }

  /** @param {readonly string[]} issues */
  setIssues(issues) {
    const root = this.#root;

    for (const child of Array.from(root.children).filter(el => el.nodeName.toLowerCase() === "span")) {
      root.removeChild(child);
    }

    if (issues.length < 1) {
      this.#title.className = "";
      this.refreshConnections();
      Connection.finishMassRedraw();
      return;
    }

    for (const issue of issues) {
      const element = document.createElement("span");
      element.innerText = issue;
      root.appendChild(element);
    }

    this.#title.className = ERROR_CLASS;
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

    if (this.#type === null) {
      this.transientAdd();
      Connection.finishMassRedraw();
    } else {
      doAction(new PlaceNodesAction([this], true));
    }

    return true;
  }

  transientAdd() {
    this.#graph.addNode(this.#root, this);
    this.restoreConnections();
  }

  delete() {
    if (!this.isVisible || this.#type === null) {
      return false;
    }

    doAction(new PlaceNodesAction([this], false));
    return true;
  }

  transientDelete() {
    this.diselect();
    this.#graph.removeNode(this.#root, this);
    this.hideConnections();
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

  restoreConnections() {
    for (const socket of this.#sockets) {
      socket.restoreConnections();
    }
  }

  refreshConnections() {
    for (const socket of this.#sockets) {
      socket.refreshConnections();
    }
  }

  hideConnections() {
    for (const socket of this.#sockets) {
      socket.hideConnections();
    }
  }

  /** @param {Readonly<SocketDef>} def */
  #loadSocket(def) {
    const tempName = def.name;
    const name = typeof(tempName) === "string" ? tempName : tempName.def;
    const type = def.connectionType ?? null;

    switch (def.type) {
      case "named":
        return new NamedSocket(this, this.#root, name, type);
      case "number":
        const num = /** @type {NumberSocketDef} */ (def);
        return new NumberSocket(this, this.#root, name, num.def, type, num.connective, num.min, num.max, num.step);
      case "select":
        const sel = /** @type {SelectSocketDef} */ (def);
        return new SelectSocket(this, this.#root, name, sel.def, sel.options);
      case "switch":
        const swt = /** @type {SwitchSocketDef} */ (def);
        return new SwitchSocket(this, this.#root, name, swt.def, type, swt.connective, swt.active, swt.inactive);
      case "text":
        const txt = /** @type {TextSocketDef} */ (def);
        return new TextSocket(this, this.#root, name, txt.def, type, txt.connective, txt.min, txt.max, txt.valid);
      case "repetetive":
        return new RepetetiveSocket(this, this.#root, type);
      default:
        return new OutputSocket(this, this.#root, name, type);
    }
  }

  /** @param {Readonly<DataSource<string>>} color */
  #createRoot(color) {
    const root = this.#root;
    root.className = NODE_CLASS;
    const style = root.style;
    style.left = `${this.#x}px`;
    style.top = `${this.#y}px`;
    const value = typeof(color) === "string" ? color : color.def;
    style.backgroundColor = `#${value}`;
  }

  /** @param {Readonly<DataSource<string>>} name */
  #createTitle(name) {
    const title = this.#title;
    title.innerText = typeof(name) === "string" ? name : name.def;
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

    if (this.#type !== null) {
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

  /**
   * @param {Readonly<DataSource<string>>} name 
   * @param {Readonly<DataSource<string>>} color 
   * @param {readonly Readonly<SocketDef>[]} sockets 
   */
  #setupListeners(name, color, sockets) {
    const scs = this.#sockets;

    if (typeof(name) !== "string") {
      const func = name.func;
      scs[name.socketId]?.listeners?.push({ allowOnRender: false, handler: value => this.setName(func(value)) });
    }

    if (typeof(color) !== "string") {
      const func = color.func;
      scs[color.socketId]?.listeners?.push({ allowOnRender: false, handler: value => this.setColor(func(value)) });
    }

    const len = sockets.length;

    for (let i = 0; i < len; ++i) {
      const def = sockets[i];
      const target = scs[i];
      const tempName = def.name;

      if (typeof(tempName) !== "string") {
        const func = tempName.func;
        scs[tempName.socketId]?.listeners?.push({ allowOnRender: false, handler: value => target.setName(func(value)) });
      }

      const tempVis = def.visible;

      if (tempVis !== undefined) {
        const func = tempVis.func;
        scs[tempVis.socketId]?.listeners?.push({ allowOnRender: true, handler: value => target.setVisibility(value !== null && func(value)) });

        if (!tempVis.def) {
          target.setVisibility(false);
        }
      }
    }
  }
}

bindGraphClick(EditorNode.clearSelection);