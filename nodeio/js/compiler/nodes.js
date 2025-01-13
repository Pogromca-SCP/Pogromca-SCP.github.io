// @ts-check
import { doAction } from "../history.js";

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

/** @abstract */
export class CompiledNode {
  /** @type {(element: HTMLLIElement, show: boolean) => void} */
  static rendererCallback = (element, show) => {};
  /**
   * @type {Map<string, CompiledNode>}
   * @readonly
   */
  static #nodes = new Map();
  /**
   * @type {HTMLLIElement}
   * @readonly
   */
  #display;
  /** @type {string | null} */
  #id;

  constructor() {
    if (this.constructor === CompiledNode) {
      throw new Error("Cannot instantiate an abstract class: CompiledNode");
    }

    this.#display = document.createElement("li");
    this.#display.draggable = this.dragEnabled;
    this.#id = null;
  }

  static get allNodes() {
    return CompiledNode.#nodes.values();
  }

  get id() {
    return this.#id;
  }

  get dragEnabled() {
    return true;
  }

  /** @param {string} id */
  static exists(id) {
    return CompiledNode.#nodes.has(id);
  }

  /** @param {string} id */
  static get(id) {
    return CompiledNode.#nodes.get(id);
  }

  /** @param {string | null} id */
  changeId(id) {
    if (this.#id === id || (id !== null && (id.trim().length < 1 || CompiledNode.#nodes.has(id)))) {
      return false;
    }

    doAction(new ChangeIdAction(this, this.#id, id));
    return true;
  }

  /** @param {string | null} id */
  transientChangeId(id) {
    if (this.#id !== null) {
      CompiledNode.#nodes.delete(this.#id);
      CompiledNode.rendererCallback(this.#display, false);
    }

    this.#id = id;
    
    if (this.#id !== null) {
      CompiledNode.#nodes.set(this.#id, this);
      this.#display.innerText = this.#id;
      CompiledNode.rendererCallback(this.#display, true);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {import("../renderer/nodes.js").EditorNode}
   */
  spawnNode(x, y) {
    throw new Error("Cannot execute an abstract method: spawnNode");
  }
}

export class RootNode extends CompiledNode {
  get dragEnabled() {
    return false;
  }
}