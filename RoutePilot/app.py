from flask import Flask, render_template, request, jsonify
import os, requests
from dotenv import load_dotenv
from datetime import datetime, timedelta
import math

app = Flask(__name__)
load_dotenv()

KMA_KEY = os.getenv("KMA_API_KEY")
KAKAO_KEY = os.getenv("KAKAO_JS_KEY")

# 위도, 경도를 격자(x, y)로 변환
def latlon_to_grid(lat, lon):
    RE = 6371.00877
    GRID = 5.0
    SLAT1 = 30.0
    SLAT2 = 60.0
    OLON = 126.0
    OLAT = 38.0
    XO = 43
    YO = 136

    DEGRAD = math.pi / 180.0
    re = RE / GRID
    slat1 = SLAT1 * DEGRAD
    slat2 = SLAT2 * DEGRAD
    olon = OLON * DEGRAD
    olat = OLAT * DEGRAD

    sn = math.tan(math.pi * 0.25 + slat2 * 0.5) / math.tan(math.pi * 0.25 + slat1 * 0.5)
    sn = math.log(math.cos(slat1) / math.cos(slat2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + slat1 * 0.5)
    sf = math.pow(sf, sn) * math.cos(slat1) / sn
    ro = math.tan(math.pi * 0.25 + olat * 0.5)
    ro = re * sf / math.pow(ro, sn)

    ra = math.tan(math.pi * 0.25 + lat * DEGRAD * 0.5)
    ra = re * sf / math.pow(ra, sn)
    theta = lon * DEGRAD - olon
    if theta > math.pi: theta -= 2.0 * math.pi
    if theta < -math.pi: theta += 2.0 * math.pi
    theta *= sn

    x = int(ra * math.sin(theta) + XO + 0.5)
    y = int(ro - ra * math.cos(theta) + YO + 0.5)
    return x, y

@app.route("/")
def index():
    return render_template("index.html", kakao_key=KAKAO_KEY)

@app.route("/weather", methods=["POST"])
def weather():
    try:
        data = request.get_json()
        print(">>> 받은 좌표:", data)

        if not data or "lat" not in data or "lon" not in data:
            return jsonify({"error": "위치 정보가 없습니다."}), 400

        lat, lon = data["lat"], data["lon"]
        x, y = latlon_to_grid(lat, lon)

        base_time = datetime.utcnow() + timedelta(hours=9)
        if base_time.minute < 40:
            base_time -= timedelta(hours=1)
        base_date = base_time.strftime("%Y%m%d")
        base_time_str = base_time.strftime("%H") + "30"

        url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst"
        params = {
            "serviceKey": KMA_KEY,
            "numOfRows": "10",
            "pageNo": "1",
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time_str,
            "nx": x,
            "ny": y,
        }

        res = requests.get(url, params=params)
        print(">>> KMA 응답 상태 코드:", res.status_code)
        if res.status_code != 200:
            print(">>> KMA API 요청 실패:", res.text)
            return jsonify({"error": "기상청 API 호출 실패"}), 500

        json_data = res.json()
        items = json_data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
        print(">>> 받은 날씨 데이터:", items)

        result = {}
        for item in items:
            if item["category"] == "T1H":
                result["temp"] = item["obsrValue"]
            elif item["category"] == "REH":
                result["humidity"] = item["obsrValue"]
            elif item["category"] == "PTY":
                code = str(item["obsrValue"])
                rain_types = {
                    "0": "없음", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기"
                }
                result["rain_type"] = rain_types.get(code, "알 수 없음")

        print(">>> 최종 날씨 응답 데이터:", result)
        return jsonify(result)

    except Exception as e:
        print(">>> 서버 에러 발생:", e)
        return jsonify({"error": "서버 에러", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
