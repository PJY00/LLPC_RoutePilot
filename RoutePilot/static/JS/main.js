// main.js
// └── 전역 변수 선언 및 모듈 임포트, onload 이벤트 바인딩

import { initMapAndWeather } from './map/mapInit.js';
import { drawRoute } from './route/routeDraw.js';

// ── 전역 변수 선언 (모듈 전반에서 활용) ──
let map;
let startMarker, endMarker;  // 출발/도착 마커
let routePolylines = [];     // 그려진 모든 polyline
let globalRouteCoords = [];  // 현재 경로 전체 좌표 목록
let liveRouteLine = null;    // 실시간 주행 경로 시각화
let marker_ = null;          // polyline 클릭 시 생성되는 임시 마커
let currentSpeedLimit = null; // 클릭된 위치의 제한속도

window.getCurrentLocation = getCurrentLocation;
window.setupAddressGeocode = setupAddressGeocode;
window.drawRoute = drawRoute;
window.fetchSpeedAtClickedLocation = fetchSpeedAtClickedLocation;
window.compareSpeed = compareSpeed;
window.fitMapToRoute = fitMapToRoute;

// Tmap API가 로드된 뒤 호출
window.onload = () => {
    initMapAndWeather();

    // “경로 그리기” 버튼 ID가 drawRouteBtn 이라고 가정
    const btn = document.getElementById("drawRouteBtn");
    if (btn) {
        btn.addEventListener("click", drawRoute);
    }

    // 출발지 버튼 클릭 시 getCurrentLocation() 호출
    const startBtn = document.getElementById("getStartLocationBtn");
    if (startBtn) {
        startBtn.addEventListener("click", getCurrentLocation);
    }

    // 도착지 주소 변환 버튼 클릭 시 setupAddressGeocode() 호출
    const addrBtn = document.getElementById("geocodeBtn");
    if (addrBtn) {
        addrBtn.addEventListener("click", setupAddressGeocode);
    }

    // 속도 비교 버튼 클릭 시 compareSpeed() 호출
    const speedBtn = document.getElementById("compareSpeedBtn");
    if (speedBtn) {
        speedBtn.addEventListener("click", compareSpeed);
    }
};

// ── getCurrentLocation, fetchReverseGeocoding, setupAddressGeocode, 
//     fetchSpeedAtClickedLocation, compareSpeed, fitMapToRoute 등은 원래
//     글로벌 함수이므로 여기에도 선언하거나 별도 utils 파일로 분리 할 수 있습니다.

function getCurrentLocation() {
    if (!navigator.geolocation) {
        return alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        startLat = lat;
        startLon = lon;

        if (startMarker) startMarker.setMap(null);
        startMarker = new Tmapv2.Marker({
            position: new Tmapv2.LatLng(lat, lon),
            icon: "/static/images/marker.png",
            iconSize: new Tmapv2.Size(24, 24),
            iconAnchor: new Tmapv2.Point(16, 16),
            map
        });

        fetchReverseGeocoding(lon, lat)
            .then(address => {
                document.getElementById("start-address").value = address;
            })
            .catch(err => {
                console.error("주소 변환 실패:", err);
                document.getElementById("start-address").value = "주소 조회 실패";
            });
    }, err => {
        console.error("위치 접근 실패:", err);
        alert("위치 정보를 가져오지 못했습니다.");
    });
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
            if (endMarker) endMarker.setMap(null);
            endMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lon),
                icon: "/static/images/marker.png",
                iconSize: new Tmapv2.Size(24, 24),
                map
            });
            map.setCenter(new Tmapv2.LatLng(lat, lon));
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
            if (marker_) {
                marker_.setMap(null);
                marker_ = null;
            }
            marker_ = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lon),
                icon: "/static/images/car.png",
                iconSize: new Tmapv2.Size(40, 40),
                iconAnchor: new Tmapv2.Point(0, 0),
                map
            });
            if (data.speed_start && data.speed_end) {
                currentSpeedLimit = Math.round((parseInt(data.speed_start) + parseInt(data.speed_end)) / 2);
                display.className = "alert alert-info";
                display.innerText =
                    `현재 도로: ${data.road}\n` +
                    `시점: ${data.start}, 종점: ${data.end}\n` +
                    `제한속도 (기점 방향): ${data.speed_start} km/h, (종점 방향): ${data.speed_end} km/h`;

                // 경로 시각화
                if (globalRouteCoords.length) {
                    let minIdx = 0;
                    let minDist = Infinity;
                    globalRouteCoords.forEach((pt, i) => {
                        const d = calculateDistance(lat, lon, pt._lat, pt._lng);
                        if (d < minDist) {
                            minDist = d;
                            minIdx = i;
                        }
                    });
                    const remaining = globalRouteCoords.slice(0, minIdx + 1);
                    if (liveRouteLine) liveRouteLine.setMap(null);
                    liveRouteLine = new Tmapv2.Polyline({
                        path: remaining,
                        strokeColor: "#0077FF",
                        strokeWeight: 6,
                        iconAnchor: new Tmapv2.Point(16, 16),
                        map
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

    if (userSpeed > currentSpeedLimit) {
        resultBox.innerText = `🚨 속도를 낮춰야 합니다. 제한속도: ${currentSpeedLimit}km/h`;
        resultBox.style.color = "red";
    } else {
        resultBox.innerText = "✅ 적절한 속도입니다.";
        resultBox.style.color = "green";
    }
}

function fitMapToRoute() {
    const bounds = new Tmapv2.LatLngBounds();
    routePolylines.forEach(pl => {
        const path = pl.getPath();
        if (typeof path.getLength === 'function' && typeof path.getAt === 'function') {
            const len = path.getLength();
            for (let i = 0; i < len; i++) {
                bounds.extend(path.getAt(i));
            }
        } else if (Array.isArray(path)) {
            path.forEach(pt => bounds.extend(pt));
        }
    });
    if (startMarker) bounds.extend(startMarker.getPosition());
    if (endMarker) bounds.extend(endMarker.getPosition());
    map.fitBounds(bounds);
}
