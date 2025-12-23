// @ts-check
import { redoAction, undoAction } from "./history.js";
import { createNode, initialize, newProject, openProject, saveProject } from "./library.js";
import { closeContextMenu } from "./menu.js";
import { NodeGraph } from "./renderer/graph.js";

globalThis.closeMenu = closeContextMenu;
globalThis.newGraph = newProject;
globalThis.openGraph = openProject;
globalThis.saveGraph = saveProject;
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
  o: openProject,
  s: saveProject,
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