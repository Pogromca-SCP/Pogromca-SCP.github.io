// @ts-check
import { BUILT_IN_COLOR, CompiledNode, USABLE } from "./nodes.js";
import { EditorNode } from "../renderer/nodes.js";
import { BOOLEAN, NUMBER, TEXT } from "./types.js";

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
    const builtInVisible = { socketId: 2, func: x => x, def: false };

    return new EditorNode(this, graph, x, y, "type", BUILT_IN_COLOR,
      { type: "named", name: "channel" },
      { type: "switch", name: "", def: false, connective: false, active: "default", inactive: "not default" },
      { type: "switch", name: "", def: false, connective: false, active: "built in", inactive: "custom" },
      { type: "select", name: "", def: TEXT, options: [TEXT, NUMBER, BOOLEAN], visible: builtInVisible },
      { type: "switch", name: "", def: true, connective: false, active: "connective", inactive: "not connective", visible: builtInVisible },
      { type: "text", name: "name", def: "", connective: true, min: 0, max: 20, valid: "", visible: { socketId: 2, func: x => !x, def: true } },
      { type: "output", name: "data" },
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
    return new EditorNode(this, graph, x, y, "option", BUILT_IN_COLOR,
      { type: "named", name: "when" },
      { type: "text", name: "", def: "", connective: false, min: 0, max: 50, valid: "" },
      { type: "output", name: "then" },
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
    const numberVisible = { socketId: 0, func: x => x === "number", def: true };
    const textOrTypeVisible = { socketId: 0, func: x => x === "text" || x === "type", def: false };
    const boolVisible = { socketId: 0, func: x => x === "bool", def: false };

    return new EditorNode(this, graph, x, y, "condition", BUILT_IN_COLOR,
      { type: "select", name: "input", def: "number", options: ["number", "text", "bool", "type"] },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals", "less than", "greater than", "less or equal", "greater or equal"], visible: numberVisible },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals"], visible: textOrTypeVisible },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals", "and", "or", "not"], visible: boolVisible },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 1, visible: numberVisible },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 1, visible: numberVisible },
      { type: "text", name: "", def: "", connective: true, min: 0, max: 50, valid: "", visible: textOrTypeVisible },
      { type: "text", name: "", def: "", connective: true, min: 0, max: 50, valid: "", visible: textOrTypeVisible },
      { type: "switch", name: "", def: false, connective: true, active: "true", inactive: "false", visible: boolVisible },
      { type: "switch", name: "", def: false, connective: true, active: "true", inactive: "false", visible: { socketId: 3, func: x => x !== "not", def: false } },
      { type: "output", name: "true" },
      { type: "output", name: "false" },
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
    return new EditorNode(this, graph, x, y, "settings", BUILT_IN_COLOR,
      { type: "output", name: "output" },
      { type: "text", name: "name", def: "", connective: true, min: 0, max: 50, valid: "" },
      { type: "text", name: "color", def: "333333", connective: true, min: 6, max: 6, valid: "0123456789abcdef" },
    );
  }
}

export class ByteNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, { socketId: 1, func: x => `${x} byte`, def: "text byte" }, BUILT_IN_COLOR,
      { type: "named", name: "activation" },
      { type: "select", name: "type", def: TEXT, options: [TEXT, NUMBER, BOOLEAN] },
      { type: "text", name: "", def: "", connective: false, min: 0, max: 8, valid: "01" },
      { type: "output", name: "value" },
    );
  }
}

export class FormatNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    const formats = ["binary", "hexadecimal", "boolean", "integer", "utf 8", "text"];
    const integerVisible = { socketId: 2, func: x => x === "integer", def: false };

    return new EditorNode(this, graph, x, y, "format", BUILT_IN_COLOR,
      { type: "named", name: "data" },
      { type: "select", name: "original", def: "binary", options: formats },
      { type: "select", name: "target", def: "binary", options: formats },
      { type: "switch", name: "sign", def: false, connective: true, active: "signed", inactive: "unsigned", visible: integerVisible },
      { type: "number", name: "bytes", def: 4, connective: true, min: 1, max: 16, step: 1, visible: integerVisible },
      { type: "output", name: "result" },
    );
  }
}

export class JoinNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "join", BUILT_IN_COLOR,
      { type: "text", name: "separator", def: "", connective: true, min: 0, max: 50, valid: "" },
      { type: "repetetive", name: "" },
      { type: "output", name: "result" },
    );
  }
}

export class MathNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, { socketId: 0, func: x => `${x}`, def: "add" }, BUILT_IN_COLOR,
      { type: "select", name: "operation", def: "add", options: ["add", "subtract", "multiply", "divide", "modulo", "sin", "cos", "tan"] },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 0.0001 },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 0.0001, visible: { socketId: 0, func: x => x !== "sin" && x !== "cos" && x !== "tan", def: true } },
      { type: "output", name: "result" },
    );
  }
}

export class RepeatNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "repeat sequence", BUILT_IN_COLOR,
      { type: "text", name: "sequence", def: "", connective: true, min: 0, max: 50, valid: "" },
      { type: "number", name: "amount", def: 2, connective: true, min: 1, max: 50, step: 1 },
      { type: "output", name: "repetition" },
    );
  }
}

export class ReverseNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "reverse order", BUILT_IN_COLOR,
      { type: "named", name: "sequence" },
      { type: "output", name: "reversed sequence" },
    );
  }
}

export class SizeNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "length", BUILT_IN_COLOR,
      { type: "named", name: "input" },
      { type: "output", name: "size" },
    );
  }
}

export class ValueNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {NodeGraph} graph
   */
  instantiate(x, y, graph) {
    return new EditorNode(this, graph, x, y, "literal value", BUILT_IN_COLOR,
      { type: "select", name: "type", def: TEXT, options: [TEXT, NUMBER, BOOLEAN] },
      { type: "text", name: "", def: "", connective: false, min: 0, max: 50, valid: "", visible: { socketId: 0, func: x => x === TEXT, def: true } },
      { type: "number", name: "", def: 5, connective: false, min: -100, max: 100, step: 0.0001, visible: { socketId: 0, func: x => x === NUMBER, def: false } },
      { type: "switch", name: "", def: false, connective: false, active: "true", inactive: "false", visible: { socketId: 0, func: x => x === BOOLEAN, def: false } },
      { type: "output", name: "data" },
    );
  }
}