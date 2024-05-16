// @ts-check
import { NameProperty } from "../properties.js";
import { loadProperty, saveProperty } from "./props.js";

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
 * @property {NameProperty} Name
 * @property {RuntimeLangElement} [parent]
 * @property {Record<string, RuntimeLangElement>} [children]
 * @property {HTMLLIElement} [root]
 * @property {HTMLElement | Text} [display]
 * @property {HTMLOListElement} [list]
 */

const reserved = ["element", "Name", "parent", "children", "root", "display", "list"];

/**
 * @param {Record<string, LangElement>} elements
 * @param {Record<string, ElementDefinition>} definitions
 * @param {RuntimeLangElement} [parent]
 * @throws {Error}
 */
export const loadElements = (elements, definitions, parent) => {
  /** @type {Record<string, RuntimeLangElement>} */
  const result = {};

  for (const name in elements) {
    const element = elements[name];
    const def = definitions[element.element];

    if (def === undefined) {
      throw new Error(`Cannot load element: Missing definition for '${element.element}'.`);
    }
    
    const res = { element: def, Name: new NameProperty(name) };

    if (parent !== undefined) {
      res.parent = parent;
    }

    if (element.children !== undefined) {
      res.children = loadElements(element.children, definitions, res);
    }

    for (const key in def.properties) {
      const propDef = def.properties[key];
      const value = element.properties[key];

      if (value === undefined) {
        throw new Error(`Cannot load element: Missing '${key}' property value.`);
      }

      res[key] = loadProperty(propDef, value);
    }

    result[name] = res;
  }

  return result;
};

/** @param {Record<string, RuntimeLangElement>} elements */
export const saveElements = elements => {
  /** @type {Record<string, LangElement>} */
  const result = {};

  for (const name in elements) {
    const element = elements[name];
    const res = { element: element.element.id, properties: {} };

    if (element.children !== undefined) {
      res.children = saveElements(element.children);
    }

    for (const key in element) {
      if (!reserved.includes(key)) {
        res.properties[key] = saveProperty(element[key]);
      }
    }

    result[name] = res;
  }

  return result;
};