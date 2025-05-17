// @ts-check
import { travelGraphFromOutputs } from "./pathing.js";

/**
 * @typedef {import("./nodes.js").EditableNode} EditableNode
 */

/** @type {EditableNode} */
let context;

/** @param {EditableNode} node */
export const setCompilerContext = node => context = node;

export const compileGraph = () => {
  const graph = context.graph;

  for (const node of graph.addedNodes) {
    node.setIssues([]);
  }

  const now = Date.now();
  travelGraphFromOutputs(graph, sc => {}, node => node.setIssues([`Reached ${now}`]));
};