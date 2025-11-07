// @ts-check
import { redoAction, undoAction } from "./history.js";
import { createNode, initialize } from "./library.js";
import { closeContextMenu } from "./menu.js";
import { NodeGraph } from "./renderer/graph.js";

const emptyOp = () => {};

// @ts-ignore
window["closeMenu"] = closeContextMenu;
// @ts-ignore
window["newGraph"] = emptyOp;
// @ts-ignore
window["openGraph"] = emptyOp;
// @ts-ignore
window["saveGraph"] = emptyOp;
// @ts-ignore
window["undoAction"] = undoAction;
// @ts-ignore
window["redoAction"] = redoAction;
// @ts-ignore
window["centerView"] = NodeGraph.centerCurrent;
// @ts-ignore
window["addNode"] = createNode;

window.addEventListener("beforeunload", e => {
  e.preventDefault();
  return "";
});

/** @type {Readonly<Record<string, () => void>>} */
const binds = {
  o: emptyOp,
  s: emptyOp,
  z: undoAction,
  y: redoAction,
};

document.addEventListener("keydown", e => {
  if (!e.ctrlKey) {
    return;
  }

  const op = binds[e.key];

  if (op !== undefined) {
    e.preventDefault();
    e.stopPropagation();
    op();
  }
});

initialize();