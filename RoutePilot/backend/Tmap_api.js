const axios = require('axios');
const fs = require('fs');

// 예시 좌표 (자신의 위치에 맞게 수정)
const latitude = 37.5665;   // 서울 위도
const longitude = 126.9780; // 서울 경도

// 발급받은 AppKey
const appKey = '';

// SK Open API의 지도 관련 엔드포인트 예시 (문서 참고하여 수정)
const url = `https://apis.openapi.sk.com/tmap/staticMap?version=1&centerLon=${longitude}&centerLat=${latitude}&zoom=15&width=600&height=400&format=png&appKey=${appKey}`;

axios.get(url, {
    responseType: 'arraybuffer'
})