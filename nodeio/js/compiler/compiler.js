// @ts-check
import { hasFlag } from "../utils.js";
import { travelGraphFromOutputs } from "./pathing.js";

/**
 * @typedef {import("./nodes.js").EditableNode} EditableNode
 * @typedef {import("../renderer/nodes.js").EditorNode} EditorNode
 * @typedef {import("../renderer/sockets.js").SocketBase} SocketBase
 * @typedef {import("../renderer/nodes.js").SocketDefinition} SocketDefinition
 * 
 * @typedef {{ slot: number }} SocketSlot
 * @typedef {SocketDefinition & SocketSlot} SocketSlotDefinition
 * @typedef {undefined | null | boolean | number | string | DataSourceMock} Value
 * @typedef {Value | Value[]} CacheValue
 * 
 * @typedef {object} NodeMetadata
 * @property {DataSource<string>} name
 * @property {DataSource<string>} color
 * 
 * @typedef {object} DataSourceMock
 * @property {SocketDefinition} socket
 * @property {(x: null | boolean | number | string) => unknown} func
 * @property {null | boolean | number | string} def
 */

/**
 * @template T
 * @typedef {import("../renderer/nodes.js").DataSource<T>} DataSource<T>
 */

/** @type {Map<EditorNode, CacheValue[]>} */
let previousState;
/** @type {Map<EditorNode, CacheValue[]>} */
let currentState;
/** @type {Map<EditorNode, SocketSlotDefinition>} */
let temporarySockets;
/** @type {SocketSlotDefinition} */
let currentSocket;
/** @type {EditableNode} */
let context;

/** @param {SocketBase} socket */
const processSocket = socket => {
  const node = socket.node;

  if (node.type === null) {
    return;
  }

  if (!currentState.has(node)) {
    currentState.set(node, Array(node.sockets.length));
  }

  const connection = socket.connection;
  /** @type {Value} */
  let value;

  if (connection !== null && connection.node.isVisible) {
    const otherNode = connection.node;

    if (otherNode.type === null) {
      value = true;
    } else {
      value = /** @type {Value[]} */ (currentState.get(otherNode))[otherNode.sockets.indexOf(connection)];
    }
  } else {
    value = hasFlag(socket.flags, 2) ? undefined : value;
  }

  const index = node.sockets.indexOf(socket);
  const values = /** @type {CacheValue[]} */ (currentState.get(node));
  
  if (index < 0) {
    const last = values.length - 1;
    const oldValue = values[last];

    if (Array.isArray(oldValue)) {
      oldValue.push(value);
    } else {
      values[last] = [oldValue, value];
    }
  } else {
    values[index] = value;
  }
};

/**
 * @param {CacheValue[]} current
 * @param {CacheValue[]} prev
 */
const changesWereMade = (current, prev) => {
  const length = current.length;

  if (length !== prev.length) {
    return true;
  }

  for (let i = 0; i < length; ++i) {
    const state = current[i];
    const oldState = prev[i];

    if (Array.isArray(state)) {
      const innerLength = state.length;

      if (!Array.isArray(oldState) || innerLength !== oldState.length) {
        return true;
      }

      for (let j = 0; j < innerLength; ++j) {
        if (state[j] !== state[j]) {
          return true;
        }
      }
    } else if (state !== undefined && state !== oldState) {
      return true;
    }
  }

  return false;
};

/** @param {EditorNode} node */
const processNode = node => {
  if (node.type === null) {
    return;
  }

  const current = /** @type {CacheValue[]} */ (currentState.get(node));
  const previous = previousState.get(node);

  if (previous === undefined || changesWereMade(current, previous)) {
    node.type.compile(node, current);
  } else {
    const length = current.length;

    for (let i = 0; i < length; ++i) {
      if (current[i] === undefined) {
        current[i] = previous[i];
      }
    }
  }
};

/**
 * @param {EditorNode} node
 * @param {SocketSlotDefinition} def
 */
export const setSocketDefinition = (node, def) => {
  temporarySockets.set(node, def);
  currentSocket = def;
};

/** @param {EditorNode} node */
export const removeSocketDefinition = node => temporarySockets.delete(node);

export const getCurrentSocketDefinition = () => currentSocket;

/** @param {EditableNode} node */
export const setCompilerContext = node => {
  context = node;
  currentState = new Map();
  temporarySockets = new Map();
};

export const compileGraph = () => {
  context.setErrorState(false);
  const graph = context.graph;

  for (const node of graph.addedNodes) {
    node.setIssues([]);

    for (const socket of node.sockets) {
      socket.setErrorState(false);
    }
  }

  previousState = currentState;
  currentState = new Map();
  travelGraphFromOutputs(graph, processSocket, processNode);

  for (const socketNode of Array.from(temporarySockets.keys()).filter(n => !currentState.has(n))) {
    currentState.delete(socketNode);
  }
  
  const sockets = Array.from(temporarySockets.values()).sort((s1, s2) => s1.slot - s2.slot);

  context.setSockets(sockets.map(s => {
    const obj = {};

    for (const key in s) {
      if (key !== "slot") {
        /** @type {} */
        const value = s[key];

        if (value !== null && typeof(value) === "object") {
          obj[key] = { socketId: sockets.indexOf(value.socket), func: value.func, def: value.def };
        } else {
          obj[key] = value;
        }
      }
    }

    return /** @type {SocketDefinition} */ (obj);
  }));
};