// @ts-check

/** @param {HTMLElement[]} items */
export const show = (...items) => {
  for (const item of items) {
    item.className = "";
  }
};

/** @param {HTMLElement[]} items */
export const hide = (...items) => {
  for (const item of items) {
    item.className = "hidden";
  }
};

/**
 * @param {number} min
 * @param {number} max
 */
export const randRange = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

/** @param {string[]} arr */
export const shuffle = (arr) => {
  const result = [...arr];

  for (let i = result.length - 1; i > 0; --i) {
      const key = Math.floor(Math.random() * (i + 1));
      const tmp = result[i];
      result[i] = result[key];
      result[key] = tmp;
  }

  return result;
};