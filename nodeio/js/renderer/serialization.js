// @ts-check
import { compileGraph, setCompilerContext } from "../compiler/compiler.js";
import { CustomNode } from "../compiler/nodes.js";
import { getNode, nodeExists, ROOT } from "./graph.js";
import { EditorNode } from "./nodes.js";

/**
 * @typedef {import("../compiler/nodes.js").CompiledNode} CompiledNode
 * @typedef {import("./graph.js").NodeGraph} NodeGraph
 * @typedef {import("./sockets.js").SocketBase<any>} SocketBase 
 * @typedef {import("./sockets.js").RepetetiveSocket} RepetetiveSocket
 * 
 * @typedef {object} ConnectionData
 * @property {number | "inputs" | "outputs"} node
 * @property {number} socket
 * 
 * @typedef {object} NodeData
 * @property {string | null} type
 * @property {number} x
 * @property {number} y
 * @property {(null | boolean | number | string | ConnectionData | ConnectionData[])[]} sockets
 * 
 * @typedef {object} GraphData
 * @property {NodeData | null} inputs
 * @property {NodeData | null} outputs
 * @property {NodeData[]} nodes
 * @property {string[]} dependsOn
 * 
 * @typedef {object} ProjectData
 * @property {GraphData} root
 * @property {Record<string, GraphData>} graphs
 */

/**
 * @param {SocketBase} socket
 * @param {EditorNode | null} inputs
 * @param {EditorNode | null} outputs
 * @param {readonly EditorNode[]} nodes
 */
const getValue = (socket, inputs, outputs, nodes) => {
  if (socket.isOutput) {
    return null;
  }

  const connection = socket.connection;

  if (connection === null) {
    return socket.value;
  }

  const connectionNode = connection.node;
  const nodeId = connectionNode === inputs ? "inputs" : (connectionNode === outputs ? "outputs" : nodes.indexOf(connectionNode));

  return {
    node: nodeId,
    socket: connectionNode.sockets.indexOf(connection),
  };
};

/**
 * @param {EditorNode} node
 * @param {NodeGraph} graph
 * @param {readonly EditorNode[]} nodes
 */
const saveNode = (node, graph, nodes) => {
  /** @type {(null | boolean | number | string | ConnectionData | ConnectionData[])[]} */
  const values = [];
  const inputs = graph.inputsNode;
  const outputs = graph.outputsNode;

  for (const socket of node.sockets) {
    let nextSocket = /** @type {RepetetiveSocket} */ (socket).next;

    if (nextSocket === undefined) {
      values.push(getValue(socket, inputs, outputs, nodes));
    } else {
      /** @type {ConnectionData[]} */
      const conns = [];
      conns.push(getValue(socket, inputs, outputs, nodes));

      while (nextSocket) {
        conns.push(getValue(nextSocket, inputs, outputs, nodes));
        nextSocket = nextSocket.next;
      }

      values.push(conns);
    }
  }

  return {
    type: node.type?.id ?? null,
    x: node.x,
    y: node.y,
    sockets: values,
  };
};

/** @param {NodeGraph} graph */
const saveGraph = graph => {
  const inputs = graph.inputsNode;
  const outputs = graph.outputsNode;
  /** @type {Set<CompiledNode>} */
  const dependencies = new Set();
  /** @type {EditorNode[]} */
  const nodes = [];

  for (const node of graph.addedNodes) {
    const type = node.type;

    if (type !== null) {
      dependencies.add(type);
    }

    nodes.push(node);
  }

  const result = {
    inputs: inputs === null ? null : saveNode(inputs, graph, nodes),
    outputs: outputs === null ? null : saveNode(outputs, graph, nodes),
    nodes: nodes.map(n => saveNode(n, graph, nodes)),
    dependsOn: Array.from(dependencies).map(dep => dep.id).filter(id => id !== null),
  };
  
  return result;
};

/**
 * @param {NodeGraph} root
 * @param {Readonly<Map<string, NodeGraph>>} nodes
 */
export const serializeProject = (root, nodes) => {
  /** @type {Record<string, GraphData>} */
  const graphs = {};

  for (const kvp of nodes) {
    graphs[kvp[0]] = saveGraph(kvp[1]);
  }

  return {
    root: saveGraph(root),
    graphs: graphs,
  };
};

