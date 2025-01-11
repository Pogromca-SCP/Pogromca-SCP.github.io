// @ts-check

/**
 * @typedef {object} NamedSocketParams
 * @property {string} name
 * 
 * @typedef {object} NumberSocketParams
 * @property {string} name
 * @property {boolean} connective
 * @property {number} def
 * @property {number} min
 * @property {number} max
 * @property {number} step
 * 
 * @typedef {object} SelectSocketParams
 * @property {string} name
 * @property {string} def
 * @property {string[]} options
 * 
 * @typedef {object} SwitchSocketParams
 * @property {string} name
 * @property {boolean} connective
 * @property {boolean} def
 * @property {string} active
 * @property {string} inactive
 * 
 * @typedef {object} TextSocketParams
 * @property {string} name
 * @property {boolean} connective
 * @property {string} def
 * @property {number} min
 * @property {number} max
 * @property {string} valid
 * 
 * @typedef {object} OutputSocketParams
 * @property {string} name
 */

/**
 * @param {HTMLElement} parent
 * @param {Readonly<NamedSocketParams>} params
 */
export const renderNamedSocket = (parent, params) => {
  const root = document.createElement("div");
  const connector = document.createElement("div");
  root.appendChild(connector);
  const label = document.createElement("label");
  label.textContent = params.name;
  root.appendChild(label);
  parent.appendChild(root);
};

/**
 * @param {HTMLElement} parent
 * @param {Readonly<NumberSocketParams>} params
 */
export const renderNumberSocket = (parent, params) => {
  const root = document.createElement("div");
  
  if (params.connective) {
    const connector = document.createElement("div");
    root.appendChild(connector);
  }

  if (params.name.trim().length > 0) {
    const label = document.createElement("label");
    label.textContent = params.name;
    root.appendChild(label);
  }

  const input = document.createElement("input");
  input.type = "number";
  input.max = params.max.toString();
  input.min = params.min.toString();
  input.step = params.step.toString();
  input.value = params.def.toString();
  input.onkeydown = e => false;
  root.appendChild(input);
  parent.appendChild(root);
};

/**
 * @param {HTMLElement} parent
 * @param {Readonly<SelectSocketParams>} params
 */
export const renderSelectSocket = (parent, params) => {
  const root = document.createElement("div");

  if (params.name.trim().length > 0) {
    const label = document.createElement("label");
    label.textContent = params.name;
    root.appendChild(label);
  }

  const input = document.createElement("select");

  for (const opt of params.options) {
    const option = document.createElement("option");
    option.value = opt;
    option.innerText = opt;
    option.selected = opt === params.def;
    input.appendChild(option);
  }

  root.appendChild(input);
  parent.appendChild(root);
};

/**
 * @param {HTMLElement} parent
 * @param {Readonly<SwitchSocketParams>} params
 */
export const renderSwitchSocket = (parent, params) => {
  const root = document.createElement("div");
  
  if (params.connective) {
    const connector = document.createElement("div");
    root.appendChild(connector);
  }

  if (params.name.trim().length > 0) {
    const label = document.createElement("label");
    label.textContent = params.name;
    root.appendChild(label);
  }

  const input = document.createElement("select");
  
  for (const bool of [false, true]) {
    const option = document.createElement("option");
    option.value = bool ? "true" : "false";
    option.innerText = bool ? params.active : params.inactive;
    option.selected = bool === params.def;
    input.appendChild(option);
  }

  root.appendChild(input);
  parent.appendChild(root);
};

/**
 * @param {HTMLElement} parent
 * @param {Readonly<TextSocketParams>} params
 */
export const renderTextSocket = (parent, params) => {
  const root = document.createElement("div");
  
  if (params.connective) {
    const connector = document.createElement("div");
    root.appendChild(connector);
  }

  if (params.name.trim().length > 0) {
    const label = document.createElement("label");
    label.textContent = params.name;
    root.appendChild(label);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = params.max;
  input.minLength = params.min;
  input.placeholder = params.def;
  root.appendChild(input);
  parent.appendChild(root);
};

/**
 * @param {HTMLElement} parent
 * @param {Readonly<OutputSocketParams>} params
 */
export const renderOutputSocket = (parent, params) => {
  const root = document.createElement("div");
  const label = document.createElement("label");
  label.textContent = params.name;
  root.appendChild(label);
  const connector = document.createElement("div");
  root.appendChild(connector);
  parent.appendChild(root);
};