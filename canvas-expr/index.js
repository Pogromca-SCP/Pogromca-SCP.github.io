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

const compiler = {
    /** @type {Scanner | null} */
    scanner: null,

    /** @type {Token | null} */
    current: null,

    /** @type {Token | null} */
    previous: null,

    /** @type {(number | string)[]} */
    chunk: [],
    hadError: false,

    /** @type {string[]} */
    variables: [],

    /** @type {any[]} */
    callStack: [],
    advance() {
        this.previous = this.current;

        while (true) {
            do {
                this.current = this.scanner.scanToken();
            } while (this.current === null);

            if (this.current.type !== tokenTypes.error) {
                return;
            }
    
            this.errorAtCurrent(this.current.lexeme);
        }
    },

    /** @param {number} type */
    match(type) {
        if (!this.check(type)) {
            return false;
        }

        this.advance();
        return true;
    },

    /** @param {number} type */
    check(type) {
        return this.current.type === type;
    },

    /**
     * @param {number} type
     * @param {string} message
     */
    consume(type, message) {
        if (this.current.type === type) {
            this.advance();
            return;
        }

        this.errorAtCurrent(message);
    },

    /** @param {number} code */
    emitNum(code) {
        this.chunk.push(code);
    },

    /**
     * @param {number} code
     * @param {number | string} value
     */
    emitNums(code, value) {
        this.emitNum(code);
        this.emitNum(value);
    },

    /** @param {number} value */
    emitConstant(value) {
        this.emitNums(opCodes.constant, value);
    },

    /** @param {string} message */
    errorAtCurrent(message) {
        this.errorAt(this.current, message);
    },

    /** @param {string} message */
    error(message) {
        this.errorAt(this.previous, message);
    },

    /**
     * @param {Token} token
     * @param {string} message
     */
    errorAt(token, message) {
        let infix = "";

        if (token.type === tokenTypes.end) {
            infix = " at end";
        } else if (token.type !== tokenTypes.error) {
            infix = ` at '${token.lexeme}'`;
        }

        addError(`[line ${token.line}] Error${infix}: ${message}`);
        this.hadError = true;
    },

    /** @param {number} precedence */
    parsePrecedence(precedence) {
        this.advance();
        const prefixRule = parseRules[this.previous.type].prefix;

        if (prefixRule === null) {
            this.error("Expected expression.");
            return;
        }

        const canAssign = precedence <= precedenceLevels.assignment;
        prefixRule(canAssign);

        while (precedence <= parseRules[this.current.type].precedence) {
            const prev = this.previous;
            this.advance();
            const infixRule = parseRules[this.previous.type].infix;

            if (infixRule === call) {
                const func = stdFunctions[prev.lexeme];

                if (func === undefined) {
                    compiler.error(`Cannot call '${prev.lexeme}' because it's not a function.`);
                } else {
                    this.callStack.push(func);
                }
            }

            infixRule(canAssign);
        }

        if (canAssign && this.match(tokenTypes.equal)) {
            this.error("Invalid assignment target.");
        }
    }
};

/**
 * @typedef {Object} StdFunction
 * @property {number} arity
 * @property {(() => number) | ((x: number) => number) | ((x: number, y: number) => number) | ((x: number, y: number, z: number) => number)} func
 */

/**
 * @param {(() => number) | ((x: number) => number) | ((x: number, y: number) => number) | ((x: number, y: number, z: number) => number)} func
 * @param {number} arity
 * @returns {StdFunction}
 */
const makeStdFunction = (func, arity) => ({
    arity: arity,
    func: func
});

