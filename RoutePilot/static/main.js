let map;
let marker;
let routeLayer;
let startMarker, endMarker;

function initMapAndWeather() {
  console.log("TMAP 스크립트 로드 확인:", typeof Tmapv2 !== "undefined");

  if (typeof Tmapv2 === "undefined") {
    console.error("Tmapv2가 정의되지 않았습니다.");
    return;
  }

  if (navigator.geolocation) {
    console.log("위치 정보를 요청합니다.");
    navigator.geolocation.getCurrentPosition((pos) => {
      console.log("위치 정보 가져오기 성공:", pos);

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // 지도 생성
      map = new Tmapv2.Map("map", {
        center: new Tmapv2.LatLng(lat, lon),
        width: "100%",
        height: "500px",
        zoom: 15
      });

      // 현재 위치 마커
      marker = new Tmapv2.Marker({
        position: new Tmapv2.LatLng(lat, lon),
        map: map
      });

      // 날씨 정보 갱신
      updateWeather(lat, lon);
      setInterval(() => updateWeather(lat, lon), 10 * 60 * 1000);

      // 지도 클릭 이벤트: 마커 찍고 경로 요청
      map.addListener("click", function (evt) {
        const lat = evt.latLng._lat;
        const lon = evt.latLng._lng;

        if (!startMarker) {
          startMarker = new Tmapv2.Marker({
            position: new Tmapv2.LatLng(lat, lon),
            icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_s.png",
            map: map
          });
        } else if (!endMarker) {
          endMarker = new Tmapv2.Marker({
            position: new Tmapv2.LatLng(lat, lon),
            icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_e.png",
            map: map
          });

          requestRoute(startMarker.getPosition(), endMarker.getPosition());
        } else {
          startMarker.setMap(null);
          endMarker.setMap(null);
          startMarker = null;
          endMarker = null;
          if (routeLayer) {
            routeLayer.setMap(null);
          }
        }
      });

    }, (error) => {
      console.error("위치 정보 가져오기 실패:", error);
    });
  } else {
    console.error("위치 정보 지원하지 않음");
  }
}

// 날씨 갱신 함수
function updateWeather(lat, lon) {
  fetch("/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lon })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`서버 오류: ${res.status} - ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.error) {
        document.getElementById("weather_info").innerText = "날씨 데이터를 불러오지 못했습니다.";
        console.error("날씨 데이터 오류:", data.error);
        return;
      }

      const text = `🌧 강수확률: ${data.pop}% | 🌂 강수량: ${data.pcp}mm | ❄️ 강설량: ${data.sno}mm`;
      document.getElementById("weather_info").innerText = text;

      const position = new Tmapv2.LatLng(lat, lon);

      if (marker) marker.setMap(null);
      marker = new Tmapv2.Marker({
        position: position,
        map: map,
        icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_p.png"
      });

      const infoContent = `<div style="padding:5px; background:white; border-radius:8px;">🌧 ${data.pop || "?"}%</div>`;
      const infoWindow = new Tmapv2.InfoWindow({
        position: position,
        content: infoContent,
        type: 2,
        map: map
      });
    })
    .catch(error => {
      console.error("날씨 정보 요청 오류:", error);
      document.getElementById("weather_info").innerText = "날씨 데이터를 불러오지 못했습니다.";
    });
}

// 경로 요청 함수
function requestRoute(start, end) {
  fetch("/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ start: { lat: start._lat, lon: start._lng }, end: { lat: end._lat, lon: end._lng } })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("경로를 불러오지 못했습니다.");
        return;
      }

      const linePath = data.route.map(coord => new Tmapv2.LatLng(coord.lat, coord.lon));

      if (routeLayer) {
        routeLayer.setMap(null);
      }

      routeLayer = new Tmapv2.Polyline({
        path: linePath,
        strokeColor: "#ff0000",
        strokeWeight: 6,
        map: map
      });

      // 거리 및 시간 표시
      document.getElementById("route_info").innerText = `🛣 거리: ${data.distance}m | 🕒 시간: ${data.time}분`;
    })
    .catch(error => {
      console.error("경로 요청 오류:", error);
      alert("경로를 불러오는 중 오류가 발생했습니다.");
    });
}

// 페이지 로드 후 실행
window.onload = initMapAndWeather;
