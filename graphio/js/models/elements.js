// @ts-check
import { showProperties } from "../properties.js";
import { showContextMenu } from "../menu.js";
import { NameProperty } from "../properties.js";
import { makeProperty, loadProperty, saveProperty } from "./props.js";
import { doAction } from "../history.js";

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

/** @param {RuntimeLangElement} element */
const isEditable = element => {
  let result = element.element.editable;

  while (result && element.parent !== undefined) {
    element = element.parent;
    result = element.element.editable;
  }

  return result;
};

/**
 * @param {RuntimeLangElement} element
 * @param {HTMLElement} display
 */
const makeDisplay = (element, display) => {
  const iconSize = 17;
  const img = document.createElement("img");
  img.width = iconSize;
  img.height = iconSize;
  img.alt = `${element.element.id} icon`;
  img.src = `./assets/icons/${element.element.icon}.png`;
  display.appendChild(img);
  const text = document.createTextNode(element.name.getValue());
  display.appendChild(text);
  display.onclick = e => showProperties(element.element.id, element.properties, !isEditable(element));
  element.display = text;
};

/** @param {RuntimeLangElement} element */
const addList = element => {
  if (element.root === undefined) {
    return;
  }

  element.root.innerHTML = "";
  element.root.className = "";
  element.root.onclick = null;
  const details = document.createElement("details");
  element.display = document.createElement("summary");
  details.appendChild(element.display);
  element.list = document.createElement("ol");
  details.appendChild(element.list);
  element.root.appendChild(details);
  makeDisplay(element, element.display);
};

/** @param {RuntimeLangElement} element */
const removeList = element => {
  if (element.root === undefined) {
    return;
  }

  element.root.innerHTML = "";
  element.root.className = "explorer-item";
  element.list = undefined;
  makeDisplay(element, element.root);
};

/**
 * @param {RuntimeLangElement} element
 * @param {RuntimeLangElement} parent
 */
const showElement = (element, parent) => {
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
      showElement(element.children[ch], element);
    }

    details.appendChild(element.list);
    element.root.appendChild(details);
  }

  makeDisplay(element, element.display);
  const name = element.name;
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
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, element.menu);
  };

  if (parent.list === undefined) {
    addList(parent);
  }

  parent.list?.appendChild(element.root);
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

  if (el.parent !== undefined && list.children.length < 1) {
    removeList(el.parent);
  }

  clearElementDisplay(el);
};

class AddRemoveChildAction {
  /** @type {RuntimeLangElement} */
  #parent;
  /** @type {RuntimeLangElement} */
  #child;
  /** @type {boolean} */
  #isRemove;

  /**
   * @param {RuntimeLangElement} parent
   * @param {RuntimeLangElement} child
   * @param {boolean} isRemove
   */
  constructor(parent, child, isRemove) {
    this.#parent = parent;
    this.#child = child;
    this.#isRemove = isRemove;
  }

  do() {
    if (this.#isRemove) {
      this.#remove();
    } else {
      this.#add();
    }
  }

  undo() {
    if (this.#isRemove) {
      this.#add();
    } else {
      this.#remove();
    }
  }

  #add() {
    this.#parent.children ??= {};
    this.#parent.children[this.#child.name.getValue()] = this.#child;
    this.#child.parent = this.#parent;
    showElement(this.#child, this.#parent);
  }

  #remove() {
    hideElement(this.#child);

    if (this.#parent.children !== undefined) {
      delete this.#parent.children[this.#child.name.getValue()];
    }

    this.#child.parent = undefined;

    if (this.#parent.list === undefined) {
      this.#parent.children = undefined;
    }
  }
}

class MoveChildAction {
  /** @type {RuntimeLangElement} */
  #from;
  /** @type {RuntimeLangElement} */
  #to;
  /** @type {RuntimeLangElement} */
  #element;

  /**
   * @param {RuntimeLangElement} from
   * @param {RuntimeLangElement} to
   * @param {RuntimeLangElement} element
   */
  constructor(from, to, element) {
    this.#from = from;
    this.#to = to;
    this.#element = element;
  }

  do() {
    this.#move(this.#from, this.#to);
  }

