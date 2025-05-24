let map;
let marker;
let routeLayer;
let startMarker, endMarker;
let routePolylines = [];
let routeMarkers = [];

let startLat = null;
let startLon = null;

let globalRouteCoords = [];  // 🚗 실시간 경로 좌표
let liveRouteLine = null;
let carMarker = null;

// 거리계산 함수
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
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
                    const pts = seg.geometry.coordinates.map(c => {
                        const p = new Tmapv2.Point(c[0], c[1]);
                        return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    });
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
    Promise.all(["0", "2"].map(opt =>
        fetchRouteRisk(startX, startY, endX, endY, opt, trafficInfo)
    )).then(results => {
        const minRisk = Math.min(...results.map(r => r.risk));
        const candidates = results.filter(r => r.risk === minRisk);
        candidates.sort((a, b) => a.totalTime - b.totalTime);
        const best = candidates[0];
        resetRouteData();
        const bounds = new Tmapv2.LatLngBounds();
        best.features.forEach(seg => {
            if (seg.geometry.type === "LineString") {
                const pts = seg.geometry.coordinates.map(c => {
                    const p = new Tmapv2.Point(c[0], c[1]);
                    return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                });
                pts.forEach(pt => bounds.extend(pt));
                const trafArr = (trafficInfo === "Y") ? seg.geometry.traffic : [];
                drawLine(pts, trafArr);
            } else {
                const p = new Tmapv2.Point(seg.geometry.coordinates[0], seg.geometry.coordinates[1]);
                const cp = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                bounds.extend(cp);
            }
        });
        map.fitBounds(bounds);
        const p0 = best.features[0].properties;
        document.getElementById("route_info").innerText =
            `🛣 거리: ${(p0.totalDistance / 1000).toFixed(1)}km | 🕒 ${(p0.totalTime / 60).toFixed(0)}분`;
    }).catch(err => {
        console.error("추천 경로 오류:", err);
        alert("추천 경로를 불러오는 중 오류가 발생했습니다.");
    });
}

function drawFastestRoute(startX, startY, endX, endY, trafficInfo) {
    searchAndDrawRoute(startX, startY, endX, endY, "19", trafficInfo);
}

function fitMapToRoute() {
    const bounds = new Tmapv2.LatLngBounds();
    routePolylines.forEach(pl => pl.getPath().forEach(pt => bounds.extend(pt)));
    if (startMarker) bounds.extend(startMarker.getPosition());
    if (endMarker) bounds.extend(endMarker.getPosition());
    map.fitBounds(bounds);
}

function drawRoute() {
    if (!startMarker || !endMarker) {
        return alert("지도에서 출발지와 도착지를 먼저 선택하세요.");
    }
    const opt = document.getElementById("selectLevel").value;
    const traf = document.getElementById("trafficInfo").value;
    const s = startMarker.getPosition(), e = endMarker.getPosition();
    if (opt === "0") {
        drawRecommendedRoute(s._lng, s._lat, e._lng, e._lat, traf);
    } else if (opt === "2") {
        drawFastestRoute(s._lng, s._lat, e._lng, e._lat, traf);
    } else {
        searchAndDrawRoute(s._lng, s._lat, e._lng, e._lat, opt, traf);
    }
}

function initMapAndWeather() {
    if (typeof Tmapv2 === "undefined") {
        console.error("Tmapv2가 정의되지 않았습니다.");
        return;
    }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            map = new Tmapv2.Map("map", {
                center: new Tmapv2.LatLng(lat, lon),
                width: "100%",
                height: "500px",
                zoom: 15
            });
            updateWeather(lat, lon);
            setInterval(() => updateWeather(lat, lon), 10 * 60 * 1000);
        }, (error) => {
            console.error("위치 정보 가져오기 실패:", error);
        });
    }
}

