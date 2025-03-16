// @ts-check
import { doAction } from "../history.js";
import { showContextMenu } from "../menu.js";
import { nodeExists, openGraph, registerNode, SVG_URL, unregiserNode } from "../renderer/graph.js";
import { EditorNode, UNIQUE } from "../renderer/nodes.js";
import { NamedSocket, OutputSocket } from "../renderer/sockets.js";
import { ERROR_CLASS, hasFlag } from "../utils.js";

class ChangeIdAction {
  /**
   * @type {CompiledNode}
   * @readonly
   */
  node;
  /**
   * @type {string | null}
   * @readonly
   */
  oldId;
  /**
   * @type {string | null}
   * @readonly
   */
  newId;

  /**
   * @param {CompiledNode} node
   * @param {string | null} oldId
   * @param {string | null} newId
   */
  constructor(node, oldId, newId) {
    this.node = node;
    this.oldId = oldId;
    this.newId = newId;
  }

  do() {
    this.node.transientChangeId(this.newId);
  }

  undo() {
    this.node.transientChangeId(this.oldId);
  }
}

const INITIAL_X = 200;
const INITIAL_Y = 500;
export const BUILT_IN_COLOR = "333";
export const USABLE = 1;
export const EDITABLE = 2;
export const ADDED = 4;

/** @abstract */
export class CompiledNode {
  /** @type {(element: HTMLLIElement, show: boolean) => void} */
  static rendererCallback = (element, show) => {};
  /**
   * @type {number}
   * @readonly
   */
  #flags;
  /**
   * @type {HTMLLIElement}
   * @readonly
   */
  #display;
  /** @type {string | null} */
  #id;

  /** @param {number} flags */
  constructor(flags) {
    if (this.constructor === CompiledNode) {
      throw new Error("Cannot instantiate an abstract class: CompiledNode");
    }

    const display = document.createElement("li");
    display.draggable = hasFlag(flags, USABLE);

    if (hasFlag(flags, EDITABLE)) {
      display.ondblclick = e => this.openInEditor();
    }

    if (hasFlag(flags, ADDED)) {
      display.oncontextmenu = e => {
        e.preventDefault();
        e.stopPropagation();
        
        showContextMenu(e.clientX, e.clientY, [
          [
            { name: "Rename", handler: e => this.changeId(prompt("Input new node name:")) },
            { name: "Delete", handler: e => this.changeId(null) },
          ],
        ]);
      };
    }

    this.#flags = flags;
    this.#display = display;
    this.#id = null;
  }

  get flags() {
    return this.#flags;
  }

  get id() {
    return this.#id;
  }

  /** @param {boolean} isError */
  setErrorState(isError) {
    this.#display.className = isError ? ERROR_CLASS : "";
  }

  /** @param {string | null} id */
  changeId(id) {
    if (this.#id === id || (id !== null && (id.trim().length < 1 || nodeExists(id)))) {
      return false;
    }

    doAction(new ChangeIdAction(this, this.#id, id));
    return true;
  }

  /** @param {string | null} id */
  transientChangeId(id) {
    const display = this.#display;

    if (this.#id !== null) {
      unregiserNode(this.#id);
      CompiledNode.rendererCallback(display, false);
    }

    this.#id = id;
    
    if (id !== null) {
      registerNode(id, this);
      display.innerText = id;
      CompiledNode.rendererCallback(display, true);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {EditorNode}
   */
  instantiate(x, y) {
    throw new Error("Cannot execute an abstract method: instantiate(x, y)");
  }

  openInEditor() {}
}

export class NodeGraph {
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
    this.#origin = document.createElement("div");
    this.#origin.className = "origin";
    this.#connections = document.createElementNS(SVG_URL, "svg");
    this.#origin.appendChild(this.#connections);
    this.#nodes = new Set();
  }

  get offsetLeft() {
    return this.#origin.offsetLeft;
  }

  get offsetTop() {
    return this.#origin.offsetTop;
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

  /** @param {HTMLElement} parent */
  attach(parent) {
    parent.appendChild(this.#origin);
  }

  remove() {
    const org = this.#origin;
    org.parentElement?.removeChild(org);
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

class EditableNode extends CompiledNode {
  /**
   * @type {NodeGraph}
   * @readonly
   */
  #graph;

  /** @param {number} flags */
  constructor(flags) {
    super(flags);

    if (this.constructor === EditableNode) {
      throw new Error("Cannot instantiate an abstract class: EditableNode");
    }

    this.#graph = new NodeGraph();
  }

  get graph() {
    return this.#graph;
  }

  openInEditor() {
    openGraph(this.#graph);
  }
}

export class RootNode extends EditableNode {
  constructor() {
    super(EDITABLE);
  }
}

export class CustomNode extends EditableNode {
  constructor() {
    super(EDITABLE | USABLE | ADDED);
  }

  spawnInitialNodes() {
    new EditorNode(UNIQUE, null, INITIAL_X, INITIAL_Y, "Inputs", BUILT_IN_COLOR, new OutputSocket(0, "")).add();
    new EditorNode(UNIQUE, null, INITIAL_X * 3, INITIAL_Y, "Outputs", BUILT_IN_COLOR, new NamedSocket(0, "")).add();
  }
}