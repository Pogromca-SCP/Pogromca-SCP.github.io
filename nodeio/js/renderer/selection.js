// @ts-check

/**
 * @typedef {import("./graph.js").EditorNode} EditorNode
 */

/** @type {Set<EditorNode>} */
const selection = new Set();
/** @type {[number, number, number, number]} */
const coords = [0, 0, 0, 0];

/** @param {MouseEvent} e */
const continueDrag = e => {
  e.preventDefault();
  coords[0] = coords[2] - e.clientX;
  coords[1] = coords[3] - e.clientY;
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  const x = coords[0];
  const y = coords[1];

  for (const node of selection) {
    node.transientMove(x, y);
  }
};

/** @param {MouseEvent} e */
const endDrag = e => {
  document.onmousemove = null;
  document.onmouseup = null;
  
  for (const node of selection) {
    node.finishMove(coords[0], coords[1]);
    return;
  }
};

/** @param {MouseEvent} e */
export const startDrag = e => {
  coords[2] = e.clientX;
  coords[3] = e.clientY;
  document.onmousemove = continueDrag;
  document.onmouseup = endDrag;
};

/** @param {EditorNode} node */
export const select = node => {
  selection.add(node);
};

/** @param {EditorNode} node */
export const diselect = node => selection.delete(node);

/** @param {EditorNode} node */
export const isSelected = node => selection.has(node);

export const clearSelection = () => selection.clear();

export const getSelection = () => Array.from(selection);