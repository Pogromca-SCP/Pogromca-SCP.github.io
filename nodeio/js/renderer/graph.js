// @ts-check
import { CompiledNode } from "../compiler/nodes.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

export const DRAG_DROP_DATA_FORMAT = "text/plain";

graph.addEventListener("dragover", e => e.preventDefault());

graph.addEventListener("drop", e => {
  const node = CompiledNode.get(e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");

  if (node === undefined) {
    return;
  }

  node.spawnNode(e.pageX, e.pageY).render(graph);
});