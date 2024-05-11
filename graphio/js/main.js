// @ts-check
import { loadFile, saveFile } from "./files.js";
import { undoAction, redoAction } from "./history.js";
import { showProperties } from "./properties.js";
import settings from "./settings.js";

window["newGraph"] = () => {
};

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

window["clearProps"] = () => showProperties("", null);
window["openSettings"] = () => showProperties("Settings", settings);