let map;
let marker;

// kakao 지도도가 완전히 로드될 때까지 기다리기
function waitForKakao(callback) {
  if (typeof kakao !== "undefined" && kakao.maps) {
    callback();
  } else {
    setTimeout(() => waitForKakao(callback), 100);
  }
}

waitForKakao(() => {
  console.log("✅ kakao 객체 로딩 완료");
  initMapAndWeather();
});

function initMapAndWeather() {
  //브라우저 사용자의 현재 위치(위도,경도)를 가져옴옴
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      // 지도 생성
      const container = document.getElementById('map');
      const options = {
        center: new kakao.maps.LatLng(lat, lon),
        level: 3
      };
      map = new kakao.maps.Map(container, options);
      // 날씨 정보 표시
      updateWeather(lat, lon);
      // 10분마다 갱신
      setInterval(() => updateWeather(lat, lon), 10 * 60 * 1000);
    });
  } else {
    alert("위치 접근 불가");
  }
}
function updateWeather(lat, lon) {
  //Flask 서버 /weather에 POST요청을 보냄.
  //POST요청을 보내기 위해서는 html과 js가 꼭 필요?
  fetch("/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        document.getElementById("weather_info").innerText = "날씨 데이터를 불러오지 못했습니다.";
        return;
      }
      const text = `🌧 강수확률: ${data.pop}% | 🌂 강수량: ${data.pcp}mm | ❄️ 강설량: ${data.sno}mm`;
      document.getElementById("weather_info").innerText = text;

      const position = new kakao.maps.LatLng(lat, lon);

      if (marker) marker.setMap(null);

      marker = new kakao.maps.Marker({ position, map });

      const infowindow = new kakao.maps.InfoWindow({
        position,
        content: `<div style="padding:5px;">🌧 ${data.pop || "?"}%</div>`
      });
      infowindow.open(map, marker);
    });
}
