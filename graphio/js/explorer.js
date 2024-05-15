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
 * @property {Record<string, ElementDefinition>} elements
 * @property {Record<string, LangElement>} initial
 * 
 * @typedef {Object} Project
 * @property {string} language
 * @property {Record<string, LangElement>} elements
 */

const explorer = /** @type {HTMLDivElement} */ (document.getElementById("explorer"));
/** @type {Record<string, ElementDefinition>} */
let language = {};
/** @type {Record<string, RuntimeLangElement>} */
let elements = {};
let usedLanguage = "";

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

  const img = document.createElement("img");
  img.width = 17;
  img.height = 17;
  img.alt = `${el.element.id} icon`;
  img.src = `./assets/icons/${el.element.icon}.png`;
  el.display.appendChild(img);
  const name = el.Name;

  name.addChangeListener(n => {
    if (el.display === undefined) {
      return;
    }

    el.display.innerHTML = "";
    el.display.appendChild(img);
    el.display.appendChild(document.createTextNode(n));
  });

  el.display.appendChild(document.createTextNode(name.getValue()));
  el.display.onclick = e => showProperties(el.element.id, el);
  list.appendChild(el.root);
};

/**
 * @param {string} lang
 * @param {LanguageDefinition} def
 * @throws {Error}
 */
const initialize = (lang, def) => {
  usedLanguage = lang;
  language = def.elements;
  elements = loadElements(def.initial, language);
  const list = document.createElement("ol");

  for (const name in elements) {
    addElement(elements[name], list);
  }

  explorer.appendChild(list);
};

const clearProject = () => {
  language = {};
  elements = {};
  usedLanguage = "";
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
    initialize(lang, langDef);
  } catch (err) {
    console.error(err);
    button.hidden = false;
    loader.hidden = true;
  }
};

/** @param {string} str */
const loadProject = async str => {
  try {
    const project = /** @type {Project} */ (JSON.parse(str));
    const langDef = await loadLangDef(project.language);
    clearProject();
    initialize(project.language, langDef);
  } catch (err) {
    console.error(err);
  }
};

export const newProject = () => {
  if (usedLanguage !== "" && !confirm("Did you save your project?")) {
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

  for (const lang of ["JavaScript", "Test", "Wrong"]) {
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
  language: usedLanguage,
  elements: saveElements(elements)
}));