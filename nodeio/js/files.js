// @ts-check
const upload = /** @type {HTMLInputElement} */ (document.getElementById("file-upload"));
/** @type {(str: string) => void} */
let onLoad = str => {};

upload.onchange = e => {
  if (upload.files === null || upload.files.length < 1) {
    return;
  }

  const reader = new FileReader();

  reader.onload = read => {
    if (read.target !== null) {
      const text = read.target.result ?? "";
      onLoad(text.toString());
    }
  };

  reader.readAsText(upload.files[0], "UTF-8");
};

/**
 * @param {(str: string) => void} callback
 * @param {string} accept
 */
export const loadFile = (callback, accept) => {
  onLoad = callback;
  upload.accept = accept;
  upload.click();
};

/**
 * @param {string} filename
 * @param {string} text
 */
export const saveFile = (filename, text) => {
  const element = document.createElement("a");
  element.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  element.download = filename;
  element.hidden = true;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};