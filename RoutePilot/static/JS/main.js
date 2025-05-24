
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
// ... [중략] ...
// 페이지 로드 후 실행
window.onload = initMapAndWeather;

// [Step 1] 전역 변수 추가
let globalRouteCoords = [];
let liveRouteLine = null;
let carMarker = null;