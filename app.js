// @ts-check

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", {
    scope: "https://pogromca-scp.github.io",
  });
}