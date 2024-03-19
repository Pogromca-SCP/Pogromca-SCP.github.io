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

    /** @type {StdFunction[]} */
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

    /** @param {number | string} code */
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

    /** @param {number | string} value */
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
                    this.error(`Cannot call '${prev.lexeme}' because it's not a function.`);
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