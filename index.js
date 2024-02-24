const currentLinkClass = "current";
const frameId = "content";

/**
 * @param {string} name 
 * @param {number} height
 */
const navigate = (name, height) => {
    for (const link of document.getElementsByClassName(currentLinkClass)) {
        link.classList.remove(currentLinkClass);
    }

    /** @type {HTMLButtonElement} */
    const target = document.getElementById(name);
    target.classList.add(currentLinkClass);

    /** @type {HTMLIFrameElement} */
    const frame = document.getElementById(frameId);
    frame.src = `./${name}/${name}.html`;
    frame.height = height;
};