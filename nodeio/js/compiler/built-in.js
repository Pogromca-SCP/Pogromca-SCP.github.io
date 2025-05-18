// @ts-check
import { BUILT_IN_COLOR, CompiledNode, USABLE } from "./nodes.js";
import { EditorNode } from "../renderer/nodes.js";
import { BOOLEAN, INPUT_CHANNEL, INPUT_DATA, NODE_METADATA, NUMBER, OPTION_FLOW, OUTPUT_CHANNEL, OUTPUT_DATA, SELECT_DATA, TEXT, TRUTH_FLOW } from "./types.js";
import { getCurrentSocketDefinition, removeSocketDefinition, setSocketDefinition } from "./compiler.js";

/**
 * @typedef {import("../renderer/graph.js").NodeGraph} NodeGraph
 * @typedef {import("./compiler.js").CacheValue} CacheValue
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
        default:
          return x;
      }
    };

    return new EditorNode(this, graph, x, y, { socketId: 0, func: x => `${x} socket`, def: "input socket" }, BUILT_IN_COLOR, [
      { type: "select", name: "", def: "input", options: ["input", "output"] },
      { type: "named", name: "channel", visible: inputVisible, connectionType: [INPUT_CHANNEL, OPTION_FLOW, TRUTH_FLOW] },
      { type: "output", name: "channel", visible: outputVisible, connectionType: OUTPUT_CHANNEL },
      { type: "number", name: "slot", def: 1, connective: false, min: 1, max: 100, step: 1 },
      { type: "text", name: "name", def: "", connective: true, min: 0, max: 50, valid: "", connectionType: TEXT },
      { type: "select", name: "type", def: "text", options: ["named", "number", "select", "switch", "text"], visible: inputVisible },
      { type: "number", name: "minimum", def: 0, connective: true, min: 0, max: 100, step: 1, visible: textOrNumberVisible, connectionType: NUMBER },
      { type: "number", name: "maximum", def: 20, connective: true, min: 0, max: 100, step: 1, visible: textOrNumberVisible, connectionType: NUMBER },
      { type: "text", name: "valid", def: "", connective: true, min: 0, max: 50, valid: "", visible: { socketId: 5, func: x => x === "text", def: true }, connectionType: TEXT },
      { type: "number", name: "step", def: 1, connective: true, min: 1, max: 20, step: 0.5, visible: numberVisible, connectionType: NUMBER },
      { type: "text", name: "inactive", def: "off", connective: true, min: 1, max: 20, valid: "", visible: switchVisible, connectionType: BOOLEAN },
      { type: "text", name: "active", def: "on", connective: true, min: 1, max: 20, valid: "", visible: switchVisible, connectionType: BOOLEAN },
      { type: "text", name: "default", def: "", connective: true, min: 0, max: 50, valid: "", visible: { socketId: 5, func: x => x !== "number" && x !== "switch", def: true }, connectionType: TEXT },
      { type: "number", name: "default", def: 5, connective: true, min: 0, max: 10, step: 1, visible: numberVisible, connectionType: NUMBER },
      { type: "switch", name: "default", def: false, connective: true, active: "on", inactive: "off", visible: switchVisible, connectionType: BOOLEAN },
      { type: "output", name: { socketId: 5, func: typeToOutput, def: "text" }, visible: { socketId: 5, func: x => x !== "select", def: true }, connectionType: INPUT_DATA },
      { type: "output", name: "selection", visible: { socketId: 5, func: x => x === "select", def: false }, connectionType: SELECT_DATA },
      { type: "named", name: "data", visible: outputVisible, connectionType: [TEXT, NUMBER, BOOLEAN] },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    if (values[0] === "input") {
      const channel = values[1];
      values[15] = false;
      values[16] = false;

      if (!channel) {
        removeSocketDefinition(instance);
        return;
      }

      switch (values[5]) {
        case "named":
          setSocketDefinition(instance, { slot: values[3], type: "named", name: values[4] });
          values[15] = channel;
          return;
        case "number":
          setSocketDefinition(instance, { slot: values[3], type: "number", name: values[4], def: values[13], connective: false, min: values[6], max: values[7], step: values[9] });
          values[15] = channel;
          return;
        case "select":
          setSocketDefinition(instance, { slot: values[3], type: "select", name: values[4], def: values[12], options: [] });
          values[16] = channel;
          return;
        case "switch":
          setSocketDefinition(instance, { slot: values[3], type: "switch", name: values[4], def: values[14], connective: false, active: values[11], inactive: values[10] });
          values[15] = channel;
          return;
        default:
          setSocketDefinition(instance, { slot: values[3], type: "text", name: values[4], def: values[12], connective: false, min: values[6], max: values[7], valid: values[8] });
          values[15] = channel;
          return;
      }
    } else {
      values[2] = true;
      setSocketDefinition(instance, { slot: values[3], type: "output", name: values[4] });
    }
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

    return new EditorNode(this, graph, x, y, "type", BUILT_IN_COLOR, [
      { type: "named", name: "channel", connectionType: [INPUT_DATA, OUTPUT_CHANNEL] },
      { type: "switch", name: "", def: false, connective: false, active: "default", inactive: "not default" },
      { type: "switch", name: "", def: false, connective: false, active: "built in", inactive: "custom" },
      { type: "select", name: "", def: TEXT, options: [TEXT, NUMBER, BOOLEAN], visible: builtInVisible },
      { type: "switch", name: "", def: true, connective: false, active: "connective", inactive: "not connective", visible: builtInVisible },
      { type: "text", name: "name", def: "", connective: true, min: 0, max: 20, valid: "", visible: { socketId: 2, func: x => !x, def: true }, connectionType: TEXT },
      { type: "output", name: "data", connectionType: OUTPUT_DATA },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    if (!values[0]) {
      return;
    }

    const def = getCurrentSocketDefinition();
    values[6] = { socket: def, func: x => x, def: null };
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
    return new EditorNode(this, graph, x, y, "option", BUILT_IN_COLOR, [
      { type: "named", name: "when", connectionType: SELECT_DATA },
      { type: "text", name: "", def: "", connective: false, min: 0, max: 50, valid: "" },
      { type: "output", name: "then", connectionType: OPTION_FLOW },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    if (!values[0]) {
      return;
    }

    const def = getCurrentSocketDefinition();
    values[2] = { socket: def, func: x => x, def: null };
    def.options?.push(values[1]);
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

    return new EditorNode(this, graph, x, y, "condition", BUILT_IN_COLOR, [
      { type: "select", name: "input", def: "number", options: ["number", "text", "bool", "type"] },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals", "less than", "greater than", "less or equal", "greater or equal"], visible: numberVisible },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals"], visible: textOrTypeVisible },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals", "and", "or", "not"], visible: boolVisible },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 1, visible: numberVisible, connectionType: NUMBER },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 1, visible: numberVisible, connectionType: NUMBER },
      { type: "text", name: "", def: "", connective: true, min: 0, max: 50, valid: "", visible: textOrTypeVisible, connectionType: TEXT },
      { type: "text", name: "", def: "", connective: true, min: 0, max: 50, valid: "", visible: textOrTypeVisible, connectionType: TEXT },
      { type: "switch", name: "", def: false, connective: true, active: "true", inactive: "false", visible: boolVisible, connectionType: [BOOLEAN, TRUTH_FLOW] },
      { type: "switch", name: "", def: false, connective: true, active: "true", inactive: "false", visible: { socketId: 3, func: x => x !== "not", def: false }, connectionType: [BOOLEAN, TRUTH_FLOW] },
      { type: "output", name: "true", connectionType: TRUTH_FLOW },
      { type: "output", name: "false", connectionType: TRUTH_FLOW },
    ]);
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
    return new EditorNode(this, graph, x, y, "settings", BUILT_IN_COLOR, [
      { type: "output", name: "output", connectionType: NODE_METADATA },
      { type: "text", name: "name", def: "", connective: true, min: 0, max: 50, valid: "", connectionType: TEXT },
      { type: "text", name: "color", def: "333333", connective: true, min: 6, max: 6, valid: "0123456789abcdef", connectionType: TEXT },
    ]);
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
    const nameSrc =  { socketId: 0, func: x => `${x.substring(x.lastIndexOf('/') + 1)} byte`, def: "text byte" };

    return new EditorNode(this, graph, x, y, nameSrc, BUILT_IN_COLOR, [
      { type: "select", name: "type", def: TEXT, options: [TEXT, NUMBER, BOOLEAN] },
      { type: "text", name: "", def: "", connective: false, min: 0, max: 8, valid: "01" },
      { type: "output", name: "value", visible: { socketId: 0, func: x => x === TEXT, def: true }, connectionType: TEXT },
      { type: "output", name: "value", visible: { socketId: 0, func: x => x === NUMBER, def: false }, connectionType: NUMBER },
      { type: "output", name: "value", visible: { socketId: 0, func: x => x === BOOLEAN, def: false }, connectionType: BOOLEAN },
    ]);
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

    return new EditorNode(this, graph, x, y, "format", BUILT_IN_COLOR, [
      { type: "named", name: "data", connectionType: TEXT },
      { type: "select", name: "original", def: "binary", options: formats },
      { type: "select", name: "target", def: "binary", options: formats },
      { type: "switch", name: "sign", def: false, connective: true, active: "signed", inactive: "unsigned", visible: integerVisible, connectionType: BOOLEAN },
      { type: "number", name: "bytes", def: 4, connective: true, min: 1, max: 16, step: 1, visible: integerVisible, connectionType: NUMBER },
      { type: "output", name: "result", connectionType: TEXT },
    ]);
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
    return new EditorNode(this, graph, x, y, "join", BUILT_IN_COLOR, [
      { type: "text", name: "separator", def: "", connective: true, min: 0, max: 50, valid: "", connectionType: [TEXT, NUMBER, BOOLEAN] },
      { type: "output", name: "result", connectionType: TEXT },
      { type: "repetetive", name: "", connectionType: [TEXT, NUMBER, BOOLEAN] },
    ]);
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
    return new EditorNode(this, graph, x, y, { socketId: 0, func: x => `${x}`, def: "add" }, BUILT_IN_COLOR, [
      { type: "select", name: "operation", def: "add", options: ["add", "subtract", "multiply", "divide", "modulo", "sin", "cos", "tan"] },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 0.0001, connectionType: NUMBER },
      { type: "number", name: "", def: 0, connective: true, min: -100, max: 100, step: 0.0001, visible: { socketId: 0, func: x => x !== "sin" && x !== "cos" && x !== "tan", def: true }, connectionType: NUMBER },
      { type: "output", name: "result", connectionType: NUMBER },
    ]);
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
    return new EditorNode(this, graph, x, y, "repeat sequence", BUILT_IN_COLOR, [
      { type: "text", name: "sequence", def: "", connective: true, min: 0, max: 50, valid: "", connectionType: TEXT },
      { type: "number", name: "amount", def: 2, connective: true, min: 1, max: 50, step: 1, connectionType: NUMBER },
      { type: "output", name: "repetition", connectionType: TEXT },
    ]);
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
    return new EditorNode(this, graph, x, y, "reverse order", BUILT_IN_COLOR, [
      { type: "named", name: "sequence", connectionType: TEXT },
      { type: "output", name: "reversed sequence", connectionType: TEXT },
    ]);
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
    return new EditorNode(this, graph, x, y, "length", BUILT_IN_COLOR, [
      { type: "named", name: "input", connectionType: TEXT },
      { type: "output", name: "size", connectionType: NUMBER },
    ]);
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
    const textVisible = { socketId: 0, func: x => x === TEXT, def: true };
    const numberVisible = { socketId: 0, func: x => x === NUMBER, def: false };
    const booleanVisible = { socketId: 0, func: x => x === BOOLEAN, def: false };

    return new EditorNode(this, graph, x, y, "literal value", BUILT_IN_COLOR, [
      { type: "select", name: "type", def: TEXT, options: [TEXT, NUMBER, BOOLEAN] },
      { type: "text", name: "", def: "", connective: false, min: 0, max: 50, valid: "", visible: textVisible },
      { type: "number", name: "", def: 5, connective: false, min: -100, max: 100, step: 0.0001, visible: numberVisible },
      { type: "switch", name: "", def: false, connective: false, active: "true", inactive: "false", visible: booleanVisible },
      { type: "output", name: "data", visible: textVisible, connectionType: TEXT },
      { type: "output", name: "data", visible: numberVisible, connectionType: NUMBER },
      { type: "output", name: "data", visible: booleanVisible, connectionType: BOOLEAN },
    ]);
  }
}