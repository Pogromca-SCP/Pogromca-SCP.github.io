// @ts-check
import Scanner from "./scanner.js";
import { tokenTypes, opCodes, precedenceLevels } from "./enums.js";
import stdFunctions from "./std-lib.js";

/**
 * @typedef {import("./scanner.js").Token} Token
 * @typedef {import("./std-lib.js").StdFunction} StdFunction
 * 
 * @typedef {number | readonly number[] | (() => number)} VariableValue
 */

const compiler = {
  scanner: Scanner.emptyScanner,

  /** @type {Readonly<Token> | null} */
  current: null,

  /** @type {Readonly<Token> | null} */
  previous: null,

  /** @type {(number | string)[]} */
  chunk: [],
  hadError: false,

  /** @type {Record<string, number>} */
  variables: {},

  /** @type {Readonly<StdFunction>[]} */
  callStack: [],

  /** @type {Readonly<Record<string, VariableValue>>} */
  inputVars: {},

  /** @type {readonly string[]} */
  outputs: [],

  /** @param {string} message */
  onError: message => {},

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

  /** @param {tokenTypes} type */
  match(type) {
    if (!this.check(type)) {
      return false;
    }

    this.advance();
    return true;
  },

  /** @param {tokenTypes} type */
  check(type) {
    return this.current?.type === type;
  },

  /**
   * @param {tokenTypes} type
   * @param {string} message
   */
  consume(type, message) {
    if (this.current?.type === type) {
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
   * @param {Readonly<Token> | null} token
   * @param {string} message
   */
  errorAt(token, message) {
    if (token === null) {
      this.onError(`Error at unknown location: ${message}`);
      this.hadError = true;
      return;
    }

    let infix = "";

    if (token.type === tokenTypes.end) {
      infix = " at end";
    } else if (token.type !== tokenTypes.error) {
      infix = ` at '${token.lexeme}'`;
    }

    this.onError(`[line ${token.line}] Error${infix}: ${message}`);
    this.hadError = true;
  },

  /** @param {tokenTypes} precedence */
  parsePrecedence(precedence) {
    this.advance();
    const prefixRule = parseRules[this.previous?.type ?? tokenTypes.error].prefix;

    if (prefixRule === null) {
      this.error("Expected expression.");
      return;
    }

    const canAssign = precedence <= precedenceLevels.assignment;
    prefixRule(canAssign);

    while (precedence <= parseRules[this.current?.type ?? tokenTypes.error].precedence) {
      const prev = this.previous;
      this.advance();
      const infixRule = parseRules[this.previous?.type ?? tokenTypes.error].infix;

      if (infixRule === null) {
        this.error("Expected expression.");
        return;
      }

      if (infixRule === call) {
        const func = prev === null ? undefined : stdFunctions[prev.lexeme];

        if (func === undefined) {
          this.error(`Cannot call '${prev?.lexeme}' because it's not a function.`);
        } else {
          this.callStack.push(func);
        }
      }

      infixRule(canAssign);
    }

    if (canAssign && this.match(tokenTypes.equal)) {
      this.error("Invalid assignment target.");
    }
  },
};

/**
 * @callback ParseFn
 * @param {boolean} canAssign
 * @returns {void}
 *
 * @typedef {object} PrecedenceRule
 * @property {ParseFn | null} prefix
 * @property {ParseFn | null} infix
 * @property {tokenTypes} precedence
 */

/**
 * @param {string} src
 * @param {Readonly<Record<string, VariableValue>>} inputVars
 * @param {Readonly<string[]>} outputs
 * @param {(message: string) => void} onError
 */
const compile = (src, inputVars, outputs, onError) => {
  compiler.scanner = new Scanner(src);
  compiler.inputVars = inputVars;
  compiler.outputs = outputs;
  compiler.onError = onError;
  compiler.advance();

  while (!compiler.match(tokenTypes.end)) {
    expression();
    compiler.consume(tokenTypes.semicolon, "Expected ';' after expression.");
    compiler.emitNum(opCodes.pop);
  }

  for (const name in compiler.variables) {
    if (compiler.variables[name] < 1) {
      compiler.error(`Variable '${name}' is assigned but its value is never used.`);
    }
  }

  const result = compiler.hadError ? null : compiler.chunk;
  compiler.scanner = Scanner.emptyScanner;
  compiler.current = null;
  compiler.previous = null;
  compiler.chunk = [];
  compiler.hadError = false;
  compiler.variables = {};
  compiler.callStack = [];
  return result;
};

const expression = () => compiler.parsePrecedence(precedenceLevels.assignment);
const number = () => compiler.emitConstant(parseFloat(compiler.previous?.lexeme ?? "0.0"));

const grouping = () => {
  expression();
  compiler.consume(tokenTypes.rightParen, "Expected ')' after expression.");
};

const unary = () => {
  const operator = compiler.previous?.type;
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
  const operator = compiler.previous?.type ?? tokenTypes.error;
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
  const expected = compiler.callStack.pop()?.arity;

  if (count !== expected) {
    compiler.error(`Function expected ${expected} arguments.`);
  }

  return count;
};

/**
 * @param {Readonly<Token> | null} name
 * @param {boolean} canAssign
 */
const namedVariable = (name, canAssign) => {
  if (name === null) {
    compiler.error("Encountered null in named variable expression.");
    return;
  }

  if (canAssign && compiler.match(tokenTypes.equal)) {
    let define = true;

    if (stdFunctions[name.lexeme] !== undefined) {
      compiler.error(`Cannot assign value to '${name.lexeme}' because it's a function.`);
      define = false;
    }

    if (compiler.inputVars[name.lexeme] !== undefined) {
      compiler.error(`Cannot assign value to '${name.lexeme}' because it's readonly.`);
      define = false;
    }

    expression();
    compiler.emitNums(opCodes.set, name.lexeme);

    if (define && compiler.variables[name.lexeme] === undefined) {
      compiler.variables[name.lexeme] = compiler.outputs.includes(name.lexeme) ? 1 : 0;
    }
  } else {
    if (stdFunctions[name.lexeme] === undefined && compiler.inputVars[name.lexeme] === undefined && compiler.variables[name.lexeme] === undefined) {
      compiler.error(`Cannot read value of '${name.lexeme}' because it's undefined.`);
    }

    if (stdFunctions[name.lexeme] !== undefined && compiler.scanner.peekPrevious !== "(") {
      compiler.error(`Function '${name.lexeme}' can only be used for calling.`);
    }

    ++compiler.variables[name.lexeme];
    compiler.emitNums(opCodes.get, name.lexeme);
  }
};

/** @type {readonly Readonly<PrecedenceRule>[]} */
const parseRules = [
  { prefix: null, infix: null, precedence: precedenceLevels.none }, // Equal
  { prefix: null, infix: binary, precedence: precedenceLevels.term }, // Plus
  { prefix: unary, infix: binary, precedence: precedenceLevels.term }, // Minus
  { prefix: null, infix: binary, precedence: precedenceLevels.factor }, // Star
  { prefix: null, infix: binary, precedence: precedenceLevels.factor }, // Slash
  { prefix: null, infix: binary, precedence: precedenceLevels.exp }, // Exp
  { prefix: null, infix: binary, precedence: precedenceLevels.factor }, // Modulo
  { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // Less
  { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // Greater
  { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // LessEqual
  { prefix: null, infix: binary, precedence: precedenceLevels.comparison }, // GreaterEqual
  { prefix: null, infix: binary, precedence: precedenceLevels.equality }, // EqualEqual
  { prefix: null, infix: binary, precedence: precedenceLevels.equality }, // BangEqual
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

export default compile;