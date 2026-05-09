// Enkel DOM-helper.
// Första steget: gör getElementById kortare och lättare att byta ut senare.
function byId(id) {
  return document.getElementById(id);
}

function qs(selector, root) {
  return (root || document).querySelector(selector);
}

function qsa(selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}
