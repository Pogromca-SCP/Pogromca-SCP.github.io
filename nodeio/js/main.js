// @ts-check
import { redoAction, undoAction } from "./history.js";
import { createNode, initialize } from "./library.js";
import { closeContextMenu } from "./menu.js";
import { NodeGraph } from "./renderer/graph.js";

const emptyOp = () => {};

globalThis.closeMenu = closeContextMenu;
globalThis.newGraph = emptyOp;
globalThis.openGraph = emptyOp;
globalThis.saveGraph = emptyOp;
globalThis.undoAction = undoAction;
globalThis.redoAction = redoAction;
globalThis.centerView = NodeGraph.centerCurrent;
globalThis.addNode = createNode;

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