/** @type {HTMLTextAreaElement} */
const input = document.getElementById("input");

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");

/** @type {CanvasRenderingContext2D} */
const context = canvas.getContext("2d");

/** @type {HTMLDivElement} */
const output = document.getElementById("console");

/** @type {HTMLButtonElement} */
const runButton = document.getElementById("run");

/** @type {HTMLInputElement} */
const pixelsCount = document.getElementById("count");

/** @type {HTMLInputElement} */
const pixelsSize = document.getElementById("size");

const vm = {
    /** @type {(number | string)[]} */
    chunk: [],

    /** @type {(number | string | StdFuncBody)[]} */
    stack: [],
    started: new Date(),

    /** @type {Pixel[]} */
    pixels: [],
    pixelSize: 0
};

const inputVars = {
    x: 0,
    y: 0,
    index: 0,
    count: 0,
    fraction: 0,
    pi: Math.PI,
    tau: Math.PI * 2,
    time: () => new Date(Date.now()).getTime() / 1000,
    projectionTime: () => new Date(Date.now() - vm.started.getTime()).getTime() / 1000,
    projectionStartTime: () => vm.started.getTime() / 1000
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
    inputVars.count = pxCount;
    addInfo(`Running expression with ${pxCount} elements of size: ${pxSize}.`);
    window.requestAnimationFrame(execute);
    runButton.disabled = false;
};

const clearConsole = () => output.innerHTML = "";;

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

/**
 * @typedef {Object} Pixel
 * @property {number} x
 * @property {number} y
 * @property {number} h
 * @property {number} s
 * @property {number} v
 */

const execute = () => {
    if (inputVars.count < 1) {
        return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    const halfSize = vm.pixelSize / 2;
    const columns = Math.floor(Math.sqrt(inputVars.count));
    const rows = Math.ceil(inputVars.count / columns);
    const dx = canvas.width / columns;
    const dy = canvas.height / rows;

    for (let i = 0; i < inputVars.count; ++i) {
        inputVars.x = (i % columns + 0.5) * dx;
        inputVars.y = (Math.floor(i / columns) % rows + 0.5) * dy;
        inputVars.index = i;
        inputVars.fraction = i / inputVars.count;
        let pixel;

        if (i < vm.pixels.length) {
            pixel = vm.pixels[i];
        } else {
            pixel = {};
            vm.pixels.push(pixel);
        }

        if (!updatePixel(pixel)) {
            return;
        }

        context.fillStyle = `hsl(${pixel.h}, ${pixel.s}%, ${pixel.v}%)`;
        context.fillRect(Math.round(pixel.x - halfSize), Math.round(pixel.y - halfSize), vm.pixelSize, vm.pixelSize);
    }

    window.requestAnimationFrame(execute);
};

/** @param {Pixel} pixel */
const updatePixel = (pixel) => {
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
                let value = stdFunctions[op]?.func;

                if (value === undefined) {
                    value = inputVars[op];

                    if (typeof(value) === "function") {
                        value = value();
                    }
                }

                if (value === undefined) {
                    value = data[op];
                }

                vm.stack.push(value);
                break;
            }
            case opCodes.set: {
                op = vm.chunk[index++];
                data[op] = vm.stack.pop();
                break;
            }
            case opCodes.equal: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a === b ? 1 : 0);
                break;
            }
            case opCodes.greater: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a > b ? 1 : 0);
                break;
            }
            case opCodes.less: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a < b ? 1 : 0);
                break;
            }
            case opCodes.add: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a + b);
                break;
            }
            case opCodes.subtract: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a - b);
                break;
            }
            case opCodes.multiply: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a * b);
                break;
            }
            case opCodes.divide: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();

                if (b === 0) {
                    addError("Runtime error: Cannot divide by zero.");
                    return false;
                }

                vm.stack.push(a / b);
                break;
            }
            case opCodes.not: {
                const value = vm.stack.pop();
                vm.stack.push(value < 1 ? 0 : 1);
                break;
            }
            case opCodes.negate: {
                const value = vm.stack.pop();
                vm.stack.push(-value);
                break;
            }
            case opCodes.call: {
                op = vm.chunk[index++];

                if (!runFunctionCall(op)) {
                    return false;
                }

                break;
            }
            case opCodes.exp: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push(a ** b);
                break;
            }
            case opCodes.mod: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();

                if (b === 0) {
                    addError("Runtime error: Cannot divide by zero.");
                    return false;
                }

                vm.stack.push(a % b);
                break;
            }
            case opCodes.and: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
                vm.stack.push((a >= 1 && b >= 1) ? 1 : 0);
                break;
            }
            case opCodes.or: {
                const b = vm.stack.pop();
                const a = vm.stack.pop();
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
            const func = vm.stack.pop();
            vm.stack.push(func());
            break;
        }
        case 1: {
            const a = vm.stack.pop();
            const func = vm.stack.pop();
            vm.stack.push(func(a));
            break;
        }
        case 2: {
            const b = vm.stack.pop();
            const a = vm.stack.pop();
            const func = vm.stack.pop();
            vm.stack.push(func(a, b));
            break;
        }
        case 3: {
            const c = vm.stack.pop();
            const b = vm.stack.pop();
            const a = vm.stack.pop();
            const func = vm.stack.pop();
            vm.stack.push(func(a, b, c));
            break;
        }
        default:
            addError("Runtime error: Incorrect amount of parameters.");
            return false;
    }

    return true;
};
