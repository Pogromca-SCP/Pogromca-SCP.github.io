// @ts-check
import { doAction } from "../history.js";
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

export const USABLE = 1;
export const EDITABLE = 2;

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
    this.#flags = flags;
    this.#display = display;
    this.#id = null;
  }

  static get allNodes() {
    return CompiledNode.#nodes.values();
  }

  get flags() {
    return this.#flags;
  }

  get id() {
    return this.#id;
  }

  /** @param {string} id */
  static exists(id) {
    return CompiledNode.#nodes.has(id);
  }

  /** @param {string} id */
  static get(id) {
    return CompiledNode.#nodes.get(id);
  }

  /** @param {boolean} isError */
  setErrorState(isError) {
    this.#display.className = isError ? ERROR_CLASS : "";
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
    const display = this.#display;

    if (this.#id !== null) {
      CompiledNode.#nodes.delete(this.#id);
      CompiledNode.rendererCallback(display, false);
    }

    this.#id = id;
    
    if (id !== null) {
      CompiledNode.#nodes.set(id, this);
      display.innerText = id;
      CompiledNode.rendererCallback(display, true);
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {import("../renderer/graph.js").EditorNode}
   */
  instantiate(x, y) {
    throw new Error("Cannot execute an abstract method: instantiate(x, y)");
  }
}

export class RootNode extends CompiledNode {
  constructor() {
    super(EDITABLE);
  }
}