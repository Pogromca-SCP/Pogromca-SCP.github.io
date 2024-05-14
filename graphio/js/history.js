// @ts-check

/**
 * @typedef {Object} Action
 * @property {() => void} do
 * @property {() => void} undo
 */

const hist = {
  /** @type {Action[]} */
  done: [],
  /** @type {Action[]} */
  undone: []
};

const actionsHistoryLimit = 100;

export const clearActionHistory = () => {
  hist.done = [];
  hist.undone = [];
};

/** @param {Action} ac */
export const doAction = (ac) => {
  ac.do();
  hist.done.push(ac);
  hist.undone = [];

  if (hist.done.length > actionsHistoryLimit) {
    hist.done.shift();
  }
};

export const undoAction = () => {
  const ac = hist.done.pop();

  if (ac !== undefined) {
    ac.undo();
    hist.undone.push(ac);
  }
};

export const redoAction = () => {
  const ac = hist.undone.pop();

  if (ac !== undefined) {
    ac.do();
    hist.done.push(ac);
  }
};