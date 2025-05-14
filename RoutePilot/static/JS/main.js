let map;
let marker;
let routeLayer;
let startMarker, endMarker;
let routePolylines = [];
let routeMarkers = [];

let startLat = null;
let startLon = null;
//거리계산 함수수
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 지구 반지름(m)
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // m 단위 거리 반환
}

function fetchRouteRisk(startX, startY, endX, endY, option, trafficInfo) {
    return new Promise((resolve, reject) => {
        $.ajax({
            type: "POST",
            url: `https://apis.openapi.sk.com/tmap/routes?version=1&format=json&appKey=${APPKEY}`,
            data: {
                startX, startY, endX, endY,
                reqCoordType: "WGS84GEO",
                resCoordType: "EPSG3857",
                searchOption: option,
                trafficInfo
            },
            success: res => {
                let totalDist = 0, lastKm = 0, risk = 0;
                const weatherCache = {};
                const promises = [];
                res.features.forEach(seg => {
                    if (seg.geometry.type !== "LineString") return;
                    // 좌표 변환
                    const pts = seg.geometry.coordinates.map(c => {
                        const p = new Tmapv2.Point(c[0], c[1]);
                        return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    });
                    // 1km마다 PCP 합산
                    for (let i = 1; i < pts.length; i++) {
                        totalDist += calculateDistance(pts[i - 1]._lat, pts[i - 1]._lng, pts[i]._lat, pts[i]._lng);
                        const km = Math.floor(totalDist / 1000);
                        if (km > lastKm) {
                            lastKm = km;
                            const roundedLat = Math.round(pts[i]._lat * 100) / 100;
                            const roundedLon = Math.round(pts[i]._lng * 100) / 100;
                            const key = `${roundedLat},${roundedLon}`;

                            if (!weatherCache[key]) {
                                weatherCache[key] = fetch("/weather", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ lat: roundedLat, lon: roundedLon })
                                }).then(r => r.json());
                            }

                            // 캐시된 Promise를 재사용
                            promises.push(
                                weatherCache[key].then(d => { risk += parseFloat(d.pcp) || 0; })
                            );
                        }
                    }
                });
                Promise.all(promises)
                    .then(() => resolve({ option, risk, features: res.features }))
                    .catch(reject);
            },
            error: reject
        });
    });
}

function drawRecommendedRoute(startX, startY, endX, endY, trafficInfo) {
    Promise.all(
        ["0", "2"].map(opt =>
            fetchRouteRisk(startX, startY, endX, endY, opt, trafficInfo)
        )
    ).then(results => {
        // 1) 최소 리스크 찾기
        const minRisk = Math.min(...results.map(r => r.risk));
        const candidates = results.filter(r => r.risk === minRisk);
        candidates.sort((a, b) => a.totalTime - b.totalTime);
        const best = candidates[0];
        // 초기화
        resetRouteData();
        // ——— 여기서 bounds 생성 ———
        const bounds = new Tmapv2.LatLngBounds();
        // 2) 경로 그리기 & bounds에 추가
        best.features.forEach(seg => {
            if (seg.geometry.type === "LineString") {
                const pts = seg.geometry.coordinates.map(c => {
                    const p = new Tmapv2.Point(c[0], c[1]);
                    return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                });
                pts.forEach(pt => bounds.extend(pt));               // 경로 포인트 추가
                const trafArr = (trafficInfo === "Y") ? seg.geometry.traffic : [];
                drawLine(pts, trafArr);
            } else {
                const p = new Tmapv2.Point(seg.geometry.coordinates[0], seg.geometry.coordinates[1]);
                const cp = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                bounds.extend(cp);
            }
        });
        // ——— 마지막에 한 번만 전체 화면 맞춤 ———
        map.fitBounds(bounds);
        // 요약정보
        const p0 = best.features[0].properties;
        document.getElementById("route_info").innerText =
            `🛣 거리: ${(p0.totalDistance / 1000).toFixed(1)}km | 🕒 ${(p0.totalTime / 60).toFixed(0)}분`;
    })
        .catch(err => {
            console.error("추천 경로 오류:", err);
            alert("추천 경로를 불러오는 중 오류가 발생했습니다.");
        });
}

function drawFastestRoute(startX, startY, endX, endY, trafficInfo) {
    // 그냥 Tmap의 '1번(최소시간)' 옵션 호출
    searchAndDrawRoute(startX, startY, endX, endY, "19", trafficInfo);
}

function fitMapToRoute() {
    const bounds = new Tmapv2.LatLngBounds();
    // 1) 폴리라인 점들
    routePolylines.forEach(pl => {
        pl.getPath().forEach(pt => {
            bounds.extend(pt);
        });
    });
    // 2) 마커들
    if (startMarker) bounds.extend(startMarker.getPosition());
    if (endMarker) bounds.extend(endMarker.getPosition());
    // 3) 실제 적용
    map.fitBounds(bounds);
}

function drawRoute() {
    if (!startMarker || !endMarker) {
        return alert("지도에서 출발지와 도착지를 먼저 선택하세요.");
    }
    const opt = document.getElementById("selectLevel").value;
    const traf = document.getElementById("trafficInfo").value;
    const s = startMarker.getPosition(), e = endMarker.getPosition();
    // ✅ 출발지와 도착지를 모두 포함하는 지도 범위로 설정
    const bounds = new Tmapv2.LatLngBounds();
    bounds.extend(s);
    bounds.extend(e);
    if (opt === "0") {
        // 0번 → 날씨 기준 추천 경로
        drawRecommendedRoute(s._lng, s._lat, e._lng, e._lat, traf);

    } else if (opt === "2") {
        // 2번 → 최소시간 경로 (날씨 무시)
        drawFastestRoute(s._lng, s._lat, e._lng, e._lat, traf);

    } else {
        // 1번(또는 그 외) → 기존 Tmap 옵션 대로
        searchAndDrawRoute(s._lng, s._lat, e._lng, e._lat, opt, traf);
    }
}

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
            // 날씨 정보 갱신
            updateWeather(lat, lon);
            setInterval(() => updateWeather(lat, lon), 10 * 60 * 1000);
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
// (1) 이전 경로/마커 초기화
function resetRouteData() {
    routePolylines.forEach(pl => pl.setMap(null));
    routeMarkers.forEach(m => m.setMap(null));
    routePolylines = [];
    routeMarkers = [];
}