/**
 * @param {string} id
 * @param {Readonly<GraphData>} graph
 * @param {Readonly<Record<string, GraphData>>} graphs
 * @param {Set<string>} visited
 */
const processDependencies = (id, graph, graphs, visited) => {
  const dependencies = graph.dependsOn;

  if (!Array.isArray(dependencies)) {
    throw new Error(`Dependencies array is missing for: ${id}`);
  }

  for (const dep of dependencies.filter(d => typeof(d) === "string" && !visited.has(d))) {
    const depGraph = graphs[dep];

    if (depGraph) {
      loadGraph(dep, depGraph, graphs, visited);
    }
  }
};

/**
 * @param {string} id
 * @param {Readonly<GraphData>} graph
 */
const validateGraph = (id, graph) => {
  if (id.trim().length < 1) {
    throw new Error(`Invalid graph name: ${id}`);
  }

  if (nodeExists(id)) {
    throw new Error(`Graph already exists: ${id}`);
  }

  if (!Array.isArray(graph.nodes)) {
    throw new Error(`Missing nodes array for graph: ${id}`);
  }
};

/**
 * @param {NodeData | null} data
 * @param {EditorNode | null} target
 */
const moveNode = (data, target) => {
  if (!data || target === null) {
    return;
  }

  const x = data.x;
  const y = data.y;
  const offsetX = typeof(x) === "number" ? x : 0;
  const offsetY = typeof(y) === "number" ? y : 0;
  target.transientMove(offsetX, offsetY);
};

/** @param {Readonly<NodeData>} node */
const validateNode = node => {
  if (!node) {
    throw new Error("Invalid node definition");
  }

  if (typeof(node.x) !== "number") {
    throw new Error("X node coordinate is not a number");
  }

  if (typeof(node.y) !== "number") {
    throw new Error("Y node coordinate is not a number");
  }

  if (node.type !== null && typeof(node.type) !== "string") {
    throw new Error("Invalid node type value");
  }

  if (!Array.isArray(node.sockets)) {
    throw new Error("Node has missing sockets array");
  }
};

/**
 * @param {NodeGraph} graph
 * @param {EditorNode[]} placed
 * @param {Readonly<NodeData>} node
 */
const loadNode = (graph, placed, node) => {
  validateNode(node);
  const typeId = node.type;
  const nodeType = getNode(typeId ?? "");

  if (nodeType === undefined) {
    throw new Error(`Cannod instantiate node from type: ${typeId}`);
  }

  const createdNode = nodeType.instantiate(node.x, node.y, graph);
  createdNode.transientAdd();
  placed.push(createdNode);
};

/**
 * @param {EditorNode} node
 * @param {SocketBase} targetSocket
 * @param {number} socketId
 */
const loadConnection = (node, targetSocket, socketId) => {
  const sockets = node.sockets;

  if (typeof(socketId) !== "number" || socketId < 0 || socketId >= sockets.length) {
    throw new Error(`Invalid socket id: ${socketId}`)
  }

  const connectionSocket = sockets[socketId];

  if (!targetSocket.validateConnection(connectionSocket)) {
    throw new Error(`Cannot assign invalid connection: ${socketId}`);
  }

  targetSocket.transientChangeConnection(connectionSocket, true);
};

/**
 * @param {readonly EditorNode[]} nodes
 * @param {SocketBase} targetSocket
 * @param {null | boolean | number | string | ConnectionData | ConnectionData[]} value
 * @param {EditorNode | null} inputs
 * @param {EditorNode | null} outputs
 */
const loadValue = (nodes, targetSocket, value, inputs, outputs) => {
  if (Array.isArray(value)) {
    let index = 0;
    let nextSocket = /** @type {RepetetiveSocket | null} */ (targetSocket);

    while (nextSocket) {
      loadValue(nodes, nextSocket, value[index], inputs, outputs);
      ++index;
      nextSocket = nextSocket.next;
    }

    return;
  }

  if (typeof(value) === "object" && value !== null) {
    const node = value.node;
    const socket = value.socket;

    if (node === "inputs") {
      if (inputs === null) {
        throw new Error("Inputs node doesn't exist");
      }

      loadConnection(inputs, targetSocket, socket);
      return;
    }

    if (node === "outputs") {
      if (outputs === null) {
        throw new Error("Outputs node doesn't exist");
      }

      loadConnection(outputs, targetSocket, socket);
      return;
    }

    if (typeof(node) !== "number" || node < 0 || node >= nodes.length) {
      throw new Error(`Invalid node id: ${node}`);
    }

    loadConnection(nodes[node], targetSocket, socket);
    return;
  }

  if (typeof(targetSocket.value) !== typeof(value) || !targetSocket.validateValue(value)) {
    throw new Error(`Cannot assign invalid value: ${value}`);
  }

  targetSocket.transientChangeValue(value);
};

