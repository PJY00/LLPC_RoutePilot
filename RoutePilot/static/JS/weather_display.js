function updateSpeedDashboardWithWeather() {
    const speedElement = document.getElementById("speed");

    if (!window.marker_ || !window.currentSpeedLimit) {
        console.warn("마커 또는 제한속도 정보가 없습니다.");
        speedElement.textContent = "0";
        return;
    }

    const lat = window.marker_.getPosition()._lat;
    const lon = window.marker_.getPosition()._lng;

    fetch("/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon })
    })
    .then(res => res.json())
    .then(data => {
        const rainStr = data.pcp || "0";
        const snowStr = data.sno || "0";

        let rain = parseFloat(rainStr.replace("mm", "").trim());
        let snow = parseFloat(snowStr.replace("cm", "").trim());

        if (isNaN(rain)) rain = 0;
        if (isNaN(snow)) snow = 0;

        let reduction = 0;
        if (snow >= 5) {
            reduction = 0.4;
        } else if (snow >= 1) {
            reduction = 0.25;
        } else if (rain >= 10) {
            reduction = 0.3;
        } else if (rain >= 5) {
            reduction = 0.2;
        } else if (rain >= 1) {
            reduction = 0.1;
        }

        const originalLimit = window.currentSpeedLimit;
        const recommended = Math.round(originalLimit * (1 - reduction));

        // 대시보드에 표시
        speedElement.textContent = recommended.toString();
    })
    .catch(err => {
        console.error("속도 표시 중 날씨 데이터 오류:", err);
        speedElement.textContent = "0";
    });
}
