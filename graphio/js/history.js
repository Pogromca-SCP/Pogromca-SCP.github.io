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

const maxActionsHistoryLength = 100;

export const clearActionHistory = () => {
  hist.done = [];
  hist.undone = [];
};

/** @param {Action} ac */
export const doAction = (ac) => {
  ac.do();
  
  if (hist.done.length >= maxActionsHistoryLength) {
    hist.done.shift();
  }

  hist.done.push(ac);
  hist.undone = [];
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