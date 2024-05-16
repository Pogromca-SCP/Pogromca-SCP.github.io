// @ts-check
import { NumberProperty, INTEGER, UNSIGNED, TextProperty, BooleanProperty } from "./properties.js";

const settings = {
  MaxActionsHistorySize: new NumberProperty(100, INTEGER | UNSIGNED, 1, 300),
  ReadonlyDemo: new TextProperty("hello", null),
  Bool: new BooleanProperty(false)
};

export default settings;