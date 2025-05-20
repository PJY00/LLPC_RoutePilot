document.addEventListener("DOMContentLoaded", () => {
    const weatherIcon = document.getElementById("weather-icon");
    const weatherInfo = document.getElementById("weather-info");

    const weatherIcons = {
        sunny: "🌞",
        cloudy: "☁️",
        rainy: "🌧️",
        snowy: "❄️",
        foggy: "🌫️"
    };

    async function updateWeather(lat, lon) {
        try {
            const response = await fetch("/weather", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ lat, lon })
            });

            const data = await response.json();
            const { weather, temperature } = data;

            let condition = "맑음";
            if (weather.includes("비")) condition = "비";
            else if (weather.includes("눈")) condition = "눈";
            else if (weather.includes("구름")) condition = "흐림";

            weatherIcon.textContent = 
                condition === "비" ? weatherIcons.rainy :
                condition === "눈" ? weatherIcons.snowy :
                condition === "흐림" ? weatherIcons.cloudy :
                weatherIcons.sunny;

            weatherInfo.textContent = `${condition} | ${temperature}°C`;
        } catch (error) {
            weatherInfo.textContent = "날씨 정보 로딩 실패";
        }
    }
    //실시간 위치 추적
     if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                updateWeather(lat, lon);
            },
            (error) => {
                weatherInfo.textContent = "위치 추적 실패";
                console.error("위치 추적 실패", error);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 5000
            }
        );
    }
    //수동으로 날씨 좌표 설정할 경우
    window.setCoordinates = function(lat, lon){
        updateWeather(startLat, startLon);
    }
});