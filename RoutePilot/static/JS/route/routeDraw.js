// routeDraw.js
// └── drawRecommendedRoute: 위험도(risk) 계산 후 최소 리스크 & 최소 시간 경로 그리기
// └── drawFastestRoute: Tmap 기본 "최소시간" 옵션 호출
// └── drawRoute: 사용자 선택 옵션에 따라 위 두 함수 혹은 일반 경로 검색 호출

import { fetchRouteRisk } from './routeRisk.js';
import { searchAndDrawRoute } from './routeSearch.js';
import { resetRouteData } from './routeSearch.js';

let marker_ = null;

// (흔히 사용되는 유틸/전역) calculateDistance, drawLine, fitMapToRoute 등 전역 함수 필요
// 아래에서는 전역 scope에 이미 선언된 전역 변수(map, startMarker, endMarker 등)를 사용한다고 가정

export function drawLine(points, trafficArr) {
    if (!trafficArr || trafficArr.length === 0) {
        const pl = new Tmapv2.Polyline({
            path: points,
            strokeColor: "#DD0000",
            strokeWeight: 6,
            map
        });
        addPolylineClickListener(pl);
        routePolylines.push(pl);
        return;
    }

    const colorMap = { 0: "#06050D", 1: "#61AB25", 2: "#FFFF00", 3: "#E87506", 4: "#D61125" };
    let last = 0;
    trafficArr.forEach(seg => {
        const [s, e, idx] = seg;

        if (s > last) {
            const pl0 = new Tmapv2.Polyline({
                path: points.slice(last, s),
                strokeColor: "#06050D",
                strokeWeight: 6,
                map
            });
            addPolylineClickListener(pl0);
            routePolylines.push(pl0);
        }

        const pl1 = new Tmapv2.Polyline({
            path: points.slice(s, e + 1),
            strokeColor: colorMap[idx] || "#06050D",
            strokeWeight: 6,
            map
        });
        addPolylineClickListener(pl1);
        routePolylines.push(pl1);

        last = e + 1;
    });

    if (last < points.length) {
        const pl2 = new Tmapv2.Polyline({
            path: points.slice(last),
            strokeColor: "#06050D",
            strokeWeight: 6,
            map
        });
        addPolylineClickListener(pl2);
        routePolylines.push(pl2);
    }
}

export function addPolylineClickListener(pl) {
    pl.addListener("click", function (evt) {
        const pathObj = pl.getPath();
        const path = pathObj && pathObj.path ? pathObj.path : pathObj;
        if (!path || path.length === 0) {
            console.error("Polyline 경로가 비어있습니다.");
            return;
        }

        // 클릭된 좌표
        let clickLat, clickLon;
        if (evt.latLng) {
            clickLat = evt.latLng._lat;
            clickLon = evt.latLng._lng;
        } else {
            clickLat = path[0]._lat || path[0].lat;
            clickLon = path[0]._lng || path[0].lng;
        }

        fetchSpeedAtClickedLocation(clickLat, clickLon);

        // 속도 입력창 표시
        document.getElementById("speedInputContainer").style.display = "block";
        document.getElementById("speedResult").innerText = "";
        document.getElementById("userSpeed").value = "";
    });
}

// 경로 추천 (날씨 기반 위험도 계산)
export function drawRecommendedRoute(startX, startY, endX, endY, trafficInfo) {
    Promise.all(
        ["0", "2"].map(opt => fetchRouteRisk(startX, startY, endX, endY, opt, trafficInfo))
    ).then(results => {
        // (1) 최소 risk 찾기
        const minRisk = Math.min(...results.map(r => r.risk));
        const candidates = results.filter(r => r.risk === minRisk);
        // (2) 같은 risk가 여러 개면 totalTime 기준 정렬
        candidates.sort((a, b) => a.totalTime - b.totalTime);
        const best = candidates[0];

        // (3) 기존 경로 데이터 초기화
        resetRouteData();

        // (4) 화면에 맞도록 bounds 생성
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

        // (5) 지도 전체 화면에 맞추기
        map.fitBounds(bounds);

        // (6) 요약정보 출력
        const p0 = best.features[0].properties;
        document.getElementById("route_info").innerText =
            `🛣 거리: ${(p0.totalDistance / 1000).toFixed(1)}km | 🕒 ${(p0.totalTime / 60).toFixed(0)}분`;
    })
        .catch(err => {
            console.error("추천 경로 오류:", err);
            alert("추천 경로를 불러오는 중 오류가 발생했습니다.");
        });
}

// 최소 시간 경로 그리기 (Tmap 옵션 "19" 사용)
export function drawFastestRoute(startX, startY, endX, endY, trafficInfo) {
    searchAndDrawRoute(startX, startY, endX, endY, "19", trafficInfo);
}

// 사용자 입력에 따라 경로 그리기
export function drawRoute() {
    if (!window.startMarker || !window.endMarker) {
        return alert("지도에서 출발지와 도착지를 먼저 선택하세요.");
    }
    const opt = document.getElementById("selectLevel").value;
    const traf = document.getElementById("trafficInfo").value;
    const s = window.startMarker.getPosition(), e = window.endMarker.getPosition();

    if (opt === "0") {
        // 날씨 기준 추천 경로
        drawRecommendedRoute(s._lng, s._lat, e._lng, e._lat, traf);
    } else if (opt === "2") {
        // 최소시간 경로 (날씨 무시)
        drawFastestRoute(s._lng, s._lat, e._lng, e._lat, traf);
    } else {
        // 나머지 Tmap 기본 옵션
        searchAndDrawRoute(s._lng, s._lat, e._lng, e._lat, opt, traf);
    }
}

export function fitMapToRoute() {
    const bounds = new Tmapv2.LatLngBounds();
    (window.routePolylines || []).forEach(pl => {
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
    if (window.startMarker) bounds.extend(window.startMarker.getPosition());
    if (window.endMarker) bounds.extend(window.endMarker.getPosition());
    window.map.fitBounds(bounds);
}