// @ts-check
import { DRAG_DROP_DATA_FORMAT } from "./renderer/graph.js";
import { addNodeType } from "./renderer/nodes.js";

const search = /** @type {HTMLInputElement} */ (document.getElementById("search"));
const library = /** @type {HTMLOListElement} */ (document.getElementById("library"));

/**
 * @typedef {object} NodeDef
 * @property {string} id
 * @property {HTMLLIElement} display
 * @property {any[]} def
 */

/** @type {Map<string, NodeDef>} */
const nodes = new Map();

search.addEventListener("change", e => {
  for (const el of nodes.values()) {
    el.display.hidden = search.value !== "" && !el.id.includes(search.value);
  }
});

/**
 * @param {string} id
 * @param {any[]} node
 * @returns 
 */
export const addNode = (id, node) => {
  if (id === "" || nodes.has(id)) {
    return;
  }

  const element = document.createElement("li");

  const tmp = {
    id: id,
    display: element,
    def: node,
  };

  element.draggable = true;
  element.ondragstart = e => e.dataTransfer?.setData(DRAG_DROP_DATA_FORMAT, tmp.id);
  element.innerText = tmp.id;
  element.hidden = search.value !== "" && !tmp.id.includes(search.value);
  library.appendChild(element);
  nodes.set(tmp.id, tmp);
  addNodeType(id, tmp.def);
};

export const initialize = () => {
  addNode("Socket", [
    { type: "select", name: "", def: "output", options: ["input", "output"] },
    { type: "", name: "Channel" },
    { type: "number", name: "Slot", connective: false, def: 1, min: 1, max: 100, step: 1 },
    { type: "text", name: "Name", connective: true, def: "", min: 0, max: 50, valid: "" },
    { type: "text", name: "Default", connective: true, def: "", min: 0, max: 50, valid: "" },
    { type: "named", name: "Data" },
  ]);

  addNode("Type", [
    { type: "named", name: "Channel" },
    { type: "select", name: "", def: "not default", options: ["default", "not default"] },
    { type: "select", name: "", def: "connective", options: ["connective", "not connective"] },
    { type: "", name: "Data" },
  ]);

  addNode("Option", [
    { type: "named", name: "When" },
    { type: "text", name: "", connective: false, def: "", min: 0, max: 50, valid: "" },
    { type: "", name: "Then" },
  ]);

  addNode("Condition", [
    { type: "select", name: "Input", def: "number", options: ["number", "text", "bool", "type"] },
    { type: "select", name: "Operation", def: "equals", options: ["equals", "not equals", "less than", "greater than"] },
    { type: "number", name: "", connective: true, def: 0, min: -100, max: 100, step: 1 },
    { type: "number", name: "", connective: true, def: 0, min: -100, max: 100, step: 1 },
    { type: "", name: "True" },
    { type: "", name: "False" },
  ]);

  addNode("Settings", [
    { type: "", name: "Output" },
    { type: "text", name: "Name", connective: true, def: "", min: 0, max: 50, valid: "" },
    { type: "text", name: "Color", connective: true, def: "", min: 6, max: 6, valid: "0123456789abcdef" },
  ]);
};