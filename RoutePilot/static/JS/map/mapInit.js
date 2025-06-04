// mapInit.js
// └── initMapAndWeather: Tmap 지도 생성 및 사용자 위치 기반 초기 렌더링

import { updateWeather } from './weather.js';

// 전역에 의해 shared 되도록 선언 (main.js에서 let map, marker ...)
// 여기서는 map, marker 변수를 전역 scope에서 사용한다고 가정
export function initMapAndWeather() {
    console.log("TMAP 스크립트 로드 확인:", typeof Tmapv2 !== "undefined");
    if (typeof Tmapv2 === "undefined") {
        console.error("Tmapv2가 정의되지 않았습니다.");
        return;
    }

    // 제한속도 안내 문구 초기화
    document.getElementById("speedDisplay").innerText =
        "지도를 클릭하면 해당 위치의 제한속도 정보가 표시됩니다.";

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                // 지도 생성 (전역 map 변수 사용)
                window.map = new Tmapv2.Map("map", {
                    center: new Tmapv2.LatLng(lat, lon),
                    width: "100%",
                    height: "500px",
                    zoom: 15
                });

                // 첫 날씨 정보 요청 및 10분마다 갱신
                updateWeather(lat, lon);
                setInterval(() => updateWeather(lat, lon), 10 * 60 * 1000);
            },
            (error) => {
                console.error("위치 정보 가져오기 실패:", error);
                alert("위치 정보를 가져오지 못했습니다.");
            }
        );
    } else {
        console.error("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
}
