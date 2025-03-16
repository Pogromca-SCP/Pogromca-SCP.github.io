// @ts-check
import { ConditionNode, OptionNode, SettingsNode, SocketNode, TypeNode } from "./compiler/built-in.js";
import { CompiledNode, CustomNode, RootNode } from "./compiler/nodes.js";
import { showContextMenu } from "./menu.js";
import { DRAG_DROP_DATA_FORMAT, ROOT } from "./renderer/graph.js";

const search = /** @type {HTMLInputElement} */ (document.getElementById("search"));
const library = /** @type {HTMLOListElement} */ (document.getElementById("library"));

search.addEventListener("change", e => {
  const filter = search.value;
  const children = /** @type {Iterable<HTMLElement>} */ (library.children);

  if (filter === "") {
    for (const child of children) {
      child.hidden = false;
    }
  } else {
    for (const child of children) {
      child.hidden = !child.innerText.includes(filter);
    }
  }
});

const createNode = () => {
  const node = new CustomNode();
  node.changeId(prompt("Input new node name:"));
  
  if (node.id !== null) {
    node.openInEditor();
    node.spawnInitialNodes();
  }
};

library.addEventListener("contextmenu", e => {
  e.preventDefault();
  e.stopPropagation();

  showContextMenu(e.clientX, e.clientY, [
    [
      { name: "New node", handler: createNode },
    ],
  ]);
});

/**
 * @param {HTMLLIElement} element
 * @param {boolean} show
 */
const updateLibraryElement = (element, show) => {
  if (!show) {
    library.removeChild(element);
    return;
  }

  if (element.draggable) {
    const id = element.innerText;
    element.ondragstart = e => e.dataTransfer?.setData(DRAG_DROP_DATA_FORMAT, id);
  }

  const filter = search.value;
  element.hidden = filter !== "" && !element.innerText.includes(filter);
  library.appendChild(element);
};

export const initialize = () => {
  CompiledNode.rendererCallback = updateLibraryElement;
  /** @type {CompiledNode} */
  let node = new RootNode();
  node.transientChangeId(ROOT);
  node.openInEditor();
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
};