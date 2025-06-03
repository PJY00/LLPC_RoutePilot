// routeRisk.js
// └── fetchRouteRisk: Tmap 경로 API를 호출하여 
//     각 1km 구간마다 날씨(pcp)를 합산한 '리스크' 계산

import { calculateDistance } from '../utils/distance.js';

export function fetchRouteRisk(startX, startY, endX, endY, option, trafficInfo) {
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

                    // EPSG3857 → WGS84 좌표 변환
                    const pts = seg.geometry.coordinates.map(c => {
                        const p = new Tmapv2.Point(c[0], c[1]);
                        return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(p);
                    });

                    // 1km 구간마다 PCP 합산
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
                                weatherCache[key].then(d => {
                                    risk += parseFloat(d.pcp) || 0;
                                })
                            );
                        }
                    }
                });

                Promise.all(promises)
                    .then(() => resolve({ option, risk, features: res.features, totalTime: res.features[0]?.properties.totalTime }))
                    .catch(reject);
            },
            error: reject
        });
    });
}
