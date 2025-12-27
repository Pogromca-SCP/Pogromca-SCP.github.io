// @ts-check
import compile from "./compiler.js";
import debugDisplay from "./debug.js";
import { opCodes } from "./enums.js";
import stdFunctions from "./std-lib.js";

/** @typedef {import("./std-lib.js").StdFuncBody} StdFuncBody */

const popupContainer = /** @type {HTMLDivElement} */ (document.getElementById("popup-container"));
const popupCover = /** @type {HTMLDivElement} */ (document.getElementById("popup-cover"));
const lines = /** @type {HTMLDivElement} */ (document.getElementById("lines"));
const input = /** @type {Readonly<HTMLTextAreaElement>} */ (document.getElementById("input"));
const canvas = /** @type {Readonly<HTMLCanvasElement>} */ (document.getElementById("canvas"));
const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
const output = /** @type {HTMLDivElement} */ (document.getElementById("console"));
const runButton = /** @type {HTMLButtonElement} */ (document.getElementById("run"));
const pixelsCount = /** @type {Readonly<HTMLInputElement>} */ (document.getElementById("count"));
const pixelsSize = /** @type {Readonly<HTMLInputElement>} */ (document.getElementById("size"));

/**
 * @typedef {object} Pixel
 * @property {number} x
 * @property {number} y
 * @property {number} h
 * @property {number} s
 * @property {number} l
 * @property {number} a
 */

const vm = {
  /** @type {(number | string)[]} */
  chunk: [],

  /** @type {(number | string | Readonly<StdFuncBody>)[]} */
  stack: [],
  started: new Date(),

  /** @type {Pixel[]} */
  pixels: [],
  pixelSize: 0,
  halfSize: 0,

  /** @type {Record<string, number>} */
  variables: {},
};

const inputVars = {
  /** @type {number[]} */
  x: [],

  /** @type {number[]} */
  y: [],

  /** @type {number[]} */
  index: [],
  count: 0,

  /** @type {number[]} */
  fraction: [],
  size: 1,
  pi: Math.PI,
  tau: Math.PI * 2,
  time: () => new Date(Date.now()).getTime() / 1000,
  simulationTime: () => new Date(Date.now() - vm.started.getTime()).getTime() / 1000,
  simulationStartTime: 0,
  width: () => canvas.width,
  height: () => canvas.height,
};

const outputs = ["x'", "y'", "h", "s", "l", "a"];

const displayLineNumbers = () => {
  const len = input.value.split("\n").length;
  let value = "1";

  for (let i = 2; i <= len; ++i) {
    value += `<br/>${i}`;
  }

  lines.innerHTML = value;
};

const updateLinesScroll = () => lines.scrollTop = input.scrollTop;

const run = () => {
  runButton.disabled = true;
  inputVars.count = 0;
  const pxSize = parseInt(pixelsSize.value);
  const pxCount = parseInt(pixelsCount.value);

  if (Number.isNaN(pxSize) || Number.isNaN(pxCount)) {
    addError("Provided numeric parameters are invalid.");
    runButton.disabled = false;
    return;
  }

  if (pxSize < 1 || pxCount < 1 || pxSize > 20 || pxCount > 100) {
    addError("Provided numeric parameters are out of supported range ([1-100] [1-20]).");
    runButton.disabled = false;
    return;
  }

  const code = compile(input.value, inputVars, outputs, addError);

  if (code === null) {
    runButton.disabled = false;
    return;
  }

  addSuccess("Expression compiled successfully.");
  debugDisplay(code);
  vm.chunk = code;
  vm.stack = [];
  vm.started = new Date(Date.now());
  vm.pixels = [];
  vm.pixelSize = pxSize;
  vm.halfSize = pxSize / 2;
  vm.variables = {};
  inputVars.x = [];
  inputVars.y = [];
  inputVars.index = [];
  inputVars.count = pxCount;
  inputVars.fraction = [];
  inputVars.size = pxSize;
  inputVars.simulationStartTime = vm.started.getTime() / 1000;
  addInfo(`Running expression with ${pxCount} elements of size: ${pxSize}.`);
  preparePixels();
  runButton.disabled = false;
};

const clearConsole = () => output.innerHTML = "";

const showRef = () => {
  popupContainer.hidden = false;
  popupCover.hidden = false;
};

const hideRef = () => {
  popupContainer.hidden = true;
  popupCover.hidden = true;
};

/**
 * @param {string} message 
 * @param {"info" | "error" | "success"} className 
 */
const addMessage = (message, className) => {
  const element = document.createElement("div");
  element.className = className;
  element.innerText = message;
  output.appendChild(element);
};

/** @param {string} message */
const addInfo = message => addMessage(message, "info");

/** @param {string} message */
const addError = message => addMessage(message, "error");

/** @param {string} message */
const addSuccess = message => addMessage(message, "success");

const preparePixels = () => {
  const pxCount = inputVars.count;

  if (pxCount < 1) {
    return;
  }

  const floor = Math.floor;
  const columns = floor(Math.sqrt(pxCount));
  const rows = Math.ceil(pxCount / columns);
  const dx = canvas.width / columns;
  const dy = canvas.height / rows;
  const inputX = inputVars.x;
  const inputY = inputVars.y;
  const inputIndex = inputVars.index;
  const inputFrac = inputVars.fraction;
  const pixels = vm.pixels;

  for (let i = 0; i < pxCount; ++i) {
    inputX.push((i % columns + 0.5) * dx);
    inputY.push((floor(i / columns) % rows + 0.5) * dy);
    inputIndex.push(i);
    inputFrac.push(i / pxCount);

    pixels.push({
      x: 0,
      y: 0,
      h: 0,
      s: 0,
      l: 0,
      a: 0,
    });
  }

  window.requestAnimationFrame(execute);
};