// (2) 경로 탐색 → 그리기
function searchAndDrawRoute(startX, startY, endX, endY, searchOption, trafficInfo) {
    resetRouteData();
    $.ajax({
        type: "POST",
        url: `https://apis.openapi.sk.com/tmap/routes?version=1&format=json&appKey=${APPKEY}`,
        data: {
            startX, startY, endX, endY,
            reqCoordType: "WGS84GEO",
            resCoordType: "EPSG3857",
            searchOption, trafficInfo
        },
        success: function (res) {
            const feat = res.features;
            let totalDist = 0;
            let lastKmMark = 0;
            const bounds = new Tmapv2.LatLngBounds();
            feat.forEach(seg => {
                if (seg.geometry.type === "LineString") {
                    // EPSG3857 → WGS84 변환
                    const pts = seg.geometry.coordinates.map(c => {
                        const p = new Tmapv2.Point(c[0], c[1]);
                        return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    });
                    // 경로 포인트 모두 bounds에 추가
                    pts.forEach(pt => bounds.extend(pt));
                    // 경로 선 그리기
                    const trafficArr = (trafficInfo === "Y") ? seg.geometry.traffic : [];
                    drawLine(pts, trafficArr);
                } else {
                    const p = new Tmapv2.Point(seg.geometry.coordinates[0], seg.geometry.coordinates[1]);
                    const cp = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    // 마커 좌표도 bounds에 포함
                    bounds.extend(cp);
                }
            });
            // 경로 전체가 보이도록 지도 확대/이동
            map.fitBounds(bounds);
            fitMapToRoute();
            // 요약 정보 출력
            const prop0 = feat[0].properties;
            document.getElementById("route_info").innerText =
                `🛣 거리: ${(prop0.totalDistance / 1000).toFixed(1)}km | 🕒 ${(prop0.totalTime / 60).toFixed(0)}분`;
        },
        error: function (err) {
            console.error("경로 API 오류", err);
            alert("경로를 불러오지 못했습니다.");
        }
    });
}

// (3) POI 마커 추가
function addPOIMarker(lat, lng, iconUrl, type) {
    const size = (type === "P") ? new Tmapv2.Size(8, 8) : new Tmapv2.Size(24, 38);
    const m = new Tmapv2.Marker({
        position: new Tmapv2.LatLng(lat, lng),
        icon: iconUrl,
        iconSize: size,
        map: map
    });
    routeMarkers.push(m);
}

// (4) 교통정보 반영 폴리라인 그리기
function drawLine(points, trafficArr) {
    if (!trafficArr || trafficArr.length === 0) {
        const pl = new Tmapv2.Polyline({ path: points, strokeColor: "#DD0000", strokeWeight: 6, map: map });
        routePolylines.push(pl);
        return;
    }
    const colorMap = { 0: "#06050D", 1: "#61AB25", 2: "#FFFF00", 3: "#E87506", 4: "#D61125" };
    let last = 0;
    trafficArr.forEach(seg => {
        const [s, e, idx] = seg;
        if (s > last) {
            const pl0 = new Tmapv2.Polyline({ path: points.slice(last, s), strokeColor: "#06050D", strokeWeight: 6, map: map });
            routePolylines.push(pl0);
        }
        const pl1 = new Tmapv2.Polyline({
            path: points.slice(s, e + 1),
            strokeColor: colorMap[idx] || "#06050D",
            strokeWeight: 6, map: map
        });
        routePolylines.push(pl1);
        last = e + 1;
    });
    if (last < points.length) {
        const pl2 = new Tmapv2.Polyline({ path: points.slice(last), strokeColor: "#06050D", strokeWeight: 6, map: map });
        routePolylines.push(pl2);
    }
}

function getCurrentLocation() {//출발지 지정 onclick과 이어짐
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
        })
        .catch((err) => {
            console.error("주소 변환 오류:", err);
            document.getElementById("result").innerText =
                "주소 변환 중 오류가 발생했습니다.";
        });
}

//여기는 속도를 보기 위해
//현재 위치 10초마다 전달
function fetchSpeed() {
    navigator.geolocation.getCurrentPosition(function (position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetch(`/speed?lat=${lat}&lon=${lon}`)
            .then(res => res.json())
            .then(data => {
                const display = document.getElementById("speedDisplay");
                if (data.speed_start && data.speed_end) {
                    display.innerText =
                        `현재 도로: ${data.road}\n` +
                        `시점: ${data.start}, 종점: ${data.end}\n` +
                        `제한속도 (기점 방향): ${data.speed_start} km/h, (종점 방향): ${data.speed_end} km/h`;
                } else if (data.message) {
                    display.innerText = data.message;
                } else {
                    display.innerText = "제한속도 정보를 찾을 수 없습니다.";
                }
            })
            .catch(err => {
                document.getElementById("speedDisplay").innerText = '오류: ' + err;
            });
    });
}

// 10초마다 갱신
setInterval(fetchSpeed, 10000);

// 페이지 로드 시 처음 실행
fetchSpeed();

// 페이지 로드 후 실행
window.onload = initMapAndWeather;