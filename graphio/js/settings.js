// @ts-check
import { BooleanProperty, NumberProperty, TextProperty } from "./properties.js";

const settings = {
  test: new BooleanProperty(),
  ActionsHistoryLength: new NumberProperty(100, true),
  text: new TextProperty()
};

export default settings;