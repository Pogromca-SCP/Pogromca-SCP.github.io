// @ts-check
import { newProject } from "./explorer.js";
import { loadFile, saveFile } from "./files.js";
import { undoAction, redoAction } from "./history.js";
import { showProperties, clearProperties } from "./properties.js";
import settings from "./settings.js";

window["newGraph"] = newProject;

window["openGraph"] = () => {
  loadFile(str => console.log(str), "application/json");
};

window["saveGraph"] = () => {
  saveFile("test.json", JSON.stringify({}));
};

window["importGraph"] = () => {
  loadFile(str => console.log(str), ".sql");
};

window["exportGraph"] = () => {
  saveFile("test.sql", JSON.stringify({}));
};

window.addEventListener("beforeunload", e => {
  e.preventDefault();
  return "";
});

window["undoAction"] = undoAction;
window["redoAction"] = redoAction;

window["clearProps"] = clearProperties;
window["openSettings"] = () => showProperties("Settings", settings);

document.addEventListener("keydown", e => {
  if (!e.ctrlKey) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  switch (e.key) {
    case "n":
      newProject();
      break;
    case "o":
      loadFile(str => console.log(str), "application/json");
      break;
    case "s":
      saveFile("test.json", JSON.stringify({}));
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