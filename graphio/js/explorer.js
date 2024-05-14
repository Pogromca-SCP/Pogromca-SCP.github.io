// @ts-check
import { showProperties, clearProperties } from "./properties.js";
import { clearActionHistory } from "./history.js";

const explorer = /** @type {HTMLDivElement} */ (document.getElementById("explorer"));
let isProjectActive = false;

/**
 * @typedef {"class" | "func" | "module" | "script" | "var"} ElementType
 * 
 * @typedef {Object} PropertyDefinition
 * @property {boolean} [readonly]
 * 
 * @typedef {Object} BooleanValue
 * @property {boolean} value
 * 
 * @typedef {Object} NumberValue
 * @property {number} value
 * @property {number} [min]
 * @property {number} [max]
 * @property {boolean} [integer]
 * @property {boolean} [unsigned]
 * @property {boolean} [allowNaN]
 * 
 * @typedef {Object} TextValue
 * @property {string} value
 * @property {number} [maxLength]
 * 
 * @typedef {PropertyDefinition & (BooleanValue | NumberValue | TextValue)} PropertyWithValue
 * 
 * @typedef {Object} LanguageElement
 * @property {string} name
 * @property {ElementType} icon
 * @property {boolean} editable
 * @property {boolean} removable
 * @property {boolean} addable
 * @property {boolean} graphable
 * @property {string[]} allowedChildren
 * @property {Record<string, PropertyWithValue>} properties
 * 
 * @typedef {Object} Element
 * @property {string} element
 * @property {PropertyDefinition & TextValue} name
 * @property {Element[]} [children]
 * 
 * @typedef {Object} LanguageDefinition
 * @property {LanguageElement[]} elements
 * @property {Element[]} initial
 */

/**
 * @param {string} lang
 * @param {HTMLButtonElement} button
 * @param {HTMLDivElement} loader
 */
const loadLang = async (lang, button, loader) => {
  button.hidden = true;
  loader.hidden = false;

  try {
    const res = await fetch(`./assets/langs/${lang}.json`);

    if (res.status !== 200) {
      throw new Error(res.url);
    }

    const body = /** @type {LanguageDefinition} */ (await res.json());
    explorer.innerHTML = "";
    isProjectActive = true;

    for (const el of body.initial) {
      const ol = document.createElement("ol");
      const li = document.createElement("li");
      const img = document.createElement("img");
      img.src = `./assets/icons/${body.elements[0].icon}.png`;
      img.alt = `${el.element} icon`;
      img.width = 17;
      img.height = 17;
      li.appendChild(img);
      li.innerText += el.name.value;
      ol.appendChild(li);
      explorer.appendChild(ol);
    }
  } catch (err) {
    console.error(err);
    button.hidden = false;
    loader.hidden = true;
  }
};

export const newProject = () => {
  if (isProjectActive && !confirm("Did you save your project?")) {
    return;
  }

  isProjectActive = false;
  explorer.innerHTML = "";
  clearProperties();
  clearActionHistory();
  const id = "lang-select";
  const element = document.createElement("div");
  const label = document.createElement("label");
  label.htmlFor = id;
  label.innerText = "Select project language:";
  element.appendChild(label);
  const select = document.createElement("select");
  select.id = id;
  let option = document.createElement("option");
  option.value = "javascript";
  option.selected = true;
  option.innerText = "JavaScript";
  select.appendChild(option);
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

newProject();