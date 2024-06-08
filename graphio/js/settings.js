// @ts-check
import { NumberProperty, INTEGER, UNSIGNED, TextProperty, BooleanProperty } from "./properties.js";

const settings = {
  /** @readonly */
  MaxActionsHistorySize: new NumberProperty(100, INTEGER | UNSIGNED, 1, 300),
  /** @readonly */
  ReadonlyDemo: new TextProperty("hello", null),
  /** @readonly */
  Bool: new BooleanProperty(false)
};

export default settings;