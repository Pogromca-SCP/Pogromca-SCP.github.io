// @ts-check
import { NameProperty } from "../properties.js";
import { makeProperty, loadProperty, saveProperty } from "./props.js";

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
 * @param {ElementDefinition} def
 * @throws {Error}
 */
export const makeElement = def => {
  const result = {
    element: def,
    Name: new NameProperty(def.id)
  };

  for (const key in def.properties) {
    result[key] = makeProperty(def.properties[key]);
  }

  return result;
};

/**
 * @param {RuntimeLangElement} parent
 * @param {RuntimeLangElement} element
 */
export const addChild = (parent, element) => {
  const name = element.Name.getValue();

  if (element.parent !== undefined || parent.children?.[name] !== undefined || !parent.element.allowedChildren.includes(element.element.id)) {
    return false;
  }

  parent.children ??= {};
  parent.children[name] = element;
  element.parent = parent;
  return true;
};

/**
 * @param {RuntimeLangElement} parent
 * @param {RuntimeLangElement} element
 */
export const removeChild = (parent, element) => {
  const name = element.Name.getValue();

  if (parent.children === undefined || parent.children[name] !== element) {
    return false;
  }

  delete parent.children[name];
  element.parent = undefined;
  return true;
};

/**
 * @param {RuntimeLangElement} from
 * @param {RuntimeLangElement} to
 * @param {RuntimeLangElement} element
 */
export const moveChild = (from, to, element) => {
  const name = element.Name.getValue();

  if (element.parent !== from || from.children === undefined || from.children[name] !== element || to.children?.[name] !== undefined ||
      !to.element.allowedChildren.includes(element.element.id)) {
    return false;
  }

  to.children ??= {};
  to.children[name] = element;
  delete from.children[name];
  element.parent = to;
  return true;
};


/** @param {RuntimeLangElement} element */
export const clearChildren = element => {
  if (element.children === undefined) {
    return;
  }

  for (const name in element.children) {
    element.children[name].parent = undefined;
  }

  element.children = undefined;
};

/**
 * @param {LangElement} element
 * @param {Record<string, ElementDefinition>} definitions
 * @param {RuntimeLangElement} [parent]
 * @param {string} [name]
 * @throws {Error}
 */
export const loadElement = (element, definitions, parent, name) => {
  const def = definitions[element.element];

  if (def === undefined) {
    throw new Error(`Cannot load element: Missing definition for '${element.element}'.`);
  }

  const result = {
    element: def,
    Name: new NameProperty(name ?? def.id)
  };

  if (parent !== undefined && !addChild(parent, result)) {
    throw new Error(`Cannot load element (${result.Name.getValue()}): Failed attach to parent.`);
  }

  if (element.children !== undefined) {
    for (const childName in element.children) {
      loadElement(element.children[childName], definitions, result, childName);
    }
  }

  for (const key in def.properties) {
    const propDef = def.properties[key];
    const value = element.properties[key];

    if (value === undefined) {
      throw new Error(`Cannot load element (${result.Name.getValue()}): Missing '${key}' property value.`);
    }

    result[key] = loadProperty(propDef, value);
  }

  return result;
};

/** @param {RuntimeLangElement} element */
export const saveElement = element => {
  const result = {
    element: element.element.id,
    properties: {}
  };

  if (element.children !== undefined) {
    result.children = {};

    for (const name in element.children) {
      result.children[name] = saveElement(element.children[name]);
    }
  }

  for (const key in element) {
    if (!reserved.includes(key)) {
      result.properties[key] = saveProperty(element[key]);
    }
  }

  return result;
};