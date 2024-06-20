// @ts-check
import { DATA_FORMAT, getItems } from "./explorer.js";
import { loadFile, saveFile } from "./files.js";
import { clearActionHistory, doAction } from "./history.js";
import { closeContextMenu } from "./menu.js";
import { makeProperty, saveProperty } from "./models/props.js";
import { NO_FLAGS, READONLY, TRANSIENT, clearProperties, showProperties } from "./properties.js";
import TextProperty from "./properties/text.js";

/**
 * @typedef {import("./models/props.js").PropertyValue} PropertyValue
 * @typedef {import("./explorer.js").ElementDefinition} ElementDefinition
 * @typedef {import("./properties.js").Property} Property
 * @typedef {import("./menu.js").MenuSection} MenuSection
 * 
 * @typedef {Object} NodeDefinition
 * @property {string} element
 * @property {number} x
 * @property {number} y
 * @property {Record<string, PropertyValue>} properties
 * @property {boolean} [readonly]
 * @property {boolean} [transient]
 * @property {boolean} [moveable]
 */

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));
/** @type {Node[]} */
let nodes = [];

const MOVEABLE = 4;

class AddOrRemoveNodeAction {
  /**
   * @type {Node}
   * @readonly
   */
  #node;
  /**
   * @type {boolean}
   * @readonly
   */
  #isAdd;

  /**
   * @param {Node} node
   * @param {boolean} isAdd
   */
  constructor(node, isAdd) {
    this.#node = node;
    this.#isAdd = isAdd;
  }

  do() {
    if (this.#isAdd) {
      this.#node.draw();
    } else {
      this.#node.remove();
    }
  }

  undo() {
    if (this.#isAdd) {
      this.#node.remove();
    } else {
      this.#node.draw();
    }
  }
}

class MoveNodeAction {
  /**
   * @type {Node}
   * @readonly
   */
  #node;
  /**
   * @type {number}
   * @readonly
   */
  #offsetX;
  /**
   * @type {number}
   * @readonly
   */
  #offsetY;

  /**
   * @param {Node} node
   * @param {number} x
   * @param {number} y
   */
  constructor(node, x, y) {
    this.#node = node;
    this.#offsetX = x;
    this.#offsetY = y;
  }

  do() {
    this.#node.move(this.#offsetX, this.#offsetY);
  }

  undo() {
    this.#node.move(-this.#offsetX, -this.#offsetY);
  }
}

class Node {
  /**
   * @type {number}
   * @readonly
   */
  #meta;
  /**
   * @type {Readonly<ElementDefinition>}
   * @readonly
   */
  #element;
  /** @type {number} */
  #x;
  /** @type {number} */
  #y;
  /** @type {Record<string, Property>} */
  #props;
  /** @type {MenuSection} */
  #menu;
  /** @type {HTMLDivElement | null} */
  #root;

  /**
   * @param {Readonly<ElementDefinition>} def
   * @param {number} x
   * @param {number} y
   * @param {number} metaflags
   */
  constructor(def, x, y, metaflags = MOVEABLE) {
    this.#meta = metaflags;
    this.#element = def;
    this.#x = x;
    this.#y = y;

    this.#props = {
      Name: new TextProperty(def.name, 50)
    };

    for (const prop in def.properties) {
      this.#props[prop] = makeProperty(def.properties[prop]);
    }

    this.#menu = [];
    this.#root = null;
  }

  /** @param {NodeDefinition} def */
  static load(def) {
    const items = getItems();

    if (!items) {
      return null;
    }

    let flags = NO_FLAGS;

    if (def.readonly) {
      flags |= READONLY;
    }

    if (def.transient) {
      flags |= TRANSIENT;
    }

    if (def.moveable) {
      flags |= MOVEABLE;
    }

    const node = new Node(items.elements[def.element], def.x, def.y, flags);
    return node;
  }

  getMetaflags() {
    return this.#meta;
  }

  isTransient() {
    return (this.#meta & TRANSIENT) !== NO_FLAGS;
  }

  isReadonly() {
    return (this.#meta & READONLY) !== NO_FLAGS;
  }

  isMoveable() {
    return (this.#meta & MOVEABLE) !== NO_FLAGS;
  }

  getElementDef() {
    return this.#element;
  }

  getX() {
    return this.#x;
  }

  getY() {
    return this.#y;
  }

  getProps() {
    return this.#props;
  }

  updateDisplay() {
    if (this.#root === null) {
      return;
    }

    this.#root.style.top = `${this.#x}px`;
    this.#root.style.left = `${this.#y}px`;
  }

  remove(transient = true) {
    if (this.#root === null) {
      return;
    }

    if (!transient) {
      doAction(new AddOrRemoveNodeAction(this, false));
      return;
    }

    this.#root.onclick = null;
    graph.removeChild(this.#root);
    this.#root = null;
    nodes = nodes.filter(n => n !== this);
  }

  draw(transient = true) {
    const root = document.createElement("div");
    root.innerText = this.#element.name;

    root.onclick = e => {
      e.stopPropagation();
      showProperties(this.#element.name, this.#props);
    };

    this.#root = root;
    graph.appendChild(root);
    nodes.push(this);
    this.updateDisplay();
  }

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   */
  move(offsetX, offsetY, transient = true) {
    this.#x += offsetX;
    this.#y += offsetY;
    this.updateDisplay();
  }
}

graph.addEventListener("click", e => clearProperties());
graph.addEventListener("dragover", e => e.preventDefault());

graph.addEventListener("drop", e => {
  e.preventDefault();
  const data = e.dataTransfer?.getData(DATA_FORMAT);

  if (data === undefined) {
    return;
  }

  const node = new Node(getItems().elements[data], e.clientX, e.clientY);
  doAction(new AddOrRemoveNodeAction(node, true));
});

export const newProject = () => {
  if (confirm("Are you sure?")) {
    graph.innerHTML = "";
    nodes = [];
    clearActionHistory();
    closeContextMenu();
  }
};

export const openProject = () => loadFile(str => {
  const def = /** @type {NodeDefinition[]} */ (JSON.parse(str));
  graph.innerHTML = "";
  nodes = [];
  
  for (const el of def) {
    const node = new Node(getItems().elements[el.element], el.x, el.y);
    node.draw();
  }

  clearActionHistory();
  closeContextMenu();
}, "application/json");

export const saveProject = () => saveFile("MyProject.json", JSON.stringify(nodes.map(n => ({
  element: n.getElementDef(),
  x: n.getX(),
  y: n.getY(),
  properties: {}
}))));