const execute = () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  const pxCount = inputVars.count;
  const pixels = vm.pixels;
  const round = Math.round;
  const halfSize = vm.halfSize;
  const pxSize = vm.pixelSize;

  for (let i = 0; i < pxCount; ++i) {
    const pixel = pixels[i];

    if (!updatePixel(pixel, i)) {
      return;
    }

    context.fillStyle = `hsla(${pixel.h}, ${pixel.s}%, ${pixel.l}%, ${pixel.a})`;
    context.fillRect(round(pixel.x - halfSize), round(pixel.y - halfSize), pxSize, pxSize);
  }

  window.requestAnimationFrame(execute);
};

/**
 * @param {Pixel} pixel
 * @param {number} i
 */
const updatePixel = (pixel, i) => {
  const data = vm.variables;
  const chunk = vm.chunk;
  const chunkLength = chunk.length;
  const stack = vm.stack;
  let index = 0;

  while (index < chunkLength) {
    let op = chunk[index++];

    switch (op) {
      case opCodes.constant:
        stack.push(chunk[index++]);
        break;
      case opCodes.pop:
        stack.pop();
        break;
      case opCodes.get: {
        op = chunk[index++];
        const value = data[op];
        stack.push(value);
        break;
      }
      case opCodes.set: {
        op = chunk[index++];
        data[op] = /** @type {number} */ (stack.pop());
        break;
      }
      case opCodes.equal: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a === b ? 1 : 0);
        break;
      }
      case opCodes.greater: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a > b ? 1 : 0);
        break;
      }
      case opCodes.less: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a < b ? 1 : 0);
        break;
      }
      case opCodes.add: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a + b);
        break;
      }
      case opCodes.subtract: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a - b);
        break;
      }
      case opCodes.multiply: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a * b);
        break;
      }
      case opCodes.divide: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(b === 0 ? 0 : a / b);
        break;
      }
      case opCodes.not: {
        const value = /** @type {number} */ (stack.pop());
        stack.push(value === 0 ? 1 : 0);
        break;
      }
      case opCodes.negate: {
        const value = /** @type {number} */ (stack.pop());
        stack.push(-value);
        break;
      }
      case opCodes.call: {
        op = /** @type {number} */ (chunk[index++]);

        if (!runFunctionCall(op)) {
          return false;
        }

        break;
      }
      case opCodes.exp: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a ** b);
        break;
      }
      case opCodes.mod: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(b === 0 ? 0 : a % b);
        break;
      }
      case opCodes.and: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push((a === 0 || b === 0) ? 0 : 1);
        break;
      }
      case opCodes.or: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push((a === 0 && b === 0) ? 0 : 1);
        break;
      }
      case opCodes.getFunc: {
        op = chunk[index++];
        const func = stdFunctions[op].func;
        stack.push(func);
        break;
      }
      case opCodes.getInput: {
        op = chunk[index++];
        const value = /** @type {Record<string | number, number | readonly number[] | StdFuncBody>} */ (inputVars)[op];

        if (typeof(value) === "function") {
          stack.push(value());
        } else if (typeof(value) === "number") {
          stack.push(value);
        } else {
          stack.push(value[i]);
        }
        break;
      }
      default:
        addError("Runtime error: Unknown opcode.");
        return false;
    }
  }

  pixel.x = data["x'"] ?? 0;
  pixel.y = data["y'"] ?? 0;
  pixel.h = (data.h ?? 0) % 360;
  pixel.s = clamp(data.s ?? 1) * 100;
  pixel.l = clamp(data.l ?? 0.5) * 100;
  pixel.a = clamp(data.a ?? 1);
  return true;
};

/** @param {number} x */
const clamp = x => x < 0 ? 0 : (x > 1 ? 1 : x);

/** @param {number} argNum */
const runFunctionCall = argNum => {
  const stack = vm.stack;

  switch (argNum) {
    case 0: {
      const func = /** @type {StdFuncBody} */ (stack.pop());
      stack.push(func());
      break;
    }
    case 1: {
      const a = /** @type {number} */ (stack.pop());
      const func = /** @type {StdFuncBody} */ (stack.pop());
      stack.push(func(a));
      break;
    }
    case 2: {
      const b = /** @type {number} */ (stack.pop());
      const a = /** @type {number} */ (stack.pop());
      const func = /** @type {StdFuncBody} */ (stack.pop());
      stack.push(func(a, b));
      break;
    }
    case 3: {
      const c = /** @type {number} */ (stack.pop());
      const b = /** @type {number} */ (stack.pop());
      const a = /** @type {number} */ (stack.pop());
      const func = /** @type {StdFuncBody} */ (stack.pop());
      stack.push(func(a, b, c));
      break;
    }
    default:
      addError("Runtime error: Incorrect amount of function arguments.");
      return false;
  }

  return true;
};

globalThis.hideRef = hideRef;
globalThis.showRef = showRef;
globalThis.clearConsole = clearConsole;
globalThis.run = run;
globalThis.displayLineNumbers = displayLineNumbers;
globalThis.updateLinesScroll = updateLinesScroll;
displayLineNumbers();
updateLinesScroll();