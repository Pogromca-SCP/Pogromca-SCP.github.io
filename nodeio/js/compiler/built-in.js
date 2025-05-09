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
    const inputVisible = { socketId: 0, func: x => x === "input", def: true };
    const outputVisible = { socketId: 0, func: x => x === "output", def: false };
    const textOrNumberVisible = { socketId: 5, func: x => x === "text" || x === "number", def: true };
    const numberVisible = { socketId: 5, func: x => x === "number", def: false };
    const switchVisible = { socketId: 5, func: x => x === "switch", def: false };

    const typeToOutput = x => {
      switch (x) {
        case "switch":
          return "bool";
        case "named":
          return "data";
        case "select":
          return "selection";
        default:
          return x;
      }
    };

    return new EditorNode(this, graph, x, y, { socketId: 0, func: x => `${x} socket`, def: "input socket" }, BUILT_IN_COLOR,
      { type: "select", name: "", def: "input", options: ["input", "output"] },
      { type: "named", name: "channel", visible: inputVisible },
      { type: "output", name: "channel", visible: outputVisible },
      { type: "number", name: "slot", def: 1, connective: false, min: 1, max: 100, step: 1 },
      { type: "text", name: "name", def: "", connective: true, min: 0, max: 50, valid: "" },
      { type: "select", name: "type", def: "text", options: ["named", "number", "select", "switch", "text"], visible: inputVisible },
      { type: "number", name: "minimum", def: 0, connective: true, min: 0, max: 100, step: 1, visible: textOrNumberVisible },
      { type: "number", name: "maximum", def: 20, connective: true, min: 0, max: 100, step: 1, visible: textOrNumberVisible },
      { type: "text", name: "valid", def: "", connective: true, min: 0, max: 50, valid: "", visible: { socketId: 5, func: x => x === "text", def: true } },
      { type: "number", name: "step", def: 1, connective: true, min: 1, max: 20, step: 0.5, visible: numberVisible },
      { type: "text", name: "inactive", def: "off", connective: true, min: 1, max: 20, valid: "", visible: switchVisible },
      { type: "text", name: "active", def: "on", connective: true, min: 1, max: 20, valid: "", visible: switchVisible },
      { type: "text", name: "default", def: "", connective: true, min: 0, max: 50, valid: "", visible: { socketId: 5, func: x => x !== "number" && x !== "switch", def: true } },
      { type: "number", name: "default", def: 5, connective: true, min: 0, max: 10, step: 1, visible: numberVisible },
      { type: "switch", name: "default", def: false, connective: true, active: "on", inactive: "off", visible: switchVisible },
      { type: "output", name: { socketId: 5, func: typeToOutput, def: "text" }, visible: inputVisible },
      { type: "named", name: "data", visible: outputVisible },
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
      { type: "text", name: "", def: "", connective: false, min: 0, max: 50, valid: "" },
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
      { type: "text", name: "Name", def: "", connective: true, min: 0, max: 50, valid: "" },
      { type: "text", name: "Color", def: "333333", connective: true, min: 6, max: 6, valid: "0123456789abcdef" },
    );
  }
}