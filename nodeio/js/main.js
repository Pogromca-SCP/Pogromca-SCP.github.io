// @ts-check
import { loadItems } from "./explorer.js";
import { newProject, openProject, saveProject } from "./graph.js";
import { redoAction, undoAction } from "./history.js";
import { closeContextMenu } from "./menu.js";
import { clearProperties, showProperties } from "./properties.js";
import settings from "./settings.js";

window["newGraph"] = newProject;
window["openGraph"] = openProject;
window["saveGraph"] = saveProject;

window.addEventListener("beforeunload", e => {
  e.preventDefault();
  return "";
});

window["undoAction"] = undoAction;
window["redoAction"] = redoAction;

window["clearProps"] = clearProperties;
window["openSettings"] = () => showProperties("Settings", settings);
window["closeMenu"] = closeContextMenu;

/** @type {Readonly<Record<string, () => void>>} */
const binds = {
  o: openProject,
  s: saveProject,
  z: undoAction,
  y: redoAction
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

loadItems();