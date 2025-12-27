// @ts-check
import { opCodes } from "./enums.js";

let debugMessage = "";

/**
 * @param {string} name
 * @param {number} offset
 */
const simple = (name, offset) => {
  debugMessage += `\n${name}`;
  return offset + 1;
};

/**
 * @param {readonly (number | string)[]} chunk
 * @param {string} name
 * @param {number} offset
 */
const constant = (chunk, name, offset) => {
  debugMessage += `\n${name} "${chunk[offset + 1]}"`;
  return offset + 2;
};

/**
 * @param {readonly (number | string)[]} chunk
 * @param {number} offset
 */
const showInstruction = (chunk, offset) => {
  switch (chunk[offset]) {
    case opCodes.constant:
      return constant(chunk, "OP_CONSTANT", offset);
    case opCodes.pop:
      return simple("OP_POP", offset);
    case opCodes.get:
      return constant(chunk, "OP_GET", offset);
    case opCodes.set:
      return constant(chunk, "OP_SET", offset);
    case opCodes.equal:
      return simple("OP_EQUAL", offset);
    case opCodes.greater:
      return simple("OP_GREATER", offset);
    case opCodes.less:
      return simple("OP_LESS", offset);
    case opCodes.add:
      return simple("OP_ADD", offset);
    case opCodes.subtract:
      return simple("OP_SUBSTRACT", offset);
    case opCodes.multiply:
      return simple("OP_MULTIPLY", offset);
    case opCodes.divide:
      return simple("OP_DIVIDE", offset);
    case opCodes.not:
      return simple("OP_NOT", offset);
    case opCodes.negate:
      return simple("OP_NEGATE", offset);
    case opCodes.call:
      return constant(chunk, "OP_CALL", offset);
    case opCodes.exp:
      return simple("OP_EXP", offset);
    case opCodes.mod:
      return simple("OP_MOD", offset);
    case opCodes.and:
      return simple("OP_AND", offset);
    case opCodes.or:
      return simple("OP_OR", offset);
    case opCodes.getFunc:
      return constant(chunk, "OP_GET_FUNC", offset);
    case opCodes.getInput:
      return constant(chunk, "OP_GET_INPUT", offset);
    default:
      debugMessage += `\nUnknown opcode ${chunk[offset]}`;
      return offset + 1;
  }
};

/** @param {readonly (number | string)[]} chunk */
const showChunk = chunk => {
  debugMessage = "Compiled chunk:";
  const chunkLength = chunk.length;

  for (let i = 0; i < chunkLength; ) {
    i = showInstruction(chunk, i);
  }

  if (debugMessage.length > 0) {
    console.debug(debugMessage);
    debugMessage = "";
  }
};

export default showChunk;