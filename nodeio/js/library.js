// @ts-check
import { ConditionNode, OptionNode, SettingsNode, SocketNode, TypeNode } from "./compiler/built-in.js";
import { CompiledNode, RootNode } from "./compiler/nodes.js";
import { DRAG_DROP_DATA_FORMAT } from "./renderer/graph.js";

const search = /** @type {HTMLInputElement} */ (document.getElementById("search"));
const library = /** @type {HTMLOListElement} */ (document.getElementById("library"));

/** @type {HTMLLIElement[]} */
let elements = [];

search.addEventListener("change", e => {
  const filter = search.value;

  if (filter === "") {
    for (const el of elements) {
      el.hidden = false;
    }
  } else {
    for (const el of elements) {
      el.hidden = !el.innerText.includes(filter);
    }
  }
});

/**
 * @param {CompiledNode} node
 * @param {boolean} hide
 */
const createLibraryElement = (node, hide) => {
  const id = node.id;

  if (id === null) {
    return;
  }

  const element = document.createElement("li");

  if (!(node instanceof RootNode)) {
    element.draggable = true;
    element.ondragstart = e => e.dataTransfer?.setData(DRAG_DROP_DATA_FORMAT, id);
  }

  element.innerText = id;
  element.hidden = hide;
  library.appendChild(element);
  elements.push(element);
};

const renderLibrary = () => {
  library.innerHTML = "";
  elements = [];
  const filter = search.value;

  if (filter === "") {
    for (const node of CompiledNode.allNodes) {
      createLibraryElement(node, false);
    }
  } else {
    for (const node of CompiledNode.allNodes) {
      createLibraryElement(node, !node.id?.includes(filter));
    }
  }
};

export const initialize = () => {
  /** @type {CompiledNode} */
  let node = new RootNode();
  node.transientChangeId("Root");
  node = new SocketNode();
  node.transientChangeId("Socket");
  node = new TypeNode();
  node.transientChangeId("Type");
  node = new OptionNode();
  node.transientChangeId("Option");
  node = new ConditionNode();
  node.transientChangeId("Condition");
  node = new SettingsNode();
  node.transientChangeId("Settings");
  renderLibrary();
  CompiledNode.rendererCallback = renderLibrary;
};