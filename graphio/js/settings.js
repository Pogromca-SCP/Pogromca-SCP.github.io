// @ts-check
import { BooleanProperty, NumberProperty, NO_FLAGS, INTEGER, UNSIGNED, TextProperty } from "./properties.js";

const settings = {
  Bool: new BooleanProperty(),
  Number: new NumberProperty(100),
  ClampedNumber: new NumberProperty(5, NO_FLAGS, 0, 10),
  Integer: new NumberProperty(0, INTEGER),
  Unsigned: new NumberProperty(0, UNSIGNED),
  Text: new TextProperty(),
  TextWithLength: new TextProperty("test", 10)
};

export default settings;