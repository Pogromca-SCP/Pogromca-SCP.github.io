// @ts-check
import { NO_FLAGS, TRANSIENT, READONLY, RESETABLE, BooleanProperty, NumberProperty, INTEGER, UNSIGNED, ALLOW_NAN, TextProperty } from "../properties.js";

/**
 * @typedef {Object} PropertySettings
 * @property {boolean} [readonly]
 * @property {boolean} [transient]
 * @property {boolean} [resetable]
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

/** @param {PropertySettings} prop */
const loadMetaflags = prop => {
  let metaflags = NO_FLAGS;

  if (prop.transient) {
    metaflags |= TRANSIENT;
  }

  if (prop.readonly) {
    metaflags |= READONLY;
  }

  if (prop.resetable) {
    metaflags |= RESETABLE;
  }

  return metaflags;
};

/**
 * @param {PropertySettings & BooleanValue} prop
 * @param {boolean} value
 */
const loadBooleanProperty = (prop, value) => {
  const result = new BooleanProperty(prop.value, loadMetaflags(prop));
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

  const result = new NumberProperty(prop.value, flags, prop.min ?? null, prop.max ?? null, loadMetaflags(prop));
  result.transientUpdate(value);
  return result;
};

/**
 * @param {PropertySettings & TextValue} prop
 * @param {string} value
 */
const loadTextProperty = (prop, value) => {
  const result = new TextProperty(prop.value, prop.maxLength ?? null, loadMetaflags(prop));
  result.transientUpdate(value);
  return result;
};

/**
 * @param {PropertyDefinition} prop
 * @param {PropertyValue} value
 * @throws {Error}
 */
export const loadProperty = (prop, value) => {
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
      return loadTextProperty(/** @type {PropertySettings & TextValue} */ (prop), /** @type {string} */ (value));
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