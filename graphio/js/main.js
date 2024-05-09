// @ts-check
const a = /** @type {HTMLInputElement} */ (document.getElementById("A"));
const b = /** @type {HTMLInputElement} */ (document.getElementById("B"));
const c = /** @type {HTMLInputElement} */ (document.getElementById("C"));
const upload = /** @type {HTMLInputElement} */ (document.getElementById("file-upload"));

const newGraph = () => {
  a.value = "";
  b.value = "";
  c.value = "";
  aValue = a.value;
  clearActionHistory();
};

const openGraph = () => {
  upload.click();
};

upload.onchange = e => {
  const file = e.target.files[0];

  // setting up the reader
  const reader = new FileReader();
  reader.readAsText(file,'UTF-8');

  // here we tell the reader what to do when it's done reading...
  reader.onload = readerEvent => {
     const content = readerEvent.target?.result?.toString() ?? ""; // this is the content!
     const obj = JSON.parse(content);
     a.value = obj.a;
     b.value = obj.b;
     c.value = obj.c;
     clearActionHistory();
  };
};

const saveGraph = () => {
  download("test.json", JSON.stringify({ a: a.value, b: b.value, c: c.value }));
};

const download = (filename, text) => {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

let aValue = a.value;

a.onchange = e => {
  makeAction(new SetText(a, aValue, e.target.value));
  aValue = e.target.value;
};

/*window.addEventListener("beforeunload", e => {
  e.preventDefault();
  return "";
});*/