const stdFunctions = {
    rand: makeStdFunction(() => Math.random(), 0),
    
    /** @param {number} x */
    sin: makeStdFunction((x) => Math.sin(x), 1),

    /** @param {number} x */
    cos: makeStdFunction((x) => Math.cos(x), 1),

    /** @param {number} x */
    tan: makeStdFunction((x) => Math.tan(x), 1),

    /** @param {number} x */
    asin: makeStdFunction((x) => Math.asin(x), 1),

    /** @param {number} x */
    acos: makeStdFunction((x) => Math.acos(x), 1),

    /** @param {number} x */
    atan: makeStdFunction((x) => Math.atan(x), 1),

    /** @param {number} x */
    sqrt: makeStdFunction((x) => Math.sqrt(x), 1),

    /** @param {number} x */
    floor: makeStdFunction((x) => Math.floor(x), 1),

    /** @param {number} x */
    ceil: makeStdFunction((x) => Math.ceil(x), 1),

    /** @param {number} x */
    round: makeStdFunction((x) => Math.round(x), 1),

    /** @param {number} x */
    abs: makeStdFunction((x) => Math.abs(x), 1),

    /**
     * @param {number} x
     * @param {number} y
     */
    atan2: makeStdFunction((x, y) => Math.atan2(x, y), 2),

    /**
     * @param {number} x
     * @param {number} y
     */
    min: makeStdFunction((x, y) => Math.min(x, y), 2),

    /**
     * @param {number} x
     * @param {number} y
     */
    max: makeStdFunction((x, y) => Math.max(x, y), 2),

    /**
     * @param {number} cond
     * @param {number} a
     * @param {number} b
     */
    if: makeStdFunction((cond, a, b) => cond < 1 ? b : a, 3),

    /**
     * @param {number} frac
     * @param {number} a
     * @param {number} b
     */
    lerp: makeStdFunction((frac, a, b) => (a * frac + b * (1 - frac)), 3)
};

