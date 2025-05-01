let map;
let marker;
let routeLayer;
let startMarker, endMarker;

let startLat = null;
let startLon = null;

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
                icon: "/static/images/marker.png",
                iconSize: new Tmapv2.Size(24, 24)
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

function getCurrentLocation() {
    if (!navigator.geolocation) {
        return alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
    }

    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        // 전역 변수에 저장
        startLat = lat;
        startLon = lon;

        // 지도에 출발 마커 찍기 (기존 startMarker가 있다면 교체)
        if (startMarker) startMarker.setMap(null);
        startMarker = new Tmapv2.Marker({
            position: new Tmapv2.LatLng(lat, lon),
            icon: "/static/images/marker.png",
            iconSize: new Tmapv2.Size(24, 24),
            map: map
        });

        // 출발지 주소 보여주는 input#start-address만 있으면 OK
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

// Tmap Reverse Geocoding API로 주소 가져오는 함수
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

// 3) 버튼 클릭 시 도착지 주소 → 좌표 변환 → 마커 표시
// main.js

/**
 * 버튼 클릭 인라인 호출용 함수.
 * 호출되면 바로 주소→좌표 변환 후 마커를 찍습니다.
 */
function setupAddressGeocode() {
    // 1) 입력값 검증
    const fullAddr = document.getElementById("fullAddr").value.trim();
    if (!fullAddr) {
        alert("도착지 주소를 입력하세요.");
        return;
    }

    // 2) Flask 프록시 엔드포인트 호출
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

            // 3) 첫 번째 결과 가져오기
            const pt = coords[0];
            const lat = pt.lat || pt.newLat;
            const lon = pt.lon || pt.newLon;

            // 4) 기존 도착 마커 제거
            if (endMarker) endMarker.setMap(null);

            // 5) 새 도착 마커 생성
            endMarker = new Tmapv2.Marker({
                position: new Tmapv2.LatLng(lat, lon),
                icon: "/static/images/marker.png",
                iconSize: new Tmapv2.Size(24, 24),
                map: map
            });

            // 6) 지도 중심 이동 & 결과 표시
            map.setCenter(new Tmapv2.LatLng(lat, lon));
            document.getElementById("result").innerText =
                `도착지: ${fullAddr} (위경도: ${lat}, ${lon})`;

            // ※ 여긴 더 이상 경로 탐색 안 함
        })
        .catch((err) => {
            console.error("주소 변환 오류:", err);
            document.getElementById("result").innerText =
                "주소 변환 중 오류가 발생했습니다.";
        });
}

// 페이지 로드 후 실행
window.onload = initMapAndWeather;
