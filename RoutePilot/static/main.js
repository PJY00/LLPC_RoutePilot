let map;
let marker;

window.onload = function () {
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
};

function updateWeather(lat, lon) {
  fetch("/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon })
  })
    .then(res => res.json())
    .then(data => {
      const text = `🌡 온도: ${data.temp}℃ | 💧 습도: ${data.humidity}% | ☔️ 강수형태: ${data.rain_type}`;
      document.getElementById("weather_info").innerText = text;

      const position = new kakao.maps.LatLng(lat, lon);

      if (marker) marker.setMap(null);  // 이전 마커 제거
      marker = new kakao.maps.Marker({
        position: position,
        map: map
      });

      // 말풍선처럼 보이게
      const infowindow = new kakao.maps.InfoWindow({
        position: position,
        content: `<div style="padding:5px;">${data.temp}℃</div>`
      });
      infowindow.open(map, marker);
    });
}