function updateWeather(lat, lon) {
    fetch("/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon })
    })
        .then(res => res.json())
        .then(data => {
            const text = `🌧 강수확률: ${data.pop}% | 🌂 강수량: ${data.pcp}mm | ❄️ 강설량: ${data.sno}mm`;
            document.getElementById("weather_info").innerText = text;
        })
        .catch(err => {
            console.error("날씨 오류:", err);
        });
}

function resetRouteData() {
    routePolylines.forEach(pl => pl.setMap(null));
    routeMarkers.forEach(m => m.setMap(null));
    routePolylines = [];
    routeMarkers = [];
    globalRouteCoords = []; // 초기화
}

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
            const bounds = new Tmapv2.LatLngBounds();
            feat.forEach(seg => {
                if (seg.geometry.type === "LineString") {
                    const pts = seg.geometry.coordinates.map(c => {
                        const p = new Tmapv2.Point(c[0], c[1]);
                        return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    });
                    bounds.extend(pts[0]);
                    drawLine(pts, seg.geometry.traffic || []);
                }
            });
            map.fitBounds(bounds);
            fitMapToRoute();
        }
    });
}


function drawLine(points, trafficArr) {
    globalRouteCoords.push(...points);  // 🚗 실시간 경로 추적 좌표 저장
    const pl = new Tmapv2.Polyline({
        path: points,
        strokeColor: "#DD0000",
        strokeWeight: 6,
        map: map
    });
    routePolylines.push(pl);
}

// ====== 🚗 실시간 주행 기능 ======
function startLiveNavigation() {
    if (!navigator.geolocation) {
        alert("위치 추적을 지원하지 않습니다.");
        return;
    }

    navigator.geolocation.watchPosition(pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const current = new Tmapv2.LatLng(lat, lon);

        if (!carMarker) {
            carMarker = new Tmapv2.Marker({
                position: current,
                icon: "/static/images/car.png",
                iconSize: new Tmapv2.Size(32, 32),
                map: map
            });
        } else {
            carMarker.setPosition(current);
        }

        if (!globalRouteCoords.length) return;

        let minIdx = 0;
        let minDist = Infinity;
        globalRouteCoords.forEach((pt, i) => {
            const d = calculateDistance(lat, lon, pt._lat, pt._lng);
            if (d < minDist) {
                minDist = d;
                minIdx = i;
            }
        });

        const remaining = globalRouteCoords.slice(minIdx);
        if (liveRouteLine) liveRouteLine.setMap(null);

        liveRouteLine = new Tmapv2.Polyline({
            path: remaining,
            strokeColor: "#0077FF",
            strokeWeight: 6,
            map: map
        });

    }, err => {
        console.error("실시간 위치 추적 실패:", err);
    }, { enableHighAccuracy: true });
}

// ====== 🧪 위치 시뮬레이션 함수 ======
function simulateMockPosition(lat, lon) {
    const current = new Tmapv2.LatLng(lat, lon);

    if (!carMarker) {
        carMarker = new Tmapv2.Marker({
            position: current,
            icon: "/static/images/car.png",
            iconSize: new Tmapv2.Size(32, 32),
            map: map
        });
    } else {
        carMarker.setPosition(current);
    }

    if (!globalRouteCoords.length) return;

    let minIdx = 0;
    let minDist = Infinity;
    globalRouteCoords.forEach((pt, i) => {
        const d = calculateDistance(lat, lon, pt._lat, pt._lng);
        if (d < minDist) {
            minDist = d;
            minIdx = i;
        }
    });

    const remaining = globalRouteCoords.slice(minIdx);
    if (liveRouteLine) liveRouteLine.setMap(null);

    liveRouteLine = new Tmapv2.Polyline({
        path: remaining,
        strokeColor: "#0077FF",
        strokeWeight: 6,
        map: map
    });

    map.setCenter(current);
}

// 시작 시 실행
window.onload = () => {
    initMapAndWeather();
    startLiveNavigation(); // 실시간 주행 시작
};
