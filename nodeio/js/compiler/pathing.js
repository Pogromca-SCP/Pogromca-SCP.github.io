// @ts-check

/**
 * @typedef {import("../renderer/graph.js").NodeGraph} NodeGraph
 * @typedef {import("../renderer/nodes.js").EditorNode} EditorNode
 * @typedef {import("../renderer/sockets.js").SocketBase} SocketBase
 * @typedef {import("../renderer/sockets.js").RepetetiveSocket} RepetetiveSocket
 */

/** @type {(sc: SocketBase) => void} */
let socketHandler;
/** @type {(node: EditorNode) => void} */
let nodeHandler;

/**
 * @param {EditorNode[]} state
 * @param {SocketBase} socket
 */
const visitSocket = (state, socket) => {
  const targetNode = socket.connection?.node;

  if (targetNode?.isVisible) {
    visitNode(state, targetNode);
  }

  socketHandler(socket);
  const nextSocket = /** @type {RepetetiveSocket} */ (socket).next;

  if (nextSocket) {
    visitSocket(state, nextSocket);
  }
};

/**
 * @param {EditorNode[]} state
 * @param {EditorNode} node
 */
const visitNode = (state, node) => {
  if (state.includes(node)) {
    return;
  }

  state.push(node);

  for (const sc of node.sockets.filter(s => s.isVisible)) {
    visitSocket(state, sc);
  }

  nodeHandler(node);
};

/**
 * @param {NodeGraph} graph
 * @param {(sc: SocketBase) => void} onSocket
 * @param {(node: EditorNode) => void} onNode
 */
export const travelGraphFromOutputs = (graph, onSocket, onNode) => {
  const outputs = graph.outputsNode;

  if (outputs === null) {
    return;
  }

  socketHandler = onSocket;
  nodeHandler = onNode;
  visitNode([], outputs);
};