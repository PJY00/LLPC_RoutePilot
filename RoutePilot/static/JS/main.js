// main.js
// └── 전역 변수 선언 및 모듈 임포트, onload 이벤트 바인딩

import { initMapAndWeather } from './map/mapInit.js';
import { drawRoute, drawLine, fitMapToRoute } from './route/routeDraw.js';
import { calculateDistance } from './utils/distance.js'; // 경로는 실제 파일 위치에 맞게 수정

// ── 전역 변수 선언 (모듈 전반에서 활용) ──
// 반드시 window.<이름> 형태로 선언해야 다른 모듈/HTML 인라인에서도 참조 가능합니다.
window.map = null;
window.marker = null;
window.startMarker = null;
window.endMarker = null;
window.routePolylines = [];
window.routeMarkers = [];
window.globalRouteCoords = [];
window.liveRouteLine = null;
window.marker_ = null;
window.currentSpeedLimit = null;
window.startLat = null;
window.startLon = null;

// 전역으로 노출할 함수들 (HTML 인라인 또는 다른 모듈에서 호출 가능)
window.getCurrentLocation = getCurrentLocation;
window.setupAddressGeocode = setupAddressGeocode;
window.drawRoute = drawRoute;
window.fetchSpeedAtClickedLocation = fetchSpeedAtClickedLocation;
window.compareSpeed = compareSpeed;
//window.fitMapToRoute = fitMapToRoute;
window.drawLine = drawLine;  // routeSearch.js 등에서 window.drawLine(...) 호출 가능하게
// ※ drawLine은 routeDraw.js에서 export된 함수이므로 반드시 import 후 window에 할당해야 합니다.

// Tmap API가 로드된 뒤 호출
window.onload = () => {
    initMapAndWeather();

    // “경로 그리기” 버튼 클릭 시 drawRoute 호출
    const drawBtn = document.getElementById("drawRouteBtn");
    if (drawBtn) {
        drawBtn.addEventListener("click", drawRoute);
    }

    // 출발지 버튼 클릭 시 getCurrentLocation 호출
    const startBtn = document.getElementById("getStartLocationBtn");
    if (startBtn) {
        startBtn.addEventListener("click", getCurrentLocation);
    }

    // 도착지 주소 변환 버튼 클릭 시 setupAddressGeocode 호출
    const addrBtn = document.getElementById("geocodeBtn");
    if (addrBtn) {
        addrBtn.addEventListener("click", setupAddressGeocode);
    }

    // 속도 비교 버튼 클릭 시 compareSpeed 호출
    const speedBtn = document.getElementById("compareSpeedBtn");
    if (speedBtn) {
        speedBtn.addEventListener("click", compareSpeed);
    }
};

// ── 함수 정의부 ──

function getCurrentLocation() {
    if (!navigator.geolocation) {
        return alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
    navigator.geolocation.getCurrentPosition(
        pos => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            window.startLat = lat;
            window.startLon = lon;

            // 기존 마커 제거
            if (window.startMarker) {
                window.startMarker.setMap(null);
            }
            // 새 출발지 마커 생성
            window.startMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lon),
                icon: "/static/images/marker.png",
                iconSize: new Tmapv2.Size(24, 24),
                iconAnchor: new Tmapv2.Point(16, 16),
                map: window.map
            });

            fetchReverseGeocoding(lon, lat)
                .then(address => {
                    document.getElementById("start-address").value = address;
                })
                .catch(err => {
                    console.error("주소 변환 실패:", err);
                    document.getElementById("start-address").value = "주소 조회 실패";
                });
        },
        err => {
            console.error("위치 접근 실패:", err);
            alert("위치 정보를 가져오지 못했습니다.");
        }
    );
}

function fetchReverseGeocoding(lon, lat) {
    return fetch("/reverse-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lon, lat })
    })
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            const parts = [
                data.city_do,
                data.gu_gun,
                data.eup_myun,
                data.roadName,
                data.buildingIndex
            ].filter(Boolean);
            return parts.join(" ");
        });
}

