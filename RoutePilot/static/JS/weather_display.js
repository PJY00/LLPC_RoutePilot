document.addEventListener("DOMContentLoaded", () => {

    const speedDisplay = document.getElementById("speed");

    let currentSpeed = 0;

    //실시간 위치 추적
     if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                //속도 정보가 있으면 표시시
                const speedKmH = Math.round(speed * 3.6);
                speedDisplay.textContent = `Speed ${speedKmH} km/h`;
            },
            (error) => {
                speedDisplay.textContent = "Speed 정보 없음";
            }
        );
    } else {
        speedDisplay.textContent = "Speed 정보 없음";
    }
});