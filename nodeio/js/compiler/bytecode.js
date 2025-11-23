// @ts-check

/**
 * @typedef {import("../renderer/nodes.js").EditorNode} EditorNode
 * @typedef {import("../renderer/nodes.js").Param} Param
 */

export const OP_GET = 0;
export const OP_CONSTANT = 1;
export const OP_NOT = 2;
export const OP_AND = 3;
export const OP_OR = 4;
export const OP_EQUALS = 5;
export const OP_LESS = 6;
export const OP_GREATER = 7;
export const OP_ADD = 8;
export const OP_SUBTRACT = 9;
export const OP_MULTIPLY = 10;
export const OP_DIVIDE = 11;
export const OP_MODULO = 12;
export const OP_SIN = 13;
export const OP_COS = 14;
export const OP_TAN = 15;
export const OP_FORMAT = 16;
export const OP_JOIN = 17;
export const OP_REPEAT = 18;
export const OP_REVERSE = 19;
export const OP_LENGTH = 20;

/**
 * @param {readonly Param[]} chunk
 * @param {EditorNode} node
 */
export const calculate = (chunk, node) => {
  const length = chunk.length;
  /** @type {Param[]} */
  const stack = [];
  let index = 0;

  while (index < length) {
    const op = chunk[index++];

    switch (op) {
      case OP_GET: {
        const offset = /** @type {number} */ (chunk[index++]);
        stack.push(node.sockets[offset].value);
        break;
      }
      case OP_CONSTANT: {
        const value = chunk[index++];
        stack.push(value);
        break;
      }
      case OP_NOT: {
        const value = stack.pop();
        stack.push(!value);
        break;
      }
      case OP_AND: {
        const b = /** @type {boolean} */ (stack.pop());
        const a = /** @type {boolean} */ (stack.pop());
        stack.push(a && b);
        break;
      }
      case OP_OR: {
        const b = /** @type {boolean} */ (stack.pop());
        const a = /** @type {boolean} */ (stack.pop());
        stack.push(a || b);
        break;
      }
      case OP_EQUALS: {
        const b = stack.pop();
        const a = stack.pop();
        stack.push(a === b);
        break;
      }
      case OP_LESS: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a < b);
        break;
      }
      case OP_GREATER: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a > b);
        break;
      }
      case OP_ADD: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a + b);
        break;
      }
      case OP_SUBTRACT: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a - b);
        break;
      }
      case OP_MULTIPLY: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a * b);
        break;
      }
      case OP_DIVIDE: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a / b);
        break;
      }
      case OP_MODULO: {
        const b = /** @type {number} */ (stack.pop());
        const a = /** @type {number} */ (stack.pop());
        stack.push(a % b);
        break;
      }
      case OP_SIN: {
        const a = /** @type {number} */ (stack.pop());
        stack.push(Math.sin(a));
        break;
      }
      case OP_COS: {
        const a = /** @type {number} */ (stack.pop());
        stack.push(Math.cos(a));
        break;
      }
      case OP_TAN: {
        const a = /** @type {number} */ (stack.pop());
        stack.push(Math.tan(a));
        break;
      }
      case OP_FORMAT:
        break;
      case OP_JOIN:
        break;
      case OP_REPEAT: {
        const amount = /** @type {number} */ (stack.pop());
        const text = /** @type {string} */ (stack.pop());
        stack.push(text.repeat(amount));
        break;
      }
      case OP_REVERSE: {
        const text = /** @type {string} */ (stack.pop());
        stack.push(text.split("").reverse().join(""));
        break;
      }
      case OP_LENGTH: {
        const text = /** @type {string} */ (stack.pop());
        stack.push(text.length);
        break;
      }
      default:
        throw new Error("An unknown opcode was encountered");
    }
  }

  return stack[0];
};