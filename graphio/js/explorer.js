// @ts-check
import { loadElements, saveElements } from "./models/elements.js";
import { showProperties, clearProperties } from "./properties.js";
import { clearActionHistory } from "./history.js";
import { loadFile, saveFile } from "./files.js";

/**
 * @typedef {import("./models/props").PropertyDefinition} PropertyDefinition
 * @typedef {import("./models/elements").LangElement} LangElement
 * @typedef {import("./models/elements").RuntimeLangElement} RuntimeLangElement
 * @typedef {import("./properties").TextProperty} TextProperty
 * 
 * @typedef {"class" | "func" | "module" | "script" | "var"} ElementType
 * @typedef {"javascript"} LanguageID
 * 
 * @typedef {Object} ElementDefinition
 * @property {string} id
 * @property {ElementType} icon
 * @property {boolean} editable
 * @property {boolean} addable
 * @property {string[]} allowedChildren
 * @property {Record<string, PropertyDefinition>} properties
 * 
 * @typedef {Object} LanguageDefinition
 * @property {LanguageID} id
 * @property {Record<string, ElementDefinition>} elements
 * @property {string[]} allowedRootChildren
 * 
 * @typedef {Object} Project
 * @property {string} language
 * @property {Record<string, LangElement>} elements
 */

const explorer = /** @type {HTMLDivElement} */ (document.getElementById("explorer"));
const languages = ["JavaScript", "Test"];

const project = {
  /** @type {null | LanguageDefinition} */
  language: null,
  /** @type {Record<string, RuntimeLangElement>} */
  elements: {},
  /** @type {null | HTMLOListElement} */
  root: null
};

/**
 * @param {RuntimeLangElement} el
 * @param {HTMLOListElement} list
 */
const addElement = (el, list) => {
  el.root = document.createElement("li");

  if (el.children === undefined) {
    el.root.className = "explorer-item";
    el.display = el.root;
  } else {
    const details = document.createElement("details");
    el.display = document.createElement("summary");
    details.appendChild(el.display);
    el.list = document.createElement("ol");

    for (const ch in el.children) {
      addElement(el.children[ch], el.list);
    }

    details.appendChild(el.list);
    el.root.appendChild(details);
  }

  const iconSize = 17;
  const img = document.createElement("img");
  img.width = iconSize;
  img.height = iconSize;
  img.alt = `${el.element.id} icon`;
  img.src = `./assets/icons/${el.element.icon}.png`;
  el.display.appendChild(img);
  const name = el.Name;
  const text = document.createTextNode(name.getValue());
  el.display.appendChild(text);
  el.display.onclick = e => showProperties(el.element.id, el);
  el.display = text;

  name.validator = (old, nw) => {
    const parent = el.parent?.children ?? project.elements;

    if (parent[nw] !== undefined) {
      return false;
    }

    const tmp = parent[old];
    delete parent[old];
    parent[nw] = tmp;

    if (el.display !== undefined) {
      el.display.nodeValue = nw;
    }

    return true;
  };

  list.appendChild(el.root);
};

/** @param {RuntimeLangElement} el */
const clearElement = el => {
  if (el.children !== undefined) {
    for (const key in el.children) {
      clearElement(el.children[key]);
    }
  }

  el.root = undefined;
  el.display = undefined;
  el.list = undefined;
};

/** @param {RuntimeLangElement} el */
const removeElement = el => {
  if (el.root === undefined) {
    return;
  }

  const list = el.parent?.list ?? project.root;

  if (list === null) {
    return;
  }
  
  list.removeChild(el.root);
  clearElement(el);
};

/** @param {LanguageDefinition} def */
const initialize = def => {
  project.language = def;
  project.root = document.createElement("ol");
  explorer.appendChild(project.root);
};

const clearProject = () => {
  project.language = null;
  project.elements = {};
  project.root = null;
  explorer.innerHTML = "";
  clearProperties();
  clearActionHistory();
};

/**
 * @param {string} lang
 * @throws {Error}
 */
const loadLangDef = async lang => {
  const res = await fetch(`./assets/langs/${lang}.json`);

  if (res.status !== 200) {
    throw new Error(res.url);
  }

  return /** @type {LanguageDefinition} */ (await res.json());
};

/**
 * @param {string} lang
 * @param {HTMLButtonElement} button
 * @param {HTMLDivElement} loader
 */
const loadLang = async (lang, button, loader) => {
  button.hidden = true;
  loader.hidden = false;

  try {
    const langDef = await loadLangDef(lang);
    explorer.innerHTML = "";
    initialize(langDef);
  } catch (err) {
    console.error(err);
    button.hidden = false;
    loader.hidden = true;
  }
};

/** @param {string} str */
const loadProject = async str => {
  try {
    const projData = /** @type {Project} */ (JSON.parse(str));
    const langDef = await loadLangDef(projData.language);
    clearProject();
    initialize(langDef);
    project.elements = loadElements(projData.elements, project.language?.elements ?? {});
  } catch (err) {
    console.error(err);
  }
};

export const newProject = () => {
  if (project.language !== null && !confirm("Did you save your project?")) {
    return;
  }

  clearProject();
  const id = "lang-select";
  const element = document.createElement("div");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.innerText = "Select project language:";
  element.appendChild(label);
  const select = document.createElement("select");
  select.id = id;

  for (const lang of languages) {
    const option = document.createElement("option");
    option.value = lang.toLowerCase();
    option.selected = select.children.length === 0;
    option.innerText = lang;
    select.appendChild(option);
  }

  element.appendChild(select);
  const button = document.createElement("button");
  button.innerText = "Start project";
  button.onclick = e => loadLang(select.value, button, loader);
  element.appendChild(button);
  const loader = document.createElement("div");
  loader.hidden = true;
  element.appendChild(loader);
  explorer.appendChild(element);
};

export const openProject = () => loadFile(loadProject, "application/json");

export const saveProject = () => saveFile("MyProject.json", JSON.stringify({
  language: project.language?.id ?? "",
  elements: saveElements(project.elements)
}));