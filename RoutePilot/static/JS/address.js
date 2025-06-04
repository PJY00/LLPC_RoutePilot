document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("fullAddr");

  let timeout = null;
  const autocompleteBox = document.createElement("ul");
  autocompleteBox.id = "autocomplete-results";
  autocompleteBox.style.position = "absolute";
  autocompleteBox.style.zIndex = "1000";
  autocompleteBox.style.backgroundColor = "white";
  autocompleteBox.style.border = "1px solid #ccc";
  autocompleteBox.style.width = input.offsetWidth + "px";
  autocompleteBox.style.listStyle = "none";
  autocompleteBox.style.padding = "0";
  autocompleteBox.style.marginTop = "2px";
  autocompleteBox.style.maxHeight = "200px";
  autocompleteBox.style.overflowY = "auto";  
});
