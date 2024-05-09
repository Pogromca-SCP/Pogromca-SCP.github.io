// @ts-check

class Action {
  constructor() {
    if (this.constructor === Action) {
      throw new Error("Cannot instantiate abstract class Action.");
    }
  }

  do() {
    throw new Error("Method do() is not implemented.");
  }

  undo() {
    throw new Error("Method undo() is not implemented.");
  }
}

class SetText extends Action {
  /** @type {HTMLInputElement} */
  field;
  /** @type {string} */
  oldValue;
  /** @type {string} */
  newValue;

  /**
   * @param {HTMLInputElement} field
   * @param {string} oldValue
   * @param {string} newValue
   */
  constructor(field, oldValue, newValue) {
    super();
    this.field = field;
    this.oldValue = oldValue;
    this.newValue = newValue;
  }

  do() {
    this.field.value = this.newValue;
  }

  undo() {
    this.field.value = this.oldValue;
  }
}

const hist = {
  /** @type {Action[]} */
  done: [],
  /** @type {Action[]} */
  undone: []
};

const maxActionsHistory = 255;

const clearActionHistory = () => {
  hist.done = [];
  hist.undone = [];
};

/** @param {Action} ac */
const makeAction = (ac) => {
  if (hist.done.length >= maxActionsHistory) {
    hist.done.shift();
  }

  hist.done.push(ac);
  hist.undone = [];
};

const undoAction = () => {
  const ac = hist.done.pop();

  if (ac !== undefined) {
    ac.undo();
    hist.undone.push(ac);
  }
};

const redoAction = () => {
  const ac = hist.undone.pop();

  if (ac !== undefined) {
    ac.do();
    hist.done.push(ac);
  }
};