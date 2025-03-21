// @ts-check
import { tokenTypes } from "./enums.js";

/**
 * @typedef {object} Token
 * @property {tokenTypes} type
 * @property {string} lexeme
 * @property {number} line
 */

export default class Scanner {
  /**
   * @type {string}
   * @readonly
   */
  #source;

  /** @type {number} */
  #start;

  /** @type {number} */
  #current;

  /** @type {number} */
  #line;

  /** @param {string} source */
  constructor(source) {
    this.#source = source;
    this.#start = 0;
    this.#current = 0;
    this.#line = 1;
  }

  /** @param {string} ch */
  static isDigit(ch) {
    return ch.match(/[0-9]/) !== null;
  }

  /** @param {string} ch */
  static isAlpha(ch) {
    return ch.match(/[a-zA-Z'_]/) !== null;
  }

  static get emptyScanner() {
    return new Scanner("");
  }

  get isAtEnd() {
    return this.#current >= this.#source.length;
  }

  get peek() {
    return this.#source.charAt(this.#current);
  }

  get peekNext() {
    return this.#source.charAt(this.#current + 1);
  }

  get peekPrevious() {
    return this.#source.charAt(this.#current - 1);
  }

  #advance() {
    ++this.#current;
    return this.peekPrevious;
  }

  /** @param {string} expected */
  #match(expected) {
    if (this.peek !== expected) {
      return false;
    }

    ++this.#current;
    return true;
  }

  /** @param {tokenTypes} type */
  #makeToken(type) {
    return {
      type: type,
      lexeme: this.#source.substring(this.#start, this.#current),
      line: this.#line,
    };
  }

  /** @param {string} message */
  #errorToken(message) {
    return {
      type: tokenTypes.error,
      lexeme: message,
      line: this.#line,
    };
  }

  scanToken() {
    this.#skipWhitespace();
    this.#start = this.#current;

    if (this.isAtEnd) {
      return this.#makeToken(tokenTypes.end);
    }

    const ch = this.#advance();

    if (Scanner.isAlpha(ch)) {
      return this.#identifier();
    }

    if (Scanner.isDigit(ch)) {
      return this.#number();
    }

    switch (ch) {
      case "(":
        return this.#makeToken(tokenTypes.leftParen);
      case ")":
        return this.#makeToken(tokenTypes.rightParen);
      case ";":
        return this.#makeToken(tokenTypes.semicolon);
      case ",":
        return this.#makeToken(tokenTypes.comma);
      case "=":
        return this.#makeToken(this.#match("=") ? tokenTypes.equalEqual : tokenTypes.equal);
      case "+":
        return this.#makeToken(tokenTypes.plus);
      case "-":
        return this.#makeToken(tokenTypes.minus);
      case "*":
        return this.#makeToken(tokenTypes.star);
      case "^":
        return this.#makeToken(tokenTypes.exp);
      case "/":
        return this.#makeToken(tokenTypes.slash);
      case "%":
        return this.#makeToken(tokenTypes.modulo);
      case "<":
        return this.#makeToken(this.#match("=") ? tokenTypes.lessEqual : tokenTypes.less);
      case ">":
        return this.#makeToken(this.#match("=") ? tokenTypes.greaterEqual : tokenTypes.greater);
      case "&":
        return this.#makeToken(tokenTypes.and);
      case "|":
        return this.#makeToken(tokenTypes.or);
      case "!":
        return this.#makeToken(this.#match("=") ? tokenTypes.bangEqual : tokenTypes.bang);
      case "#":
        while (!this.isAtEnd && this.peek !== "\n") {
          ++this.#current;
        }

        return null;
      case ".":
        if (Scanner.isDigit(this.peek)) {
          return this.#number();
        }
      default:
        return this.#errorToken(`Unexpected character: ${ch}.`);
    }
  }

  #skipWhitespace() {
    while (true) {
      switch (this.peek) {
        case "\n":
          ++this.#line;
        case " ":
        case "\r":
        case "\t":
          ++this.#current;
          break;
        default:
          return;
      }
    }
  }

  #number() {
    while (Scanner.isDigit(this.peek)) {
      ++this.#current;
    }

    if (this.peek === "." && Scanner.isDigit(this.peekNext)) {
      ++this.#current;
    }

    while (Scanner.isDigit(this.peek)) {
      ++this.#current;
    }

    return this.#makeToken(tokenTypes.number);
  }

  #identifier() {
    let ch = this.peek;

    while (Scanner.isAlpha(ch) || Scanner.isDigit(ch)) {
      ++this.#current;
      ch = this.peek;
    }

    return this.#makeToken(tokenTypes.identifier);
  }
}