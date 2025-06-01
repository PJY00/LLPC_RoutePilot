// distance.js
// └── calculateDistance: 지구 상 두 지점 간의 직선 거리(m) 계산

export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 지구 반지름 (m)
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // 미터 단위 반환
}
