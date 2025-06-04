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

  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(autocompleteBox);

  input.addEventListener("input", () => {
    clearTimeout(timeout);
    const keyword = input.value.trim();
    if (!keyword) {
      autocompleteBox.innerHTML = "";
      return;
    }
    timeout = setTimeout(() => {
      fetch(`/autocomplete?query=${encodeURIComponent(keyword)}`)
        .then(res => res.json())
        .then(data => {
          autocompleteBox.innerHTML = "";
          data.suggestions.forEach(suggestion => {
            const li = document.createElement("li");
            li.textContent = suggestion;
            li.style.padding = "8px";
            li.style.cursor = "pointer";

            li.addEventListener("click", () => {
              input.value = suggestion;
              autocompleteBox.innerHTML = "";
            });

            autocompleteBox.appendChild(li);
          });
        })
    }, 300);
  });
});
