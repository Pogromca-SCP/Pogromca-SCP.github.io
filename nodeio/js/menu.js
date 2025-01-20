// @ts-check

const menu = /** @type {HTMLUListElement} */ (document.getElementById("context-menu"));

/**
 * @typedef {object} MenuElement
 * @property {string} name
 * @property {(e: MouseEvent) => void} handler
 * @property {() => boolean} [condition]
 * 
 * @typedef {MenuElement[]} MenuSection
 */

/**
 * @param {number} x 
 * @param {number} y 
 * @param  {readonly Readonly<MenuSection>[]} items
 */
export const showContextMenu = (x, y, items) => {
  if (items.length < 1) {
    return;
  }

  menu.innerHTML = "";
  const length = items.length;
  let i = 0;

  while (i < length) {
    const section = items[i];

    for (const element of section.filter(s => s.condition === undefined || s.condition())) {
      const li = document.createElement("li");
      li.innerText = element.name;
      li.onclick = element.handler;
      menu.appendChild(li);
    }

    ++i;

    if (i < length) {
      menu.appendChild(document.createElement("li"));
    }
  }

  const style = menu.style;
  style.left = `${x}px`;
  style.top = `${y}px`;
  menu.hidden = false;
};

export const closeContextMenu = () => {
  menu.innerHTML = "";
  menu.hidden = true;
};