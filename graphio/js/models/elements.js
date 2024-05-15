// @ts-check
import { loadProperty, saveProperty } from "./props.js";
import { TextProperty } from "../properties.js";

/**
 * @typedef {import("./props").PropertyValue} PropertyValue
 * @typedef {import("../explorer").ElementDefinition} ElementDefinition
 * 
 * @typedef {Object} LangElement
 * @property {string} element
 * @property {Record<string, LangElement>} [children]
 * @property {Record<string, PropertyValue>} properties
 * 
 * @typedef {Object} RuntimeLangElement
 * @property {ElementDefinition} element
 * @property {TextProperty} Name
 * @property {Record<string, RuntimeLangElement>} [children]
 * @property {HTMLLIElement} [root]
 * @property {HTMLElement} [display]
 * @property {HTMLOListElement} [list]
 */

const reserved = ["element", "children", "root", "display", "list"];

/**
 * @param {Record<string, LangElement>} el
 * @param {Record<string, ElementDefinition>} defs
 * @throws {Error}
 */
export const loadElements = (el, defs) => {
  /** @type {Record<string, RuntimeLangElement>} */
  const result = {};

  for (const name in el) {
    const tmp = el[name];
    const def = defs[tmp.element];

    if (def === undefined) {
      throw new Error(`Cannot load element: Missing definition for '${tmp.element}'.`);
    }
    
    const res = { element: def };

    if (tmp.children !== undefined) {
      res.children = loadElements(tmp.children, defs);
    }

    for (const key in tmp.properties ?? {}) {
      if (reserved.includes(key)) {
        throw new Error(`Cannot load property: Invalid property name '${key}' uses reserved word.`);
      }

      const propDef = def.properties[key];

      if (propDef === undefined) {
        throw new Error(`Cannot load property: Missing definition for '${key}'.`);
      }

      res[key] = loadProperty(propDef, tmp.properties[key]);
    }

    // @ts-ignore
    result[name] = res;
  }

  if (!(result.Name instanceof TextProperty)) {
    throw new Error(`Cannot load element: Missing name property.`);
  }

  return result;
};

/** @param {Record<string, RuntimeLangElement>} el */
export const saveElements = el => {
  /** @type {Record<string, LangElement>} */
  const result = {};

  for (const name in el) {
    const tmp = el[name];
    const res = { element: tmp.element.id, properties: {} };

    if (tmp.children !== undefined) {
      res.children = saveElements(tmp.children);
    }

    for (const key in tmp) {
      if (!reserved.includes(key)) {
        res.properties[key] = saveProperty(tmp[key]);
      }
    }

    result[name] = res;
  }

  return result;
};