function setupAddressGeocode() {
    // 지도 준비 여부 확인
    if (!window.map) {
        alert("지도가 아직 준비되지 않았습니다. 잠시 기다린 후 다시 시도하세요.");
        return;
    }

    const fullAddr = document.getElementById("fullAddr").value.trim();
    if (!fullAddr) {
        alert("도착지 주소를 입력하세요.");
        return;
    }
    fetch("/fulladdr-geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullAddr })
    })
        .then(res => res.json())
        .then(response => {
            const coords = response.coordinateInfo?.coordinate;
            if (!coords || !coords.length) {
                document.getElementById("result").innerText = "주소를 찾을 수 없습니다.";
                return;
            }
            const pt = coords[0];
            const lat = pt.lat || pt.newLat;
            const lon = pt.lon || pt.newLon;

            // 기존 도착 마커 제거
            if (window.endMarker) {
                window.endMarker.setMap(null);
            }
            // 새 도착지 마커 생성
            window.endMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lon),
                icon: "/static/images/marker.png",
                iconSize: new Tmapv2.Size(24, 24),
                map: window.map
            });
            window.map.setCenter(new Tmapv2.LatLng(lat, lon));
        })
        .catch(err => {
            console.error("주소 변환 오류:", err);
        });
}

function fetchSpeedAtClickedLocation(lat, lon) {
    fetch(`/speed?lat=${lat}&lon=${lon}`)
        .then(res => res.json())
        .then(data => {
            const display = document.getElementById("speedDisplay");
            // 기존 클릭 마커 제거
            if (window.marker_) {
                window.marker_.setMap(null);
                window.marker_ = null;
            }
            // 새 속도 마커 생성
            window.marker_ = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lon),
                icon: "/static/images/car.png",
                iconSize: new Tmapv2.Size(40, 40),
                iconAnchor: new Tmapv2.Point(0, 0),
                map: window.map
            });

            if (data.speed_start && data.speed_end) {
                window.currentSpeedLimit = Math.round(
                    (parseInt(data.speed_start) + parseInt(data.speed_end)) / 2
                );
                display.className = "alert alert-info";
                display.innerText =
                    `현재 도로: ${data.road}\n` +
                    `시점: ${data.start}, 종점: ${data.end}\n` +
                    `제한속도 (기점 방향): ${data.speed_start} km/h, (종점 방향): ${data.speed_end} km/h`;

                // 경로 시각화
                if (window.globalRouteCoords.length) {
                    let minIdx = 0;
                    let minDist = Infinity;
                    window.globalRouteCoords.forEach((pt, i) => {
                        const d = calculateDistance(lat, lon, pt._lat, pt._lng);
                        if (d < minDist) {
                            minDist = d;
                            minIdx = i;
                        }
                    });
                    const remaining = window.globalRouteCoords.slice(0, minIdx + 1);
                    if (window.liveRouteLine) window.liveRouteLine.setMap(null);
                    window.liveRouteLine = new Tmapv2.Polyline({
                        path: remaining,
                        strokeColor: "#0077FF",
                        strokeWeight: 6,
                        iconAnchor: new Tmapv2.Point(16, 16),
                        map: window.map
                    });
                }
            } else if (data.message) {
                display.className = "alert alert-warning";
                display.innerText = data.message;
            } else {
                display.className = "alert alert-danger";
                display.innerText = "제한속도 정보를 찾을 수 없습니다.";
            }
        })
        .catch(err => {
            const display = document.getElementById("speedDisplay");
            display.className = "alert alert-danger";
            display.innerText = '오류 발생: ' + err;
        });
}

function compareSpeed() {
    const userSpeed = parseInt(document.getElementById("userSpeed").value);
    const resultBox = document.getElementById("speedResult");

    if (isNaN(userSpeed)) {
        resultBox.innerText = "속도를 입력하세요.";
        resultBox.style.color = "black";
        return;
    }

    // 날씨 정보 가져오기 (현재 클릭 위치 기준)
    fetch("/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            lat: window.marker_?.getPosition()._lat,
            lon: window.marker_?.getPosition()._lng
        })
    })
    .catch(err => {
        console.error("날씨 데이터 오류:", err);
        resultBox.innerText = "날씨 정보를 가져오지 못했습니다.";
        resultBox.style.color = "black";
    });

    if (userSpeed > window.currentSpeedLimit) {
        resultBox.innerText = `🚨 속도를 낮춰야 합니다. 제한속도: ${window.currentSpeedLimit}km/h`;
        resultBox.style.color = "red";
    } else {
        resultBox.innerText = "✅ 적절한 속도입니다.";
        resultBox.style.color = "green";
    }
}
