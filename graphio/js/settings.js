// @ts-check
import { NumberProperty, INTEGER, UNSIGNED, TextProperty, BooleanProperty } from "./properties.js";

const settings = {
  MaxActionsHistorySize: new NumberProperty(100, INTEGER | UNSIGNED, 1, 300),
  ReadonlyDemo: new TextProperty("hello", null, true, true),
  Bool: new BooleanProperty(false, false, true)
};

export default settings;