// @ts-check
import { BUILT_IN_COLOR, getSocketDefinition, setMetadata, setSocketDefinition } from "./compiler.js";
import { CompiledNode, USABLE } from "./nodes.js";
import { EditorNode } from "../renderer/nodes.js";
import { BOOLEAN, INPUT_CHANNEL, INPUT_DATA, NODE_METADATA, NUMBER, OPTION_FLOW, OUTPUT_CHANNEL, SELECT_DATA, TEXT, TRUTH_FLOW } from "./types.js";
import { binaryToInt } from "../utils.js";

/**
 * @typedef {import("../renderer/graph.js").NodeGraph} NodeGraph
 * @typedef {import("../renderer/nodes.js").Param} Param
 * @typedef {import("./compiler.js").CacheValue} CacheValue
 */

/**
 * @template T
 * @typedef {import("./compiler.js").ResolvableDynamicData<T>} ResolvableDynamicData
 */

/**
 * @template T
 * @param {CacheValue} x
 * @param {T} def
 */
const getDataSource = (x, def) => typeof(x) !== "object" || x === null || Array.isArray(x) || typeof(x.def) !== typeof(def) ? def : /** @type {ResolvableDynamicData<T>} */ (x);

/** @param {CacheValue} x */
const asNumber = x => typeof(x) === "number" ? x : getDataSource(x, /** @type {number} */ (0));
/** @param {CacheValue} x */
const asString = x => typeof(x) === "string" ? x : getDataSource(x, /** @type {string} */ (""));
/** @param {CacheValue} x */
const asBool = x => typeof(x) === "boolean" ? x : getDataSource(x, /** @type {boolean} */ (false));
/** @param {CacheValue} x */
const toNumber = x => typeof(x) === "number" ? x : 0;
/** @param {CacheValue} x */
const toString = x => typeof(x) === "string" ? x : "";
/** @param {CacheValue} x */
const toBool = x => typeof(x) === "boolean" ? x : false;

