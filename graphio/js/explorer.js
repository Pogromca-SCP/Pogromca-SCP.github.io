// @ts-check
import { clearProperties } from "./properties.js";
import { clearActionHistory } from "./history.js";

const explorer = /** @type {HTMLDivElement} */ (document.getElementById("explorer"));
let isProjectActive = false;

/**
 * @param {string} lang
 * @param {HTMLButtonElement} button
 * @param {HTMLDivElement} loader
 */
const loadLang = async (lang, button, loader) => {
  button.hidden = true;
  loader.hidden = false;

  try {
    const res = await fetch(`../assets/langs/${lang}.json`);
    const body = await res.text();
    console.log(body);
    explorer.innerHTML = "";
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