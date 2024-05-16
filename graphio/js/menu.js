// @ts-check
const menu = /** @type {HTMLUListElement} */ (document.getElementById("context-menu"));

/**
 * @param {number} x 
 * @param {number} y 
 * @param  {HTMLLIElement[]} items
 */
export const showContextMenu = (x, y, items) => {
  menu.innerHTML = "";

  for (const item of items) {
    menu.appendChild(item);
  }

  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.hidden = false;
};

export const closeContextMenu = () => {
  menu.innerHTML = "";
  menu.hidden = true;
};