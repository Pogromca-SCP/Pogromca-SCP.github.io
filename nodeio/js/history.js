// @ts-check

/**
 * @typedef {Object} Action
 * @property {() => void} do
 * @property {() => void} undo
 */

const hist = {
  /** @type {Readonly<Action>[]} */
  done: [],
  /** @type {Readonly<Action>[]} */
  undone: []
};

const ACTIONS_HISTORY_LIMIT = 100;

export const clearActionHistory = () => {
  hist.done = [];
  hist.undone = [];
};

/** @param {Readonly<Action>} ac */
export const doAction = (ac) => {
  ac.do();
  hist.done.push(ac);
  hist.undone = [];

  if (hist.done.length > ACTIONS_HISTORY_LIMIT) {
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