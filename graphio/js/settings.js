// @ts-check
import { NumberProperty, INTEGER, UNSIGNED } from "./properties.js";

const settings = {
  MaxActionsHistorySize: new NumberProperty(100, INTEGER | UNSIGNED, 1, 300, true)
};

export default settings;