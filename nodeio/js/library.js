// @ts-check

const search = /** @type {HTMLInputElement} */ (document.getElementById("search"));
const library = /** @type {HTMLOListElement} */ (document.getElementById("library"));

/**
 * @typedef {object} NodeDef
 * @property {string} id
 * @property {HTMLLIElement} display
 */

export const DRAG_DROP_DATA_FORMAT = "text/plain";

/** @type {Map<string, NodeDef>} */
const nodes = new Map();

search.addEventListener("change", e => {
  for (const el of nodes.values()) {
    el.display.hidden = search.value !== "" && !el.id.includes(search.value);
  }
});

search.onchange = e => {
  for (const el of nodes.values()) {
    el.display.hidden = !el.id.includes(e.target?.value);
  }
};

/** @param {NodeDef} node */
export const removeNodeType = node => {
  if (node.id === "" || !nodes.has(node.id)) {
    return;
  }

  nodes.delete(node.id);
  library.removeChild(node.display);
};

/** @param {string} node */
export const addNodeType = node => {
  if (node === "" || nodes.has(node)) {
    return;
  }

  const element = document.createElement("li");

  const tmp = {
    id: node,
    display: element,
  };

  element.draggable = true;
  element.ondragstart = e => e.dataTransfer?.setData(DRAG_DROP_DATA_FORMAT, tmp.id);
  element.ondblclick = e => removeNodeType(tmp);
  element.innerText = tmp.id;
  element.hidden = search.value !== "" && !tmp.id.includes(search.value);
  library.appendChild(element);
  nodes.set(tmp.id, tmp);
};

export const initialize = () => {
  addNodeType("Socket");
  addNodeType("Type");
  addNodeType("Option");
  addNodeType("Condition");
  addNodeType("Settings");
};