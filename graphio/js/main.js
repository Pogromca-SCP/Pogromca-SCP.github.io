// @ts-check
import { newProject, openProject, saveProject } from "./explorer.js";
import { undoAction, redoAction } from "./history.js";
import { showProperties, clearProperties } from "./properties.js";
import settings from "./settings.js";
import { closeContextMenu } from "./menu.js";

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

document.addEventListener("keydown", e => {
  if (!e.ctrlKey) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  switch (e.key) {
    case "o":
      openProject();
      break;
    case "s":
      saveProject();
      break;
    case "z":
      undoAction();
      break;
    case "y":
      redoAction();
      break;
    default:
      break;
  }
});

newProject();