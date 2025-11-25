// @ts-check
import { doAction } from "../history.js";
import { showContextMenu } from "../menu.js";
import { nodeExists, NodeGraph, registerNode, unregiserNode } from "../renderer/graph.js";
import { EditorNode } from "../renderer/nodes.js";
import { ERROR_CLASS, hasFlag } from "../utils.js";
import { BUILT_IN_COLOR, compileGraph, setCompilerContext } from "./compiler.js";
import { BOOLEAN, INPUT_CHANNEL, NODE_METADATA, NUMBER, OUTPUT_DATA, TEXT } from "./types.js";

/**
 * @typedef {import("./compiler.js").CacheValue} CacheValue
 * @typedef {import("../renderer/nodes.js").SocketDefinition} SocketDefinition
 * @typedef {import("./compiler.js").NodeMetadata} NodeMetadata
 */

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

const INITIAL_POS = 400;
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
            { name: "Rename", handler: e => this.changeId(prompt("Input new node name:") ?? "") },
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

  get hash() {
    return 0;
  }

  /** @param {boolean} isError */
  setErrorState(isError) {
    this.#display.className = isError ? ERROR_CLASS : "";
  }

  /** @param {string | null} id */
  changeId(id) {
    const currrentId = this.#id;

    if (currrentId === id || (id !== null && (id.trim().length < 1 || nodeExists(id)))) {
      return false;
    }

    doAction(new ChangeIdAction(this, currrentId, id));
    return true;
  }

  /** @param {string | null} id */
  transientChangeId(id) {
    const display = this.#display;
    const currrentId = this.#id;

    if (currrentId !== null) {
      unregiserNode(currrentId);
      CompiledNode.rendererCallback(display, false);
    }

    this.#id = id;

    if (id === null) {
      this.closeInEditor();
      return;
    }
    
    registerNode(id, this);
    display.innerText = id;
    CompiledNode.rendererCallback(display, true);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   * @returns {EditorNode}
   */
  instantiate(x, y, graph) {
    throw new Error("Cannot execute an abstract method: instantiate(x, y, graph)");
  }

  openInEditor() {}

  closeInEditor() {}

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   * @returns {boolean}
   */
  compile(instance, values) {
    throw new Error("Cannot execute an abstract method: compile(instance, values)");
  }
}

/** @abstract */
export class EditableNode extends CompiledNode {
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
    NodeGraph.switchGraph(this.#graph);
    setCompilerContext(this);
    compileGraph();
  }

  closeInEditor() {
    NodeGraph.switchToRootIfDeleted(this.#graph);
  }

  updateHash() {}

  /** @param {SocketDefinition[]} defs */
  setSockets(defs) {}

  /** @param {NodeMetadata} data */
  setMetadata(data) {}
}

export class RootNode extends EditableNode {
  constructor() {
    super(EDITABLE);
    const graph = this.graph;
    graph.addOutputs(new EditorNode(null, graph, INITIAL_POS * 3, INITIAL_POS, "console.log", BUILT_IN_COLOR, [{ type: "repetetive", name: "", connectionType: [BOOLEAN, TEXT, NUMBER] }]));
  }
}

export class CustomNode extends EditableNode {
  /** @type {NodeMetadata} */
  #meta;
  /** @type {SocketDefinition[]} */
  #sockets;
  /** @type {number} */
  #hash;

  constructor() {
    super(EDITABLE | USABLE | ADDED);
    const graph = this.graph;
    graph.addOutputs(new EditorNode(null, graph, INITIAL_POS * 3, INITIAL_POS, "output", BUILT_IN_COLOR, [{ type: "repetetive", name: "", connectionType: [TEXT, NODE_METADATA] }]));
    graph.addInputs(new EditorNode(null, graph, INITIAL_POS, INITIAL_POS, "input", BUILT_IN_COLOR, [{ type: "output", name: "", connectionType: INPUT_CHANNEL }]));
    this.#sockets = [];
    this.#hash = 0;

    this.#meta = {
      name: "",
      color: BUILT_IN_COLOR,
    };
  }

  get hash() {
    return this.#hash;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    const meta = this.#meta;
    return new EditorNode(this, graph, x, y, meta.name, meta.color, this.#sockets);
  }

  updateHash() {
    ++this.#hash;
  }

  /** @param {SocketDefinition[]} defs */
  setSockets(defs) {
    this.#sockets = defs;
  }

  /** @param {NodeMetadata} data */
  setMetadata(data) {
    this.#meta = data;
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    if (this.#hash !== instance.hash) {
      instance.setIssues(["This node is outdated, replace it with newer version"]);
      return false;
    }

    return true;
  }
}