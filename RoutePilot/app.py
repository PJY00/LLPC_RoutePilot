from flask import Flask, render_template, request, jsonify
import os, requests
from dotenv import load_dotenv
from datetime import datetime, timedelta
import math

app = Flask(__name__)
load_dotenv()

KMA_KEY = os.getenv("KMA_API_KEY")
print(">>> KMA 키:", KMA_KEY)
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

# 기상청 API에 맞는 가장 최신 base_time 구하기
def get_latest_base_time():
    kst_now = datetime.utcnow() + timedelta(hours=9)
    forecast_hours = [2, 5, 8, 11, 14, 17, 20, 23]

    for h in reversed(forecast_hours):
        if kst_now.hour > h or (kst_now.hour == h and kst_now.minute >= 45):
            base_date = kst_now.strftime("%Y%m%d")
            base_time = f"{h:02}30"
            return base_date, base_time

    # 이른 새벽이면 전날 23:30 예보
    yesterday = kst_now - timedelta(days=1)
    return yesterday.strftime("%Y%m%d"), "2330"

@app.route("/")
def index():
    return render_template("index.html", kakao_key=KAKAO_KEY)

@app.route("/weather", methods=["GET", "POST"])
def weather():
    try:
        data = request.get_json()
        print(">>> 받은 좌표:", data)

        if not data or "lat" not in data or "lon" not in data:
            return jsonify({"error": "위치 정보가 없습니다."}), 400

        lat, lon = data["lat"], data["lon"]
        x, y = latlon_to_grid(lat, lon)

        # 예보 시간 계산
        base_date, base_time_str = get_latest_base_time()
        print(f">>> 요청 base_date: {base_date}, base_time: {base_time_str}")

        url = "http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
        params = {
            "serviceKey": KMA_KEY,
            "numOfRows": "10000",
            "pageNo": "1",
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time_str,
            "nx": x,
            "ny": y,
        }

        res = requests.get(url, params=params)
        print(">>> KMA API 호출 URL:", res.url)
        print(">>> KMA 응답 상태 코드:", res.status_code)

        if res.status_code != 200:
            print(">>> KMA API 요청 실패:", res.text)
            return jsonify({"error": "기상청 API 호출 실패"}), 500

        json_data = res.json()
        items = json_data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
        print(">>> 받은 날씨 데이터 개수:", len(items))

        # 가장 가까운 예보 시간대의 POP, PCP, SNO 추출
        target_items = {"POP": None, "PCP": None, "SNO": None}
        min_diff = {"POP": float("inf"), "PCP": float("inf"), "SNO": float("inf")}
        current_datetime = datetime.utcnow() + timedelta(hours=9)

        for item in items:
            category = item["category"]
            if category in target_items:
                fcst_dt_str = item["fcstDate"] + item["fcstTime"]
                try:
                    fcst_dt = datetime.strptime(fcst_dt_str, "%Y%m%d%H%M")
                    diff = abs((fcst_dt - current_datetime).total_seconds())
                    if diff < min_diff[category]:
                        min_diff[category] = diff
                        target_items[category] = item["fcstValue"]
                except Exception as parse_error:
                    print(">>> 날짜 파싱 에러:", parse_error)

        result = {
            "pop": target_items["POP"],
            "pcp": target_items["PCP"],
            "sno": target_items["SNO"]
        }

        print(">>> 최종 날씨 응답 데이터:", result)
        return jsonify(result)

    except Exception as e:
        print(">>> 서버 에러 발생:", e)
        return jsonify({"error": "서버 에러", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
