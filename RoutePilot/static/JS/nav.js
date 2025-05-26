const menuIcon = document.getElementById('menuIcon');
const dropdown = document.getElementById('dropdownMenu');
const wrapper = document.getElementById('hamburgerWrapper');

let hideTimer = null;

function isMobile() {
  return window.innerWidth <= 768;
}

  // 모바일에서는 클릭으로 토글
menuIcon.addEventListener('click', function () {
  if (isMobile()) {
    dropdown.classList.toggle('show');
  }
});

  // PC에서는 hover + delay 기반 유지
  if (!isMobile()) {
    wrapper.addEventListener('mouseenter', () => {
      dropdown.classList.add('show');

      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });

    wrapper.addEventListener('mouseleave', () => {
      // 1초 후에 드롭다운 숨기기 (조건부)
      hideTimer = setTimeout(() => {
        // 드롭다운 위에 hover 안 되어 있으면 숨김
        if (!dropdown.matches(':hover') && !menuIcon.matches(':hover')) {
          dropdown.classList.remove('show');
        }
      }, 1000);
    });

    dropdown.addEventListener('mouseenter', () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    });

    dropdown.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        if (!wrapper.matches(':hover')) {
          dropdown.classList.remove('show');
        }
      }, 3000);
    });
  }

  // 모바일 외부 클릭 시 닫기
  document.addEventListener('click', function (e) {
    if (isMobile() && !wrapper.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

