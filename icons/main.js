// @ts-check

const output = /** @type {HTMLDivElement} */ (document.getElementById("output"));
const letter = /** @type {HTMLInputElement} */ (document.getElementById("letter"));
const color = /** @type {HTMLInputElement} */ (document.getElementById("color"));

letter.onchange = () => output.innerText = letter.value;
color.onchange = () => output.style.backgroundColor = color.value;