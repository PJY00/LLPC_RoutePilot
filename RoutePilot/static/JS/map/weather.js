// weather.js
// └── updateWeather: 서버의 /weather 엔드포인트에 POST 요청을 보내
//    현재 위경도 기준 날씨 정보를 받아 지도 위 마커와 InfoWindow에 표시

export function updateWeather(lat, lon) {
    fetch("/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon })
    })
        .then(res => {
            if (!res.ok) throw new Error(`서버 오류: ${res.status}`);
            return res.json();
        })
        .then(data => {
            if (data.error) {
                document.getElementById("weather_info").innerText = "날씨 데이터를 불러오지 못했습니다.";
                console.error("날씨 데이터 오류:", data.error);
                return;
            }

            // 날씨 정보 텍스트 출력
            const text = `🌧 강수확률: ${data.pop}% | 🌂 강수량: ${data.pcp}mm | ❄️ 강설량: ${data.sno}mm`;
            document.getElementById("weather_info").innerText = text;

            // 기존 marker 가 있으면 제거
            if (marker) {
                marker.setMap(null);
                marker = null;
            }
            // 새 마커 생성
            const position = new Tmapv2.LatLng(lat, lon);
            marker = new Tmapv2.Marker({
                position,
                map,
                icon: "/static/images/marker.png",
                iconSize: new Tmapv2.Size(24, 24)
            });

            // InfoWindow 표시
            new Tmapv2.InfoWindow({
                position,
                content: `<div style="padding:5px; background:white; border-radius:8px;">🌧 ${data.pop || "?"}%</div>`,
                type: 2,
                map
            });
        })
        .catch(error => {
            console.error("날씨 정보 요청 오류:", error);
            document.getElementById("weather_info").innerText = "날씨 데이터를 불러오지 못했습니다.";
        });
}
