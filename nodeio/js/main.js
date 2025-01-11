// @ts-check
import { redoAction, undoAction } from "./history.js";
import { initialize } from "./library.js";
import { closeContextMenu } from "./menu.js";




const emptyOp = () => {};

window["closeMenu"] = closeContextMenu;
window["newGraph"] = emptyOp;
window["openGraph"] = emptyOp;
window["saveGraph"] = emptyOp;
window["undoAction"] = undoAction;
window["redoAction"] = redoAction;

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