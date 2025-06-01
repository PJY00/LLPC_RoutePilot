// routeSearch.js
// └── searchAndDrawRoute: 일반 Tmap 경로 검색 후 그리기
// └── resetRouteData: 기존에 그려진 경로·마커 초기화

import { fitMapToRoute } from './routeDraw.js';
// 전역(global) 경로 좌표 배열
window.globalRouteCoords = window.globalRouteCoords || [];

export function resetRouteData() {
    // 기존에 그렸던 모든 폴리라인과 마커를 지도에서 제거
    (window.routePolylines || []).forEach(pl => pl.setMap(null));
    (window.routeMarkers || []).forEach(m => m.setMap(null));
    // 배열 초기화
    window.routePolylines = [];
    window.routeMarkers = [];
}

export function searchAndDrawRoute(startX, startY, endX, endY, searchOption, trafficInfo) {
    // 1) 이전 경로/마커 초기화
    resetRouteData();
    window.globalRouteCoords = [];

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
                    // EPSG3857 → WGS84 변환
                    const pts = seg.geometry.coordinates.map(c => {
                        const p = new Tmapv2.Point(c[0], c[1]);
                        return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    });

                    // 전역 경로 좌표에 추가
                    pts.forEach(pt => window.globalRouteCoords.push(pt));
                    // bounds 추가
                    pts.forEach(pt => bounds.extend(pt));
                    // 경로 그리기 (교통정보 포함)
                    const trafficArr = (trafficInfo === "Y") ? seg.geometry.traffic : [];
                    window.drawLine(pts, trafficArr);
                } else {
                    // 포인트 타입 (출발/도착 지점)
                    const p = new Tmapv2.Point(seg.geometry.coordinates[0], seg.geometry.coordinates[1]);
                    const cp = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    bounds.extend(cp);
                }
            });

            // 전체 경로 보이도록 지도 확대/이동
            window.map.fitBounds(bounds);
            fitMapToRoute();

            // 요약정보 출력
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
