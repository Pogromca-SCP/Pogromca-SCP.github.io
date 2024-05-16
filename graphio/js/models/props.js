// @ts-check
import { BooleanProperty, NumberProperty, NO_FLAGS, INTEGER, UNSIGNED, ALLOW_NAN, TextProperty, NameProperty } from "../properties.js";

/**
 * @typedef {Object} PropertySettings
 * @property {boolean} [readonly]
 * 
 * @typedef {Object} BooleanValue
 * @property {boolean} value
 * 
 * @typedef {Object} NumberValue
 * @property {number} value
 * @property {number} [min]
 * @property {number} [max]
 * @property {boolean} [integer]
 * @property {boolean} [unsigned]
 * @property {boolean} [allowNaN]
 * 
 * @typedef {Object} TextValue
 * @property {string} value
 * @property {number} [maxLength]
 * 
 * @typedef {PropertySettings & (BooleanValue | NumberValue | TextValue)} PropertyDefinition
 * @typedef {boolean | number | string} PropertyValue
 */

/**
 * @param {PropertySettings & BooleanValue} prop
 * @param {boolean} value
 */
const loadBooleanProperty = (prop, value) => {
  const result = new BooleanProperty(prop.value, false, prop.readonly ?? false);
  result.transientUpdate(value);
  return result;
};

/**
 * @param {PropertySettings & NumberValue} prop
 * @param {number} value
 */
const loadNumberProperty = (prop, value) => {
  let flags = NO_FLAGS;

  if (prop.integer) {
    flags |= INTEGER;
  }

  if (prop.unsigned) {
    flags |= UNSIGNED;
  }

  if (prop.allowNaN) {
    flags |= ALLOW_NAN;
  }

  const result = new NumberProperty(prop.value, flags, prop.min ?? null, prop.max ?? null, false, prop.readonly ?? false);
  result.transientUpdate(value);
  return result;
};

/**
 * @param {PropertySettings & TextValue} prop
 * @param {string} value
 */
const loadTextProperty = (prop, value) => {
  const result = new TextProperty(prop.value, prop.maxLength ?? null, false, prop.readonly ?? false);
  result.transientUpdate(value);
  return result;
};

/**
 * @param {PropertySettings & TextValue} prop
 * @param {string} value
 */
const loadNameProperty = (prop, value) => {
  const result = new NameProperty(prop.value, false, prop.readonly ?? false);
  result.transientUpdate(value);
  return result;
};

/**
 * @param {PropertyDefinition} prop
 * @param {PropertyValue} value
 * @param {boolean} isName
 * @throws {Error}
 */
export const loadProperty = (prop, value, isName) => {
  const type = typeof(value);

  if (type !== typeof(prop.value)) {
    throw new Error("Cannot load property: Property type mismatch.");
  }

  switch (type) {
    case "boolean":
      return loadBooleanProperty(/** @type {PropertySettings & BooleanValue} */ (prop), /** @type {boolean} */ (value));
    case "number":
      return loadNumberProperty(/** @type {PropertySettings & NumberValue} */ (prop), /** @type {number} */ (value));
    case "string":
      return isName ? loadNameProperty(/** @type {PropertySettings & TextValue} */ (prop), /** @type {string} */ (value))
        : loadTextProperty(/** @type {PropertySettings & TextValue} */ (prop), /** @type {string} */ (value));
    default:
      throw new Error("Cannot load property: Unsupported property type.");
  }
};

/**
 * @template T
 * @param {import("../properties").Property<T>} prop 
 * @returns {T}
 */
export const saveProperty = prop => prop.getValue();