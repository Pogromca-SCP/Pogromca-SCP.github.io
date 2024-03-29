// @ts-check

const popupContainer = /** @type {HTMLDivElement} */ (document.getElementById("popup-container"));
const popupConver = /** @type {HTMLDivElement} */ (document.getElementById("popup-cover"));
const input = /** @type {HTMLTextAreaElement} */ (document.getElementById("input"));
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("canvas"));
const context = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));
const output = /** @type {HTMLDivElement} */ (document.getElementById("console"));
const runButton = /** @type {HTMLButtonElement} */ (document.getElementById("run"));
const pixelsCount = /** @type {HTMLInputElement} */ (document.getElementById("count"));
const pixelsSize = /** @type {HTMLInputElement} */ (document.getElementById("size"));
const hiddenClass = "hidden";

/**
 * @typedef {Object} Pixel
 * @property {number} x
 * @property {number} y
 * @property {number} h
 * @property {number} s
 * @property {number} v
 */

const vm = {
    /** @type {(number | string)[]} */
    chunk: [],

    /** @type {(number | string | StdFuncBody)[]} */
    stack: [],
    started: new Date(),

    /** @type {Pixel[]} */
    pixels: [],
    pixelSize: 0,
    halfSize: 0
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
    pi: Math.PI,
    tau: Math.PI * 2,
    time: () => new Date(Date.now()).getTime() / 1000,
    simulationTime: () => new Date(Date.now() - vm.started.getTime()).getTime() / 1000,
    simulationStartTime: () => vm.started.getTime() / 1000
};

const run = () => {
    runButton.disabled = true;
    inputVars.count = 0;
    const pxSize = parseInt(pixelsSize.value);
    const pxCount = parseInt(pixelsCount.value);
    const code = compile(input.value);

    if (code === null) {
        runButton.disabled = false;
        return;
    }

    addSuccess("Expression compiled successfully.");
    vm.chunk = code;
    vm.stack = [];
    vm.started = new Date(Date.now());
    vm.pixels = [];
    vm.pixelSize = pxSize;
    vm.halfSize = pxSize / 2;
    inputVars.x = [];
    inputVars.y = [];
    inputVars.index = [];
    inputVars.count = pxCount;
    inputVars.fraction = [];
    addInfo(`Running expression with ${pxCount} elements of size: ${pxSize}.`);
    preparePixels();
    runButton.disabled = false;
};

const clearConsole = () => output.innerHTML = "";

const showRef = () => {
    popupContainer.className = "";
    popupConver.className = "";
};

const hideRef = () => {
    popupContainer.className = hiddenClass;
    popupConver.className = hiddenClass;
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
const addInfo = (message) => addMessage(message, "info");

/** @param {string} message */
const addError = (message) => addMessage(message, "error");

/** @param {string} message */
const addSuccess = (message) => addMessage(message, "success");

const preparePixels = () => {
    if (inputVars.count < 1) {
        return;
    }

    const columns = Math.floor(Math.sqrt(inputVars.count));
    const rows = Math.ceil(inputVars.count / columns);
    const dx = canvas.width / columns;
    const dy = canvas.height / rows;

    for (let i = 0; i < inputVars.count; ++i) {
        inputVars.x.push((i % columns + 0.5) * dx);
        inputVars.y.push((Math.floor(i / columns) % rows + 0.5) * dy);
        inputVars.index.push(i);
        inputVars.fraction.push(i / inputVars.count);

        vm.pixels.push({
            x: 0,
            y: 0,
            h: 0,
            s: 0,
            v: 0
        });
    }

    window.requestAnimationFrame(execute);
};

const execute = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < inputVars.count; ++i) {
        const pixel = vm.pixels[i];

        if (!updatePixel(pixel, i)) {
            return;
        }

        context.fillStyle = `hsl(${pixel.h}, ${pixel.s}%, ${pixel.v}%)`;
        context.fillRect(Math.round(pixel.x - vm.halfSize), Math.round(pixel.y - vm.halfSize), vm.pixelSize, vm.pixelSize);
    }

    window.requestAnimationFrame(execute);
};