const vm = {
    /** @type {(number | string)[]} */
    chunk: [],

    /** @type {any[]} */
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

const tokenTypes = {
    // Operators
    equal: 0,
    plus: 1,
    minus: 2,
    star: 3,
    slash: 4,
    exp: 5,
    modulo: 6,
    less: 7,
    greater: 8,
    lessEqual: 9,
    greaterEqual: 10,
    equalEqual: 11,
    bangEqual: 12,
    and: 13,
    or: 14,
    bang: 15,
    leftParen: 16,
    rightParen: 17,
    semicolon: 18,
    comma: 19,

    // Literals
    number: 20,
    identifier: 21,

    // Technical
    error: 22,
    end: 23
};

/**
 * @typedef {Object} Token
 * @property {number} type
 * @property {string} lexeme
 * @property {number} line
 */

class Scanner {
    /** @param {string} source */
    constructor(source) {
        this.source = source;
        this.start = 0;
        this.current = 0;
        this.line = 1;
    }

    /** @param {string} ch */
    static isDigit(ch) {
        return ch.match("[0-9]") !== null;
    }

    /** @param {string} ch */
    static isAlpha(ch) {
        return ch.match("[a-zA-Z]") !== null || ch === "'" || ch === "_";
    }

    get isAtEnd() {
        return this.current >= this.source.length;
    }

    get peek() {
        return this.isAtEnd ? "\0" : this.source.charAt(this.current);
    }

    get peekNext() {
        return this.isAtEnd ? "\0" : this.source.charAt(this.current + 1);
    }

    get peekPrevious() {
        return this.source.charAt(this.current - 1);
    }

    advance() {
        var result = this.peek;
        ++this.current;
        return result;
    }

    /** @param {string} expected */
    match(expected) {
        if (this.isAtEnd || this.peek !== expected) {
            return false;
        }

        ++this.current;
        return true;
    }

    /**
     * @param {number} type
     * @returns {Token}
     */
    makeToken(type) {
        return {
            type: type,
            lexeme: this.source.substring(this.start, this.current),
            line: this.line
        };
    }

    /**
     * @param {string} message
     * @returns {Token}
     */
    errorToken(message) {
        return {
            type: tokenTypes.error,
            lexeme: message,
            line: this.line
        };
    }

    scanToken() {
        this.skipWhitespace();
        this.start = this.current;

        if (this.isAtEnd) {
            return this.makeToken(tokenTypes.end);
        }

        const ch = this.advance();

        if (Scanner.isAlpha(ch)) {
            return this.identifier();
        }

        if (Scanner.isDigit(ch)) {
            return this.number();
        }

        switch (ch) {
            case "(":
                return this.makeToken(tokenTypes.leftParen);
            case ")":
                return this.makeToken(tokenTypes.rightParen);
            case ";":
                return this.makeToken(tokenTypes.semicolon);
            case ",":
                return this.makeToken(tokenTypes.comma);
            case "=":
                return this.makeToken(this.match("=") ? tokenTypes.equalEqual : tokenTypes.equal);
            case "+":
                return this.makeToken(tokenTypes.plus);
            case "-":
                return this.makeToken(tokenTypes.minus);
            case "*":
                return this.makeToken(tokenTypes.star);
            case "/":
                return this.makeToken(tokenTypes.slash);
            case "^":
                return this.makeToken(tokenTypes.exp);
            case "%":
                return this.makeToken(tokenTypes.modulo);
            case "<":
                return this.makeToken(this.match("=") ? tokenTypes.lessEqual : tokenTypes.less);
            case ">":
                return this.makeToken(this.match("=") ? tokenTypes.greaterEqual : tokenTypes.greater);
            case "&":
                return this.makeToken(tokenTypes.and);
            case "|":
                return this.makeToken(tokenTypes.or);
            case "!":
                return this.makeToken(this.match("=") ? tokenTypes.bangEqual : tokenTypes.bang);
            case "#":
                while (this.peek !== "\n" && !this.isAtEnd) {
                    this.advance();
                }

                return null;
            case ".":
                if (Scanner.isDigit(this.peek)) {
                    return this.number();
                }
            default:
                return this.errorToken("Unexpected character.");
        }
    }

    skipWhitespace() {
        while (true) {
            switch (this.peek) {
                case "\n":
                    ++this.line;
                case " ":
                case "\r":
                case "\t":
                    this.advance();
                    break;
                default:
                    return;
            }
        }
    }

    number() {
        while (Scanner.isDigit(this.peek)) {
            this.advance();
        }

        if (this.peek === "." && Scanner.isDigit(this.peekNext)) {
            this.advance();
        }

        while (Scanner.isDigit(this.peek)) {
            this.advance();
        }

        return this.makeToken(tokenTypes.number);
    }

    identifier() {
        while (Scanner.isAlpha(this.peek) || Scanner.isDigit(this.peek)) {
            this.advance();
        }

        return this.makeToken(tokenTypes.identifier);
    }
}

const opCodes = {
    constant: 0,
    pop: 1,
    get: 2,
    set: 3,
    equal: 4,
    greater: 5,
    less: 6,
    add: 7,
    subtract: 8,
    multiply: 9,
    divide: 10,
    not: 11,
    negate: 12,
    call: 13,
    exp: 14,
    mod: 15,
    and: 16,
    or: 17
};

const precedenceLevels = {
    none: 0,
    assignment: 1,
    or: 2,
    and: 3,
    equality: 4,
    comparison: 5,
    term: 6,
    factor: 7,
    exp: 8,
    unary: 9,
    call: 10,
    primary: 11
};

/**
 * @callback ParseFn
 * @param {boolean} canAssign
 * @returns {void}
 */

/**
 * @typedef {Object} PrecedenceRule
 * @property {ParseFn | null} prefix
 * @property {ParseFn | null} infix
 * @property {number} precedence
 */

/** @param {string} src */
const compile = (src) => {
    compiler.scanner = new Scanner(src);
    compiler.advance();

    while (!compiler.match(tokenTypes.end)) {
        expression();
        compiler.consume(tokenTypes.semicolon, "Expected ';' after expression.");
        compiler.emitNum(opCodes.pop);
    }

    const result = compiler.hadError ? null : compiler.chunk;
    compiler.scanner = null;
    compiler.current = null;
    compiler.previous = null;
    compiler.chunk = [];
    compiler.hadError = false;
    compiler.variables = [];
    compiler.callStack = [];
    return result;
};

const expression = () => compiler.parsePrecedence(precedenceLevels.assignment);
const number = () => compiler.emitConstant(parseFloat(compiler.previous.lexeme));

const grouping = () => {
    expression();
    compiler.consume(tokenTypes.rightParen, "Expected ')' after expression.");
};

const unary = () => {
    const operator = compiler.previous.type;
    compiler.parsePrecedence(precedenceLevels.unary);

    switch (operator) {
        case tokenTypes.bang:
            compiler.emitNum(opCodes.not);
            break;
        case tokenTypes.minus:
            compiler.emitNum(opCodes.negate);
            break;
        default:
            compiler.error("Unknown unary operator.");
            break;
    }
};

const binary = () => {
    const operator = compiler.previous.type;
    compiler.parsePrecedence(parseRules[operator].precedence + 1);

    switch (operator) {
        case tokenTypes.bangEqual:
            compiler.emitNums(opCodes.equal, opCodes.not);
            break;
        case tokenTypes.equalEqual:
            compiler.emitNum(opCodes.equal);
            break;
        case tokenTypes.greater:
            compiler.emitNum(opCodes.greater);
            break;
        case tokenTypes.greaterEqual:
            compiler.emitNums(opCodes.less, opCodes.not);
            break;
        case tokenTypes.less:
            compiler.emitNum(opCodes.less);
            break;
        case tokenTypes.lessEqual:
            compiler.emitNums(opCodes.greater, opCodes.not);
            break;
        case tokenTypes.plus:
            compiler.emitNum(opCodes.add);
            break;
        case tokenTypes.minus:
            compiler.emitNum(opCodes.subtract);
            break;
        case tokenTypes.star:
            compiler.emitNum(opCodes.multiply);
            break;
        case tokenTypes.slash:
            compiler.emitNum(opCodes.divide);
            break;
        case tokenTypes.exp:
            compiler.emitNum(opCodes.exp);
            break;
        case tokenTypes.modulo:
            compiler.emitNum(opCodes.mod);
            break;
        case tokenTypes.and:
            compiler.emitNum(opCodes.and);
            break;
        case tokenTypes.or:
            compiler.emitNum(opCodes.or);
            break;
        default:
            compiler.error("Unknown binary operator.");
            break;
    }
};

/** @param {boolean} canAssign */
const variable = (canAssign) => namedVariable(compiler.previous, canAssign);

const call = () => compiler.emitNums(opCodes.call, argumentsList());

const argumentsList = () => {
    let count = 0;

    if (!compiler.check(tokenTypes.rightParen)) {
        do {
            expression();
            ++count;
        } while (compiler.match(tokenTypes.comma));
    }

    compiler.consume(tokenTypes.rightParen, "Expected ')' after arguments.");
    const expected = compiler.callStack.pop().arity;

    if (count !== expected) {
        compiler.error(`Function expected ${expected} arguments.`);
    }

    return count;
};

/**
 * @param {Token} name
 * @param {boolean} canAssign
 */
const namedVariable = (name, canAssign) => {
    if (canAssign && compiler.match(tokenTypes.equal)) {
        let define = true;

        if (stdFunctions[name.lexeme] !== undefined) {
            compiler.error(`Cannot assign value to '${name.lexeme}' because it's a function.`);
            define = false;
        }

        if (inputVars[name.lexeme] !== undefined) {
            compiler.error(`Cannot assign value to '${name.lexeme}' because it's readonly.`);
            define = false;
        }

        expression();
        compiler.emitNums(opCodes.set, name.lexeme);

        if (define && !compiler.variables.includes(name.lexeme)) {
            compiler.variables.push(name.lexeme);
        }
    } else {
        if (stdFunctions[name.lexeme] === undefined && inputVars[name.lexeme] === undefined && !compiler.variables.includes(name.lexeme)) {
            compiler.error(`Cannot read value of '${name.lexeme}' because it's undefined.`);
        }

        if (stdFunctions[name.lexeme] !== undefined && compiler.scanner.peekPrevious !== "(") {
            compiler.error(`Function '${name.lexeme}' can only be used for calling.`);
        }

        compiler.emitNums(opCodes.get, name.lexeme);
    }
};

/** @type {PrecedenceRule[]} */
const parseRules = [
    { prefix: null, infix: null, precedence: precedenceLevels.none }, // Equal
    { prefix: null, infix: binary, precedence: precedenceLevels.term }, // Plus
    { prefix: unary, infix: binary, precedence: precedenceLevels.term }, // Minus
    { prefix: null, infix: binary, precedence: precedenceLevels.factor  }, // Star
    { prefix: null, infix: binary, precedence: precedenceLevels.factor }, // Slash
    { prefix: null, infix: binary, precedence: precedenceLevels.exp }, // Exp
    { prefix: null, infix: binary, precedence: precedenceLevels.factor }, // Modulo
    { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // Less
    { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // Greater
    { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // LessEqual
    { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // GreaterEqual
    { prefix: null, infix: binary, precedence: precedenceLevels.equality }, // EqualEqual
    { prefix: null, infix: binary, precedence: precedenceLevels.equality  }, // BangEqual
    { prefix: null, infix: binary, precedence: precedenceLevels.and }, // And
    { prefix: null, infix: binary, precedence: precedenceLevels.or }, // Or
    { prefix: unary, infix: null, precedence: precedenceLevels.none }, // Bang
    { prefix: grouping, infix: call, precedence: precedenceLevels.call }, // LeftParen
    { prefix: null, infix: null, precedence: precedenceLevels.none }, // RightParen
    { prefix: null, infix: null, precedence: precedenceLevels.none }, // Semicolon
    { prefix: null, infix: null, precedence: precedenceLevels.none }, // Comma
    { prefix: number, infix: null, precedence: precedenceLevels.none }, // Number
    { prefix: variable, infix: null, precedence: precedenceLevels.none }, // Identifier
    { prefix: null, infix: null, precedence: precedenceLevels.none }, // Error
    { prefix: null, infix: null, precedence: precedenceLevels.none } // End
];

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
