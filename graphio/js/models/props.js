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

/** @param {PropertySettings & BooleanValue} prop */
const loadBooleanProperty = prop => {
  return new BooleanProperty(prop.value, loadMetaflags(prop));
};

/** @param {PropertySettings & NumberValue} prop */
const loadNumberProperty = prop => {
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

  return new NumberProperty(prop.value, flags, prop.min ?? null, prop.max ?? null, loadMetaflags(prop));
};

/** @param {PropertySettings & TextValue} prop */
const loadTextProperty = prop => {
  return new TextProperty(prop.value, prop.maxLength ?? null, loadMetaflags(prop));
};

/**
 * @param {PropertyDefinition} prop
 * @throws {Error}
 */
export const makeProperty = prop => {
  switch (typeof(prop.value)) {
    case "boolean":
      return loadBooleanProperty(/** @type {PropertySettings & BooleanValue} */ (prop));
    case "number":
      return loadNumberProperty(/** @type {PropertySettings & NumberValue} */ (prop));
    case "string":
      return loadTextProperty(/** @type {PropertySettings & TextValue} */ (prop));
    default:
      throw new Error("Cannot make property: Unsupported property type.");
  }
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
      const bool = loadBooleanProperty(/** @type {PropertySettings & BooleanValue} */ (prop));
      bool.transientUpdate(/** @type {boolean} */ (value));
      return bool;
    case "number":
      const num = loadNumberProperty(/** @type {PropertySettings & NumberValue} */ (prop));
      num.transientUpdate(/** @type {number} */ (value));
      return num;
    case "string":
      const text = loadTextProperty(/** @type {PropertySettings & TextValue} */ (prop));
      text.transientUpdate(/** @type {string} */ (value));
      return text;
    default:
      throw new Error("Cannot load property: Unsupported property type.");
  }
};

/**
 * @template T
 * @param {import("../properties").Property<T>} prop 
 */
export const saveProperty = prop => prop.getValue();