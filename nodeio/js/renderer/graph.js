// @ts-check
import { renderNode } from "./nodes.js";

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

/**
 * 
 */

export const DRAG_DROP_DATA_FORMAT = "text/plain";

/** @param {DragEvent} e */
graph.ondrop = e => renderNode(graph, e.dataTransfer?.getData(DRAG_DROP_DATA_FORMAT) ?? "");