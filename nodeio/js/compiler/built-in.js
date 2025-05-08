// @ts-check
import { BUILT_IN_COLOR, CompiledNode, USABLE } from "./nodes.js";
import { EditorNode } from "../renderer/nodes.js";

/**
 * @typedef {import("../renderer/graph.js").NodeGraph} NodeGraph
 */

export class SocketNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "Socket", BUILT_IN_COLOR,
      { type: "select", name: "", def: "Output", options: ["Input", "Output"] },
      { type: "output", name: "Channel" },
      { type: "number", name: "Slot", def: 1, connective: false, min: 1, max: 100, step: 1 },
      { type: "text", name: "Name", def: "", connective: true, min: null, max: 50, valid: "" },
      { type: "text", name: "Default", def: "", connective: true, min: null, max: 50, valid: "" },
      { type: "named", name: "Data" },
    );
  }
}

export class TypeNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "Type", BUILT_IN_COLOR,
      { type: "named", name: "Channel" },
      { type: "switch", name: "", def: false, connective: false, active: "Default" , inactive: "Not default" },
      { type: "switch", name: "", def: true, connective: false, active: "Connective" , inactive: "Not connective" },
      { type: "output", name: "Data" },
    );
  }
}

export class OptionNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "Option", BUILT_IN_COLOR,
      { type: "named", name: "When" },
      { type: "text", name: "", def: "", connective: false, min: null, max: 50, valid: "" },
      { type: "output", name: "Then" },
    );
  }
}

export class ConditionNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "Condition", BUILT_IN_COLOR,
      { type: "select", name: "Input", def: "Number", options: ["Number", "Text", "Bool", "Type"] },
      { type: "select", name: "Opertaion", def: "Equals", options: ["Equals", "Not equals", "Less than", "Greater than"] },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 1 },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 1 },
      { type: "output", name: "True" },
      { type: "output", name: "False" },
    );
  }
}

export class SettingsNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "Settings", BUILT_IN_COLOR,
      { type: "output", name: "Output" },
      { type: "text", name: "Name", def: "", connective: true, min: null, max: 50, valid: "" },
      { type: "text", name: "Color", def: "333333", connective: true, min: 6, max: 6, valid: "0123456789abcdef" },
    );
  }
}