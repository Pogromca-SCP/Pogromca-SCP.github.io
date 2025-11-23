// @ts-check
import { travelGraphFromOutputs } from "./pathing.js";

/**
 * @typedef {import("./nodes.js").EditableNode} EditableNode
 * @typedef {import("../renderer/nodes.js").EditorNode} EditorNode
 * @typedef {import("../renderer/nodes.js").Param} Param
 * @typedef {import("../renderer/sockets.js").SocketBase<any>} SocketBase
 * @typedef {import("../renderer/nodes.js").SocketDefinition} SocketDefinition
 * 
 * @typedef {undefined | null | boolean | number | string | ResolvableDynamicData<Param>} Value
 * @typedef {Value | Value[]} CacheValue
 * 
 * @typedef {object} SocketSlotDefinition
 * @property {number} slot
 * @property {SocketDefinition} def
 * 
 * @typedef {object} NodeMetadata
 * @property {DataSource<string>} name
 * @property {DataSource<string>} color
 */

/**
 * @template T
 * @typedef {import("../renderer/nodes.js").ResolvableDynamicData<T>} ResolvableDynamicData
 */

/**
 * @template T
 * @typedef {import("../renderer/nodes.js").DataSource<T>} DataSource
 */

/** @type {Map<EditorNode, CacheValue[]>} */
let currentState;
/** @type {Map<EditorNode, SocketSlotDefinition>} */
let currentSockets;
/** @type {NodeMetadata} */
let currentMetadata;
/** @type {EditableNode} */
let context;
/** @type {boolean} */
let hadError;

/**
 * @param {SocketBase} socket
 * @returns {Value}
 */
const resolveSocketValue = socket => {
  const connection = socket.connection;

  if (connection === null || !connection.isVisible || !connection.node.isVisible) {
    return socket.isOutput ? undefined : socket.value;
  }

  const otherNode = connection.node;

  if (otherNode.type === null) {
    return true;
  }

  const socketValues = currentState.get(otherNode);
  const tmp = socketValues === undefined ? null : socketValues[otherNode.sockets.indexOf(connection)];
  return Array.isArray(tmp) ? null : tmp;
};

/** @param {SocketBase} socket */
const processSocket = socket => {
  const node = socket.node;

  if (node.type === null) {
    return;
  }

  if (!currentState.has(node)) {
    currentState.set(node, Array(node.sockets.length));
  }

  const value = resolveSocketValue(socket);
  const index = node.sockets.indexOf(socket);
  const otherValues = currentState.get(node);

  if (otherValues === undefined) {
    context.setErrorState(true);
    hadError = true;
    throw new Error("Socket node isn't present in currentState");
  }
  
  if (index < 0) {
    const last = otherValues.length - 1;
    const oldValue = otherValues[last];

    if (Array.isArray(oldValue)) {
      oldValue.push(value);
    } else {
      otherValues[last] = [oldValue, value];
    }
  } else {
    otherValues[index] = value;
  }
};

/** @param {EditorNode} node */
const processNode = node => {
  const nodeType = node.type;

  if (nodeType === null) {
    return;
  }

  const socketValues = currentState.get(node) ?? [];
  console.debug(`Compiling '${node.type?.id}' node...`, socketValues);

  if (!nodeType.compile(node, socketValues)) {
    context.setErrorState(true);
    hadError = true;
  }

  console.debug(`Compiled '${node.type?.id}' node.`, socketValues);
};

export const BUILT_IN_COLOR = "333";

/**
 * @param {EditorNode} node
 * @param {Readonly<SocketSlotDefinition>} def
 */
export const setSocketDefinition = (node, def) => currentSockets.set(node, def);

/** @param {EditorNode} node */
export const removeSocketDefinition = node => currentSockets.delete(node);

/** @param {EditorNode} node */
export const getSocketDefinition = node => currentSockets.get(node);

/** @param {NodeMetadata} meta */
export const setMetadata = meta => currentMetadata = meta;

/** @param {EditableNode} node */
export const setCompilerContext = node => context = node;

export const compileGraph = () => {
  context.setErrorState(false);
  hadError = false;
  const graph = context.graph;

  for (const node of graph.addedNodes) {
    node.setIssues([]);

    for (const socket of node.sockets) {
      socket.setErrorState(false);
    }
  }

  currentState = new Map();
  currentSockets = new Map();
  currentMetadata = { name: context.id ?? "", color: BUILT_IN_COLOR };
  travelGraphFromOutputs(graph, processSocket, processNode);

  if (hadError) {
    return;
  }

  context.setMetadata(currentMetadata);
  const sockets = Array.from(currentSockets.values()).sort((s1, s2) => s1.slot - s2.slot);
  context.setSockets(sockets.map(s => s.def));
  context.updateHash();
};