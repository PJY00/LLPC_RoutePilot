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

    async function updateWeather() {
        try {
            const response = await fetch("/weather", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    lat: 37.5665, // 기본 좌표 (서울)
                    lon: 126.9780
                })
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

    setInterval(() => {
        updateWeather();
    }, 3000);
});
