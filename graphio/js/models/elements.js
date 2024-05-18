// @ts-check
import { showProperties } from "../properties.js";
import { showContextMenu } from "../menu.js";
import { NameProperty } from "../properties.js";
import { makeProperty, loadProperty, saveProperty } from "./props.js";

/**
 * @typedef {import("./props").PropertyValue} PropertyValue
 * @typedef {import("../explorer").LanguageDefinition} LanguageDefinition
 * @typedef {import("../explorer").ElementDefinition} ElementDefinition
 * @typedef {import("../properties").Property} Property
 * @typedef {import("../menu").MenuElement} MenuElement
 * 
 * @typedef {Object} LangElement
 * @property {string} element
 * @property {Record<string, LangElement>} [children]
 * @property {Record<string, PropertyValue>} properties
 * 
 * @typedef {Object} RuntimeLangElement
 * @property {ElementDefinition} element
 * @property {NameProperty} name
 * @property {Record<string, Property>} properties
 * @property {MenuElement[][]} menu
 * @property {RuntimeLangElement} [parent]
 * @property {Record<string, RuntimeLangElement>} [children]
 * @property {HTMLLIElement} [root]
 * @property {HTMLElement | Text} [display]
 * @property {HTMLOListElement} [list]
 */

const nameKey = "Name";

/**
 * @param {RuntimeLangElement} element
 * @param {HTMLOListElement} list
 */
const showElement = (element, list) => {
  if (element.root !== undefined) {
    return;
  }

  element.root = document.createElement("li");

  if (element.children === undefined) {
    element.root.className = "explorer-item";
    element.display = element.root;
  } else {
    const details = document.createElement("details");
    element.display = document.createElement("summary");
    details.appendChild(element.display);
    element.list = document.createElement("ol");

    for (const ch in element.children) {
      showElement(element.children[ch], element.list);
    }

    details.appendChild(element.list);
    element.root.appendChild(details);
  }

  const iconSize = 17;
  const img = document.createElement("img");
  img.width = iconSize;
  img.height = iconSize;
  img.alt = `${element.element.id} icon`;
  img.src = `./assets/icons/${element.element.icon}.png`;
  element.display.appendChild(img);
  const name = element.name;
  const text = document.createTextNode(name.getValue());
  element.display.appendChild(text);
  element.display.onclick = e => showProperties(element.element.id, element.properties);
  element.display = text;
  name.namespace = element.parent?.children ?? null;

  name.addChangeListener((old, nw) => {
    const parent = element.parent?.children;

    if (parent === undefined) {
      return;
    };

    const tmp = parent[old];
    delete parent[old];
    parent[nw] = tmp;

    if (element.display !== undefined) {
      element.display.nodeValue = nw;
    }
  });

  element.root.oncontextmenu = e => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, element.menu);
  };

  list.appendChild(element.root);
};

/** @param {RuntimeLangElement} el */
const clearElementDisplay = el => {
  if (el.children !== undefined) {
    for (const key in el.children) {
      clearElementDisplay(el.children[key]);
    }
  }

  el.name.namespace = null;
  el.name.clearChangeListeners();
  el.root = undefined;
  el.display = undefined;
  el.list = undefined;
};

/** @param {RuntimeLangElement} el */
const hideElement = el => {
  if (el.root === undefined) {
    return;
  }

  const list = el.parent?.list;

  if (list === undefined) {
    return;
  }
  
  list.removeChild(el.root);
  clearElementDisplay(el);
};

/**
 * @param {RuntimeLangElement} element
 * @param {LanguageDefinition} lang
 */
export const loadContextMenu = (element, lang) => {
  const menu = [];
  const additions = [];

  for (const name of element.element.allowedChildren) {
    const el = lang.elements[name];

    if (el.addable) {
      additions.push({
        name: `Add ${name.toLowerCase()}`,
        handler: () => addChild(element, makeElement(el, lang))
      });
    }
  }

  menu.push(additions);

  if (element.element.addable) {
    menu.push([{
      name: "Delete",
      handler: () => {
        if (element.parent !== undefined) {
          removeChild(element.parent, element);
        }
      }
    }]);
  }

  element.menu = menu;
};

/**
 * @param {ElementDefinition} def
 * @param {LanguageDefinition} lang
 * @throws {Error}
 */
export const makeElement = (def, lang) => {
  const result = {
    element: def,
    name: new NameProperty(def.id),
    properties: {},
    menu: []
  };

  result.properties[nameKey] = result.name;
  loadContextMenu(result, lang);

  for (const key in def.properties) {
    result.properties[key] = makeProperty(def.properties[key]);
  }

  return result;
};

/**
 * @param {RuntimeLangElement} parent
 * @param {RuntimeLangElement} element
 */
export const addChild = (parent, element) => {
  const name = element.name.getValue();

  if (element.parent !== undefined || parent.children?.[name] !== undefined || !parent.element.allowedChildren.includes(element.element.id)) {
    return false;
  }

  parent.children ??= {};
  parent.children[name] = element;
  element.parent = parent;
  
  if (parent.list !== undefined) {
    showElement(element, parent.list);
  }

  return true;
};

/**
 * @param {RuntimeLangElement} parent
 * @param {RuntimeLangElement} element
 */
export const removeChild = (parent, element) => {
  const name = element.name.getValue();

  if (parent.children === undefined || parent.children[name] !== element) {
    return false;
  }

  hideElement(element);
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
  const name = element.name.getValue();

  if (element.parent !== from || from.children === undefined || from.children[name] !== element || to.children?.[name] !== undefined ||
      !to.element.allowedChildren.includes(element.element.id)) {
    return false;
  }

  hideElement(element);
  to.children ??= {};
  to.children[name] = element;
  delete from.children[name];
  element.parent = to;

  if (to.list !== undefined) {
    showElement(element, to.list);
  }

  return true;
};


/** @param {RuntimeLangElement} element */
export const clearChildren = element => {
  if (element.children === undefined) {
    return;
  }

  for (const name in element.children) {
    const el = element.children[name];
    hideElement(el);
    el.parent = undefined;
  }

  element.children = undefined;
};

/**
 * @param {LangElement} element
 * @param {LanguageDefinition} lang
 * @param {RuntimeLangElement} parent
 * @param {string} [name]
 * @throws {Error}
 */
export const loadElement = (element, lang, parent, name) => {
  const def = lang.elements[element.element];

  if (def === undefined) {
    throw new Error(`Cannot load element: Missing definition for '${element.element}'.`);
  }

  const result = {
    element: def,
    name: new NameProperty(name ?? def.id),
    properties: {},
    menu: []
  };

  result.properties[nameKey] = result.name;
  loadContextMenu(result, lang);

  if (!addChild(parent, result)) {
    throw new Error(`Cannot load element (${result.Name.getValue()}): Failed attach to parent.`);
  }

  if (element.children !== undefined) {
    for (const childName in element.children) {
      loadElement(element.children[childName], lang, result, childName);
    }
  }

  for (const key in def.properties) {
    const propDef = def.properties[key];
    const value = element.properties[key];

    if (value === undefined) {
      throw new Error(`Cannot load element (${result.Name.getValue()}): Missing '${key}' property value.`);
    }

    result.properties[key] = loadProperty(propDef, value);
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
    if (key !== nameKey) {
      result.properties[key] = saveProperty(element.properties[key]);
    }
  }

  return result;
};