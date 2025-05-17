// @ts-check
import { travelGraphFromOutputs } from "./pathing.js";

/**
 * @typedef {import("./nodes.js").EditableNode} EditableNode
 * @typedef {import("../renderer/nodes.js").EditorNode} EditorNode
 */

/** @type {EditableNode} */
let context;

/** @param {EditableNode} node */
export const setCompilerContext = node => context = node;

export const compileGraph = () => {
  context.setErrorState(false);
  const graph = context.graph;

  for (const node of graph.addedNodes) {
    node.setIssues([]);

    for (const socket of node.sockets) {
      socket.setErrorState(false);
    }
  }

  travelGraphFromOutputs(graph, sc => {}, node => node.type?.compile(node));
};