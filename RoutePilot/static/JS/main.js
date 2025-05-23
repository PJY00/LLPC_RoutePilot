// 1단계: 기본 경로 저장용 배열 생성
let globalRouteCoords = [];
function drawLine(points, trafficArr) {
    globalRouteCoords.push(...points);
    const pl = new Tmapv2.Polyline({ path: points, strokeColor: "#DD0000", strokeWeight: 6, map: map });
    routePolylines.push(pl);
}