// @ts-check
import { CompiledNode, USABLE } from "./nodes.js";
import { EditorNode, REMOVABLE } from "../renderer/graph.js";
import { NamedSocket, NumberSocket, OutputSocket, SelectSocket, SwitchSocket, TextSocket } from "../renderer/sockets.js";

const BUILT_IN_COLOR = "#333333";

export class SocketNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  instantiate(x, y) {
    return new EditorNode(REMOVABLE, x, y, "Socket", BUILT_IN_COLOR,
      new SelectSocket(1, "", "Output", ["Input", "Output"]),
      new OutputSocket(2, "Channel"),
      new NumberSocket(3, "Slot", 1, false, 1, 100, 1),
      new TextSocket(4, "Name", "", true, null, 50, ""),
      new TextSocket(5, "Default", "", true, null, 50, ""),
      new NamedSocket(6, "Data", ""),
    );
  }
}

export class TypeNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  instantiate(x, y) {
    return new EditorNode(REMOVABLE, x, y, "Type", BUILT_IN_COLOR,
      new NamedSocket(1, "Channel", ""),
      new SwitchSocket(2, "", false, false, "Default", "Not default"),
      new SwitchSocket(3, "", true, false, "Connective", "Not connective"),
      new OutputSocket(4, "Data"),
    );
  }
}

export class OptionNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  instantiate(x, y) {
    return new EditorNode(REMOVABLE, x, y, "Option", BUILT_IN_COLOR,
      new NamedSocket(1, "When", ""),
      new TextSocket(2, "", "", false, null, 50, ""),
      new OutputSocket(3, "Then"),
    );
  }
}

export class ConditionNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  instantiate(x, y) {
    return new EditorNode(REMOVABLE, x, y, "Condition", BUILT_IN_COLOR,
      new SelectSocket(1, "Input", "Number", ["Number", "Text", "Bool", "Type"]),
      new SelectSocket(2, "Operation", "Equals", ["Equals", "Not equals", "Less than", "Greater than"]),
      new NumberSocket(3, "", 0, true, -100, 100, 1),
      new NumberSocket(4, "", 0, true, -100, 100, 1),
      new OutputSocket(5, "True"),
      new OutputSocket(6, "False"),
    );
  }
}

export class SettingsNode extends CompiledNode {
  constructor() {
    super(USABLE);
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  instantiate(x, y) {
    return new EditorNode(REMOVABLE, x, y, "Settings", BUILT_IN_COLOR,
      new OutputSocket(1, "Output"),
      new TextSocket(2, "Name", "", true, null, 50, ""),
      new TextSocket(3, "Color", "", true, 6, 6, "0123456789abcdef"),
    );
  }
}