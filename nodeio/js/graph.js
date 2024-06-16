// @ts-check
import { DATA_FORMAT, getItems } from "./explorer.js";
import { makeProperty } from "./models/props.js";
import { showProperties } from "./properties.js";
import { NameProperty } from "./properties/text.js";

/**
 * @typedef {import("./explorer.js").ElementDefinition} ElementDefinition
 * @typedef {import("./properties.js").Property} Property
 * @typedef {import("./menu.js").MenuElement} MenuElement
 */

const graph = /** @type {HTMLDivElement} */ (document.getElementById("graph"));

export class Node {
  /**
   * @type {ElementDefinition}
   * @readonly
   */
  #element;
  /** @type {number} */
  #x;
  /** @type {number} */
  #y;
  /** @type {Record<string, Property>} */
  #props;
  /** @type {MenuElement[][]} */
  #menu;

  /**
   * @param {ElementDefinition} def
   * @param {number} x
   * @param {number} y
   */
  constructor(def, x, y) {
    this.#element = def;
    this.#x = x;
    this.#y = y;

    this.#props = {
      Name: new NameProperty(def.name)
    };

    for (const prop in def.properties) {
      this.#props[prop] = makeProperty(def.properties[prop]);
    }

    this.#menu = [];
  }

  draw() {
    const root = document.createElement("div");
    root.innerText = this.#element.name;

    root.onclick = e => {
      e.stopPropagation();
      showProperties(this.#element.name, this.#props, true);
    };

    graph.appendChild(root);
  }
}

/** @param {DragEvent} e */
export const addNode = e => {
  e.preventDefault();
  const data = e.dataTransfer?.getData(DATA_FORMAT);

  if (data === undefined) {
    return;
  }

  const node = new Node(/** @type {ElementDefinition} */ JSON.parse(data), e.movementX, e.movementY);
  node.draw();
};

export const newProject = () => {
  graph.innerHTML = "";
};

export const openProject = () => {
};

export const saveProject = () => {
};