const MAX_NAME = 50;
const MAX_LENGTH = 255;
const MIN_NUMBER = Number.MIN_VALUE;
const MAX_NUMBER = Number.MAX_VALUE;

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
    const inputVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === "input", def: true };
    const outputVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === "output", def: false };
    const textOrNumberVisible = { socketId: 5, func: (/** @type {Param} */ x) => x === "text" || x === "number", def: true };
    const numberVisible = { socketId: 5, func: (/** @type {Param} */ x) => x === "number", def: false };
    const switchVisible = { socketId: 5, func: (/** @type {Param} */ x) => x === "switch", def: false };

    /** @param {boolean | number | string} x */
    const typeToOutput = x => {
      switch (x) {
        case "switch":
          return "bool";
        case "named":
          return "data";
        default:
          return x.toString();
      }
    };

    return new EditorNode(this, graph, x, y, { socketId: 0, func: x => `${x} socket`, def: "input socket" }, BUILT_IN_COLOR, [
      { type: "select", name: "", def: "input", options: ["input", "output"] },
      { type: "named", name: "channel", visible: inputVisible, connectionType: [INPUT_CHANNEL, OPTION_FLOW, TRUTH_FLOW] },
      { type: "output", name: "channel", visible: outputVisible, connectionType: OUTPUT_CHANNEL },
      { type: "number", name: "slot", def: 1, min: 1, max: 100, step: 1 },
      { type: "text", name: "name", def: "", min: 0, max: 50, valid: "", connectionType: TEXT },
      { type: "select", name: "type", def: "text", options: ["named", "number", "select", "switch", "text"], visible: inputVisible },
      { type: "number", name: "minimum", def: 0, min: 0, max: 100, step: 1, visible: textOrNumberVisible, connectionType: NUMBER },
      { type: "number", name: "maximum", def: 20, min: 0, max: 100, step: 1, visible: textOrNumberVisible, connectionType: NUMBER },
      { type: "text", name: "valid", def: "", min: 0, max: 50, valid: "", visible: { socketId: 5, func: x => x === "text", def: true }, connectionType: TEXT },
      { type: "number", name: "step", def: 1, min: 1, max: 20, step: 0.5, visible: numberVisible, connectionType: NUMBER },
      { type: "text", name: "inactive", def: "off", min: 1, max: 20, valid: "", visible: switchVisible, connectionType: BOOLEAN },
      { type: "text", name: "active", def: "on", min: 1, max: 20, valid: "", visible: switchVisible, connectionType: BOOLEAN },
      { type: "text", name: "default", def: "", min: 0, max: 50, valid: "", visible: { socketId: 5, func: x => x !== "number" && x !== "switch", def: true }, connectionType: TEXT },
      { type: "number", name: "default", def: 5, min: 0, max: 10, step: 1, visible: numberVisible, connectionType: NUMBER },
      { type: "switch", name: "default", def: false, active: "on", inactive: "off", visible: switchVisible, connectionType: BOOLEAN },
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
    if (values[0] === "output") {
      values[2] = true;
      setSocketDefinition(instance, { slot: toNumber(values[3]), def: { type: "output", name: asString(values[4]) } });
      return true;
    }

    values[15] = false;
    values[16] = false;
    const channel = asBool(values[1]);

    if (channel === false) {
      return true;
    }

    switch (values[5]) {
      case "named":
        setSocketDefinition(instance, { slot: toNumber(values[3]), def: { type: "named", name: asString(values[4]) } });
        values[15] = channel;
        return true;
      case "number":
        setSocketDefinition(instance, { slot: toNumber(values[3]), def: { type: "number", name: asString(values[4]), def: toNumber(values[13]), min: toNumber(values[6]), max: toNumber(values[7]), step: toNumber(values[9]) } });
        values[15] = channel;
        return true;
      case "select":
        setSocketDefinition(instance, { slot: toNumber(values[3]), def: { type: "select", name: asString(values[4]), def: toString(values[12]), options: [] } });
        values[16] = channel;
        return true;
      case "switch":
        setSocketDefinition(instance, { slot: toNumber(values[3]), def: { type: "switch", name: asString(values[4]), def: toBool(values[14]), active: toString(values[11]), inactive: toString(values[10]) } });
        values[15] = channel;
        return true;
      default:
        setSocketDefinition(instance, { slot: toNumber(values[3]), def: { type: "text", name: asString(values[4]), def: toString(values[12]), min: toNumber(values[6]), max: toNumber(values[7]), valid: toString(values[8]) } });
        values[15] = channel;
        return true;
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
    const builtInVisible = { socketId: 2, func: (/** @type {any} */ x) => x, def: false };

    return new EditorNode(this, graph, x, y, "type", BUILT_IN_COLOR, [
      { type: "named", name: "channel", connectionType: [INPUT_DATA, OUTPUT_CHANNEL] },
      { type: "switch", name: "", def: false, active: "default", inactive: "not default" },
      { type: "switch", name: "", def: false, active: "built in", inactive: "custom" },
      { type: "select", name: "", def: TEXT, options: [TEXT, NUMBER, BOOLEAN], visible: builtInVisible },
      { type: "switch", name: "", def: true, active: "connective", inactive: "not connective", visible: builtInVisible },
      { type: "text", name: "name", def: "", min: 1, max: 50, valid: "", visible: { socketId: 2, func: x => !x, def: true }, connectionType: TEXT },
      { type: "output", name: "data", connectionType: "compiler/any" },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    const channel = asBool(values[0]);

    if (channel === false) {
      values[6] = null;
      return true;
    }

    const socketNode = instance.sockets[0].connection?.node;

    if (socketNode === undefined) {
      instance.setIssues(["Input connection node is missing"]);
      instance.sockets[0].setErrorState(true);
      values[6] = null;
      return false;
    }

    const socket = getSocketDefinition(socketNode)?.def;

    if (socket === undefined) {
      instance.setIssues(["Socket definition is undefined"]);
      instance.sockets[0].setErrorState(true);
      values[6] = null;
      return false;
    }

    if (typeof(channel) !== "boolean") {
      socket.visible = channel;
    }

    switch (socket.type) {
      case "named":
        values[6] = { socket: socket, func: x => x, def: "" };
        return true;
      case "number":
        values[6] = { socket: socket, func: x => x, def: socket.def };
        return true;
      case "switch":
        values[6] = { socket: socket, func: x => x, def: socket.def };
        return true;
      case "text":
        values[6] = { socket: socket, func: x => x, def: socket.def };
        return true;
      default:
        instance.setIssues(["Invalid socket definition type"]);
        values[6] = null;
        return false;
    }
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
      { type: "text", name: "", def: "", min: 1, max: 50, valid: "" },
      { type: "output", name: "then", connectionType: OPTION_FLOW },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    const input = asBool(values[0]);

    if (input === false) {
      values[2] = false;
      return true;
    }

    const socketNode = instance.sockets[0].connection?.node;

    if (socketNode === undefined) {
      instance.setIssues(["Input connection node is missing"]);
      instance.sockets[0].setErrorState(true);
      values[2] = false;
      return false;
    }

    const socket = getSocketDefinition(socketNode)?.def;

    if (socket?.type !== "select") {
      instance.setIssues(["Only select sockets can have options"]);
      instance.sockets[0].setErrorState(true);
      values[2] = false;
      return false;
    }

    const optionName = toString(values[1]);

    if (optionName.trim().length < 1) {
      instance.setIssues(["Option name cannot be blank"]);
      instance.sockets[1].setErrorState(true);
      values[2] = false;
      return false;
    }

    const isDefault = socket.def === optionName;
    values[2] = typeof(input) === "boolean" ? { socket: socket, func: x => x === optionName, def: isDefault } : { socket: input.socket, func: x => input.func(x) && x === optionName, def: input.def && isDefault };
    socket.options.push(optionName);
    socket.options.sort();
    return true;
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
    const numberVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === "number", def: true };
    const textOrTypeVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === "text" || x === "type", def: false };
    const boolVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === "bool", def: false };

    return new EditorNode(this, graph, x, y, "condition", BUILT_IN_COLOR, [
      { type: "select", name: "input", def: "number", options: ["number", "text", "bool", "type"] },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals", "less than", "greater than", "less or equal", "greater or equal"], visible: numberVisible },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals"], visible: textOrTypeVisible },
      { type: "select", name: "operation", def: "equals", options: ["equals", "not equals", "and", "or", "not"], visible: boolVisible },
      { type: "number", name: "", def: 0, min: -100, max: 100, step: 1, visible: numberVisible, connectionType: NUMBER },
      { type: "number", name: "", def: 0, min: -100, max: 100, step: 1, visible: numberVisible, connectionType: NUMBER },
      { type: "text", name: "", def: "", min: 0, max: 50, valid: "", visible: textOrTypeVisible, connectionType: TEXT },
      { type: "text", name: "", def: "", min: 0, max: 50, valid: "", visible: textOrTypeVisible, connectionType: TEXT },
      { type: "switch", name: "", def: false, active: "true", inactive: "false", visible: boolVisible, connectionType: [BOOLEAN, TRUTH_FLOW] },
      { type: "switch", name: "", def: false, active: "true", inactive: "false", visible: { socketId: 3, func: x => x !== "not", def: false }, connectionType: [BOOLEAN, TRUTH_FLOW] },
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
      { type: "text", name: "name", def: "", min: 0, max: MAX_NAME, valid: "", connectionType: TEXT },
      { type: "text", name: "color", def: "333333", min: 6, max: 6, valid: "0123456789abcdef", connectionType: TEXT },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    const color = asString(values[2]);

    if (typeof(color) === "string" && color.length !== 6) {
      instance.setIssues(["Invalid color input value"]);
      instance.sockets[2].setErrorState(true);
      return false;
    }

    setMetadata({ name: asString(values[1]), color: color });
    return true;
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
    const nameSrc =  { socketId: 0, func: (/** @type {Param} */ x) => typeof(x) === "string" ? `${x.substring(x.lastIndexOf('/') + 1)} byte` : "text byte", def: "text byte" };

    return new EditorNode(this, graph, x, y, nameSrc, BUILT_IN_COLOR, [
      { type: "select", name: "type", def: TEXT, options: [TEXT, NUMBER, BOOLEAN] },
      { type: "text", name: "", def: "", min: 0, max: 8, valid: "01" },
      { type: "output", name: "value", visible: { socketId: 0, func: x => x === TEXT, def: true }, connectionType: TEXT },
      { type: "output", name: "value", visible: { socketId: 0, func: x => x === NUMBER, def: false }, connectionType: NUMBER },
      { type: "output", name: "value", visible: { socketId: 0, func: x => x === BOOLEAN, def: false }, connectionType: BOOLEAN },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    switch (values[0]) {
      case TEXT:
        values[2] = String.fromCharCode(binaryToInt(toString(values[1])));
        return true;
      case NUMBER:
        values[3] = binaryToInt(toString(values[1]));
        return true;
      case BOOLEAN:
        values[4] = toString(values[1]).includes('1');
        return true;
      default:
        instance.setIssues(["Invalid data type"]);
        instance.sockets[0].setErrorState(true);
        return false;
    }
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
    const integerVisible = { socketId: 2, func: (/** @type {Param} */ x) => x === "integer", def: false };

    return new EditorNode(this, graph, x, y, "format", BUILT_IN_COLOR, [
      { type: "named", name: "data", connectionType: TEXT },
      { type: "select", name: "original", def: "binary", options: formats },
      { type: "select", name: "target", def: "binary", options: formats },
      { type: "switch", name: "sign", def: false, active: "signed", inactive: "unsigned", visible: integerVisible, connectionType: BOOLEAN },
      { type: "number", name: "bytes", def: 4, min: 1, max: 16, step: 1, visible: integerVisible, connectionType: NUMBER },
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
      { type: "text", name: "separator", def: "", min: 0, max: 50, valid: "", connectionType: [TEXT, NUMBER, BOOLEAN] },
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
      { type: "number", name: "", def: 0, min: -100, max: 100, step: 0.0001, connectionType: NUMBER },
      { type: "number", name: "", def: 0, min: -100, max: 100, step: 0.0001, visible: { socketId: 0, func: x => x !== "sin" && x !== "cos" && x !== "tan", def: true }, connectionType: NUMBER },
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
      { type: "text", name: "sequence", def: "", min: 0, max: 50, valid: "", connectionType: TEXT },
      { type: "number", name: "amount", def: 2, min: 1, max: 50, step: 1, connectionType: NUMBER },
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
    const textVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === TEXT, def: true };
    const numberVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === NUMBER, def: false };
    const booleanVisible = { socketId: 0, func: (/** @type {Param} */ x) => x === BOOLEAN, def: false };

    return new EditorNode(this, graph, x, y, "literal value", BUILT_IN_COLOR, [
      { type: "select", name: "type", def: TEXT, options: [TEXT, NUMBER, BOOLEAN] },
      { type: "text", name: "", def: "", min: 0, max: MAX_LENGTH, valid: "", visible: textVisible },
      { type: "number", name: "", def: 5, min: -MAX_NUMBER, max: MAX_NUMBER, step: MIN_NUMBER, visible: numberVisible },
      { type: "switch", name: "", def: false, active: "true", inactive: "false", visible: booleanVisible },
      { type: "output", name: "data", visible: textVisible, connectionType: TEXT },
      { type: "output", name: "data", visible: numberVisible, connectionType: NUMBER },
      { type: "output", name: "data", visible: booleanVisible, connectionType: BOOLEAN },
    ]);
  }

  /**
   * @param {EditorNode} instance
   * @param {CacheValue[]} values
   */
  compile(instance, values) {
    switch (values[0]) {
      case TEXT:
        values[4] = toString(values[1]);
        return true;
      case NUMBER:
        values[5] = toNumber(values[2]);
        return true;
      case BOOLEAN:
        values[6] = toBool(values[3]);
        return true;
      default:
        instance.setIssues(["Invalid data type"]);
        instance.sockets[0].setErrorState(true);
        return false;
    }
  }
}