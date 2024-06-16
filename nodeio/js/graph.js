// @ts-check
import { getItems } from "./explorer.js";
import { makeProperty } from "./models/props.js";
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
}

export const newProject = () => {
};

export const openProject = () => {
};

export const saveProject = () => {
};