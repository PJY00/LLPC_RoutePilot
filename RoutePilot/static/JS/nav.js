const menuIcon = document.getElementById('menuIcon');
const dropdown = document.getElementById('dropdownMenu');
const wrapper = document.getElementById('hamburgerWrapper');

let hideTimer = null;
let clickLock = false; // 클릭으로 열었는지 여부

function isMobile() {
  return window.innerWidth <= 768;
}

// 모든 환경에서 클릭으로 열 수 있게 변경
menuIcon.addEventListener('click', function () {
  dropdown.classList.add('show');
  clickLock = true;

  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  // 클릭 후 2초 동안 hover 안 하면 자동 닫힘
  hideTimer = setTimeout(() => {
    if (!dropdown.matches(':hover') && !menuIcon.matches(':hover')) {
      dropdown.classList.remove('show');
      clickLock = false;
    }
  }, 2000);
});

// PC에서는 hover로 열기도 가능
if (!isMobile()) {
  wrapper.addEventListener('mouseenter', () => {
    dropdown.classList.add('show');
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  });

  wrapper.addEventListener('mouseleave', () => {
    hideTimer = setTimeout(() => {
      if (!dropdown.matches(':hover') && !menuIcon.matches(':hover')) {
        dropdown.classList.remove('show');
        clickLock = false;
      }
    }, 1500);
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
        clickLock = false;
      }
    }, 1500);
  });
}

// 모바일 외부 클릭 시 닫기
document.addEventListener('click', function (e) {
  if (!wrapper.contains(e.target)) {
    dropdown.classList.remove('show');
    clickLock = false;
  }
});
