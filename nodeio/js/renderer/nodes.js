// @ts-check
import { renderNamedSocket, renderNumberSocket, renderOutputSocket, renderSelectSocket, renderSwitchSocket, renderTextSocket } from "./sockets.js";

/** @type {Map<string, any[]>} */
const nodes = new Map();

/** @param {string} id */
export const removeNodeType = id => nodes.delete(id);

/**
 * @param {string} id
 * @param {any[]} def
 */
export const addNodeType = (id, def) => nodes.set(id, def);

/**
 * @param {HTMLElement} parent
 * @param {string} id
 */
export const renderNode = (parent, id) => {
  const def = nodes.get(id);

  if (def === undefined) {
    return;
  }

  const root = document.createElement("div");
  root.className = "node";
  root.ondblclick = e => parent.removeChild(root);
  const name = document.createElement("p");
  name.innerText = id;
  root.appendChild(name);

  for (const socket of def) {
    switch (socket.type) {
      case "named":
        renderNamedSocket(root, socket);
        break;
      case "number":
        renderNumberSocket(root, socket);
        break;
      case "select":
        renderSelectSocket(root, socket);
        break;
      case "switch":
        renderSwitchSocket(root, socket);
        break;
      case "text":
        renderTextSocket(root, socket);
        break;
      default:
        renderOutputSocket(root, socket);
        break;
    }
  }

  parent.appendChild(root);
};