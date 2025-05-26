const menuIcon = document.getElementById('menuIcon');
  const dropdown = document.getElementById('dropdownMenu');

  function isMobile() {
    return window.innerWidth <= 768;
  }

  menuIcon.addEventListener('click', function () {
    if (isMobile()) {
      dropdown.classList.toggle('show');
    }
  });

  // 모바일에서 외부 클릭 시 닫기
  document.addEventListener('click', function (e) {
    if (
      isMobile() &&
      !document.getElementById('hamburgerWrapper').contains(e.target)
    ) {
      dropdown.classList.remove('show');
    }
  });