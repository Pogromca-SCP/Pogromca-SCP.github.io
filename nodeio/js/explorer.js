// @ts-check

/**
 * @typedef {import("./models/props").PropertyDefinition} PropertyDefinition
 * 
 * @typedef {Object} ElementDefinition
 * @property {string} name
 * @property {string} icon
 * @property {Record<string, PropertyDefinition>} properties
 * @property {string[]} categories
 * 
 * @typedef {Object} ItemsDefinitions
 * @property {Record<string, ElementDefinition>} elements
 * @property {Record<string, string[]>} categories 
 */

const explorer = /** @type {HTMLDivElement} */ (document.getElementById("explorer"));
const ICON_SIZE = 17;

export const DATA_FORMAT = "text/plain";

/** @type {ItemsDefinitions} */
let globalItems;

/** @param {Readonly<ElementDefinition>} element */
const makeElement = element => {
  const root = document.createElement("li");
  root.className = "explorer-item";
  root.draggable = true;
  root.ondragstart = e => e.dataTransfer?.setData(DATA_FORMAT, element.name);
  const img = document.createElement("img");
  img.width = ICON_SIZE;
  img.height = ICON_SIZE;
  img.alt = `${element.name} icon`;
  img.src = `./assets/icons/${element.icon}.png`;
  root.appendChild(img);
  root.appendChild(document.createTextNode(element.name));
  return root;
};

/**
 * @param {string} name
 * @param {readonly string[]} categories
 * @param {Readonly<ItemsDefinitions>} defs
 */
const makeCategory = (name, categories, defs) => {
  const root = document.createElement("li");
  const details = document.createElement("details");
  const display = document.createElement("summary");
  display.appendChild(document.createTextNode(name));
  details.appendChild(display);
  const list = document.createElement("ol");

  for (const category of categories) {
    list.appendChild(makeCategory(category, [], defs));
  }

  for (const element in defs.elements) {
    const tmp = defs.elements[element];

    if (tmp.categories.includes(name)) {
      list.appendChild(makeElement(tmp));
    }
  }

  details.appendChild(list);
  root.appendChild(details);
  return root;
};

/** @param {Readonly<ItemsDefinitions>} defs */
const initialize = defs => {
  const root = document.createElement("ol");

  for (const categories in defs.categories) {
    root.appendChild(makeCategory(categories, defs.categories[categories], defs));
  }

  explorer.appendChild(root);
};

/** @throws {Error} */
const loadItemsDefs = async () => {
  const res = await fetch("./assets/items.json");

  if (res.status !== 200) {
    throw new Error(res.url);
  }

  return /** @type {ItemsDefinitions} */ (await res.json());
};

export const loadItems = async () => {
  try {
    const items = await loadItemsDefs();
    globalItems = items;
    explorer.innerHTML = "";
    initialize(items);
  } catch (err) {
    console.error(err);
  }
};

export const getItems = () => globalItems;