/**
 * @param {string} id
 * @param {Readonly<GraphData>} graph
 * @param {Readonly<Record<string, GraphData>>} graphs
 * @param {Set<string>} visited
 */
const loadGraph = (id, graph, graphs, visited) => {
  if (visited.has(id)) {
    return;
  }

  visited.add(id);
  validateGraph(id, graph);
  processDependencies(id, graph, graphs, visited);
  const createdType = new CustomNode();
  createdType.transientChangeId(id);
  const innerGraph = createdType.graph;
  const inputs = innerGraph.inputsNode;
  const outputs = innerGraph.outputsNode;
  moveNode(graph.inputs, inputs);
  moveNode(graph.outputs, outputs);
  const nodes = graph.nodes;
  /** @type {EditorNode[]} */
  const placedNodes = [];

  for (const node of nodes) {
    loadNode(innerGraph, placedNodes, node);
  }

  const nodesLength = nodes.length;

  for (let i = 0; i < nodesLength; ++i) {
    const socketsData = nodes[i].sockets;
    const nodeSockets = placedNodes[i].sockets;
    const socketsLength = socketsData.length;

    for (let j = 0; j < socketsLength; ++j) {
      loadValue(placedNodes, nodeSockets[j], socketsData[j], inputs, outputs);
    }
  }

  setCompilerContext(createdType);
  compileGraph();
};

/**
 * @param {string} id
 * @param {Readonly<GraphData>} graph
 * @param {Readonly<Record<string, GraphData>>} graphs
 * @param {Set<string>} visited
 */
const loadRoot = (id, graph, graphs, visited) => {
  if (!Array.isArray(graph.nodes)) {
    throw new Error(`Missing nodes array for root graph: ${id}`);
  }

  processDependencies(id, graph, graphs, visited);
  const rootType = getNode(id);

  if (rootType === undefined) {
    throw new Error(`Cannot find root graph: ${id}`);
  }

  const innerGraph = rootType.graph;

  if (innerGraph === null) {
    throw new Error("Couldn't retrieve root graph");
  }

  const inputs = innerGraph.inputsNode;
  const outputs = innerGraph.outputsNode;
  moveNode(graph.inputs, inputs);
  moveNode(graph.outputs, outputs);
  const nodes = graph.nodes;
  /** @type {EditorNode[]} */
  const placedNodes = [];

  for (const node of nodes) {
    loadNode(innerGraph, placedNodes, node);
  }

  const nodesLength = nodes.length;

  for (let i = 0; i < nodesLength; ++i) {
    const socketsData = nodes[i].sockets;
    const nodeSockets = placedNodes[i].sockets;
    const socketsLength = socketsData.length;

    for (let j = 0; j < socketsLength; ++j) {
      loadValue(placedNodes, nodeSockets[j], socketsData[j], inputs, outputs);
    }
  }

  rootType.openInEditor();
};

/** @param {Readonly<ProjectData>} project */
export const deserializeProject = project => {
  if (!project) {
    throw new Error("Project definition wasn't provided");
  }

  const graphs = project.graphs;
  const root = project.root;

  if (!graphs) {
    throw new Error("Project graphs weren't provided");
  }

  if (!root) {
    throw new Error("Project root graph wasn't provided");
  }

  /** @type {Set<string>} */
  const visited = new Set();

  for (const id in graphs) {
    const gr = graphs[id];

    if (!gr) {
      throw new Error(`Provided graph definition is invalid: ${id}`);
    }

    loadGraph(id, gr, graphs, visited);
  }

  loadRoot(ROOT, root, graphs, visited);
};