/**
 * @param {Pixel} pixel
 * @param {number} i
 */
const updatePixel = (pixel, i) => {
    /** @type {Record<string, number>} */
    const data = {};
    let index = 0;

    while (index < vm.chunk.length) {
        let op = vm.chunk[index++];

        switch (op) {
            case opCodes.constant:
                vm.stack.push(vm.chunk[index++]);
                break;
            case opCodes.pop:
                vm.stack.pop();
                break;
            case opCodes.get: {
                op = vm.chunk[index++];
                /** @type {StdFuncBody | number[] | number | undefined} */
                let value = stdFunctions[op]?.func;

                if (value === undefined) {
                    value = inputVars[op];

                    if (value === undefined) {
                        value = data[op];
                    } else if (typeof(value) === "function") {
                        value = /** @type {number} */ (value());
                    } else if (typeof(value) !== "number") {
                        value = value[i];
                    }
                }

                vm.stack.push(value);
                break;
            }
            case opCodes.set: {
                op = vm.chunk[index++];
                data[op] = /** @type {number} */ (vm.stack.pop());
                break;
            }
            case opCodes.equal: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a === b ? 1 : 0);
                break;
            }
            case opCodes.greater: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(a > b ? 1 : 0);
                break;
            }
            case opCodes.less: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(a < b ? 1 : 0);
                break;
            }
            case opCodes.add: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(a + b);
                break;
            }
            case opCodes.subtract: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(a - b);
                break;
            }
            case opCodes.multiply: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(a * b);
                break;
            }
            case opCodes.divide: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(b === 0 ? 0 : a / b);
                break;
            }
            case opCodes.not: {
                const value = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(value < 1 ? 0 : 1);
                break;
            }
            case opCodes.negate: {
                const value = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(-value);
                break;
            }
            case opCodes.call: {
                op = /** @type {number} */ (vm.chunk[index++]);

                if (!runFunctionCall(op)) {
                    return false;
                }

                break;
            }
            case opCodes.exp: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(a ** b);
                break;
            }
            case opCodes.mod: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push(b === 0 ? 0 : a % b);
                break;
            }
            case opCodes.and: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push((a >= 1 && b >= 1) ? 1 : 0);
                break;
            }
            case opCodes.or: {
                const b = /** @type {number} */ (vm.stack.pop());
                const a = /** @type {number} */ (vm.stack.pop());
                vm.stack.push((a >= 1 || b >= 1) ? 1 : 0);
                break;
            }
        }
    }

    pixel.x = data["x'"] ?? 0;
    pixel.y = data["y'"] ?? 0;
    pixel.h = (data.h ?? 0) % 360;
    pixel.s = clamp(data.s ?? 0.5);
    pixel.v = clamp(data.v ?? 0.5);
    return true;
};

/** @param {number} x */
const clamp = (x) => x < 0 ? 0 : (x > 1 ? 100 : x * 100);

/** @param {number} argNum */
const runFunctionCall = (argNum) => {
    switch (argNum) {
        case 0: {
            const func = /** @type {StdFuncBody} */ (vm.stack.pop());
            vm.stack.push(func());
            break;
        }
        case 1: {
            const a = /** @type {number} */ (vm.stack.pop());
            const func = /** @type {StdFuncBody} */ (vm.stack.pop());
            vm.stack.push(func(a));
            break;
        }
        case 2: {
            const b = /** @type {number} */ (vm.stack.pop());
            const a = /** @type {number} */ (vm.stack.pop());
            const func = /** @type {StdFuncBody} */ (vm.stack.pop());
            vm.stack.push(func(a, b));
            break;
        }
        case 3: {
            const c = /** @type {number} */ (vm.stack.pop());
            const b = /** @type {number} */ (vm.stack.pop());
            const a = /** @type {number} */ (vm.stack.pop());
            const func = /** @type {StdFuncBody} */ (vm.stack.pop());
            vm.stack.push(func(a, b, c));
            break;
        }
        default:
            addError("Runtime error: Incorrect amount of function arguments.");
            return false;
    }

    return true;
};