  undo() {
    this.#move(this.#to, this.#from);
  }

  /**
   * @param {RuntimeLangElement} from
   * @param {RuntimeLangElement} to
   */
  #move(from, to) {
    hideElement(this.#element);
    const name = this.#element.name.getValue();
    to.children ??= {};
    to.children[name] = this.#element;

    if (from.children !== undefined) {
      delete from.children[name];
    }

    this.#element.parent = to;
    showElement(this.#element, to);

    if (from.list === undefined) {
      from.children = undefined;
    }
  }
}

/**
 * @param {AddRemoveChildAction | MoveChildAction} ac
 * @param {boolean} transient
 */
const action = (ac, transient) => {
  if (transient) {
    ac.do();
  } else {
    doAction(ac);
  }
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
      name: "Duplicate",
      handler: () => {
        if (element.parent !== undefined) {
          addChild(element.parent, copyElement(element, lang));
        }
      },
      condition: () => isEditable(element)
    }, {
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
  const input = prompt("Name new element:", def.id);

  const result = {
    element: def,
    name: new NameProperty(input ?? def.id),
    properties: {},
    menu: []
  };

  result.properties[nameKey] = result.name;
  loadContextMenu(result, lang);
  
  if (result.name.getValue() === "") {
    result.name.transientUpdate(def.id);
  }

  for (const key in def.properties) {
    result.properties[key] = makeProperty(def.properties[key]);
  }

  return result;
};

/**
 * @param {RuntimeLangElement} parent
 * @param {RuntimeLangElement} element
 * @param {boolean} transient
 */
export const addChild = (parent, element, transient = false) => {
  const name = element.name.getValue();

  if (element.parent !== undefined || parent.children?.[name] !== undefined || !parent.element.allowedChildren.includes(element.element.id)) {
    return false;
  }

  action(new AddRemoveChildAction(parent, element, false), transient);
  return true;
};

/**
 * @param {RuntimeLangElement} parent
 * @param {RuntimeLangElement} element
 * @param {boolean} transient
 */
export const removeChild = (parent, element, transient = false) => {
  const name = element.name.getValue();

  if (parent.children === undefined || parent.children[name] !== element) {
    return false;
  }

  action(new AddRemoveChildAction(parent, element, true), transient);
  return true;
};

/**
 * @param {RuntimeLangElement} from
 * @param {RuntimeLangElement} to
 * @param {RuntimeLangElement} element
 * @param {boolean} transient
 */
export const moveChild = (from, to, element, transient = false) => {
  const name = element.name.getValue();

  if (element.parent !== from || from.children === undefined || from.children[name] !== element || to.children?.[name] !== undefined ||
      !to.element.allowedChildren.includes(element.element.id)) {
    return false;
  }

  action(new MoveChildAction(from, to, element), transient);
  return true;
};


/** @param {RuntimeLangElement} element */
export const clearChildren = element => {
  if (element.children === undefined) {
    return;
  }

  removeList(element);

  for (const name in element.children) {
    element.children[name].parent = undefined;
  }

  element.children = undefined;
};

/**
 * @param {RuntimeLangElement} element
 * @param {LanguageDefinition} lang
 */
export const copyElement = (element, lang) => {
  const input = prompt("Name duplicate element:", element.element.id);

  const result = {
    element: element.element,
    name: new NameProperty(input ?? element.element.id),
    properties: {},
    menu: []
  };

  result.properties[nameKey] = result.name;
  loadContextMenu(result, lang);

  if (result.name.getValue() === "") {
    result.name.transientUpdate(element.element.id);
  }

  if (element.children !== undefined) {
    result.children = {};

    for (const childName in element.children) {
      result.children[childName] = copyElement(element.children[childName], lang);
    }
  }

  for (const key in element.properties) {
    if (key !== nameKey) {
      result.properties[key] = element.properties[key].copy();
    }
  }

  return result;
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

  if (result.name.getValue() === "") {
    result.name.transientUpdate(def.id);
  }

  if (!addChild(parent, result, true)) {
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

  for (const key in element.properties) {
    if (key !== nameKey) {
      result.properties[key] = saveProperty(element.properties[key]);
    }
  }

  return result;
};