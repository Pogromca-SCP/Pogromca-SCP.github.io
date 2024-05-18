// @ts-check
import { loadContextMenu, clearChildren, loadElement, saveElement } from "./models/elements.js";
import { showContextMenu } from "./menu.js";
import { NameProperty, clearProperties } from "./properties.js";
import { clearActionHistory } from "./history.js";
import { loadFile, saveFile } from "./files.js";

/**
 * @typedef {import("./models/props").PropertyDefinition} PropertyDefinition
 * @typedef {import("./models/elements").LangElement} LangElement
 * @typedef {import("./models/elements").RuntimeLangElement} RuntimeLangElement
 * @typedef {import("./properties").TextProperty} TextProperty
 * @typedef {import("./menu").MenuElement} MenuElement
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
const languages = ["JavaScript"];

const project = {
  /** @type {null | LanguageDefinition} */
  language: null,
  /** @type {RuntimeLangElement} */
  root: {
    element: {
      id: "Root",
      icon: "script",
      editable: false,
      addable: false,
      allowedChildren: [],
      properties: {}
    },
    name: new NameProperty("Root"),
    properties: {},
    menu: []
  }
};

/** @param {LanguageDefinition} def */
const initialize = def => {
  project.language = def;
  project.root.list = document.createElement("ol");
  project.root.element.allowedChildren = project.language.allowedRootChildren;
  explorer.appendChild(project.root.list);
  loadContextMenu(project.root, project.language);

  explorer.oncontextmenu = e => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, project.root.menu);
  };
};

const clearProject = () => {
  project.language = null;
  project.root.element.allowedChildren = [];
  clearChildren(project.root);
  project.root.menu = [];
  explorer.innerHTML = "";
  explorer.oncontextmenu = null;
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

    if (project.language === null) {
      throw new Error("Initialization failed.");
    }

    for (const name in projData.elements) {
      loadElement(projData.elements[name], project.language, project.root, name);
    }
  } catch (err) {
    console.error(err);
  }
};

const saveProjectElements = () => {
  const result = {};

  if (project.root.children !== undefined) {
    for (const name in project.root.children) {
      result[name] = saveElement(project.root.children[name]);
    }
  }

  return result;
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
  elements: saveProjectElements()
}));