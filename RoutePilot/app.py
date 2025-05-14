from flask import Flask, render_template, request, jsonify
import os, requests
from dotenv import load_dotenv, find_dotenv
from datetime import datetime, timedelta
import math,csv
from geopy.distance import geodesic

app = Flask(__name__)
load_dotenv(find_dotenv())

KMA_KEY = os.getenv("KMA_API_KEY")
TMAP_KEY = os.getenv("TMAP_JS_KEY")
KAKAO_REST_KEY = os.getenv("KAKAO_REST_KEY")
print("✅ KMA_KEY:", KMA_KEY)
print("✅ TMAP_KEY:", TMAP_KEY)

def load_speed_data():
    """
    data/speed_data.csv 파일을 읽어 구간별 속도 및 좌표 정보를 로드합니다.
    CSV 열: 노선명,시점부,종점부,구간길이,기점 방향 제한속도(kph),종점 방향 제한속도(kph),시점 위도,시점 경도,종점 위도,종점 경도
    """
    data = []
    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'speed.csv')
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # 문자열을 적절히 변환
            row['시점위도'] = float(row['시점위도'])
            row['시점경도'] = float(row['시점경도'])
            row['종점위도'] = float(row['종점위도'])
            row['종점경도'] = float(row['종점경도'])
            row['기점 방향 제한속도(kph)'] = float(row['기점 방향 제한속도(kph)'])
            row['종점 방향 제한속도(kph)'] = float(row['종점 방향 제한속도(kph)'])
            data.append(row)
    return data

speed_data = load_speed_data()

def haversine(lat1, lon1, lat2, lon2):
    """두 좌표 간 거리를 미터 단위로 계산합니다."""
    R = 6371000  # 지구 반경 (m)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def is_in_segment(lat, lon, row, tol=50):
    """
    사용자 좌표(lat, lon)가 row에 정의된 구간 위에 있는지 판단 (tol: 오차 허용치 m).
    geodesic() 으로 거리를 계산해, (사용자→시점부)+(사용자→종점부) 합이 구간 전체 거리와 tol 이내면 그 위에 있다고 봅니다.
    """
    start = (row['시점위도'], row['시점경도'])
    end   = (row['종점위도'], row['종점경도'])
    user  = (lat, lon)

    # 사용자→시점부, 사용자→종점부, 시점부→종점부
    d1 = geodesic(user, start).meters
    d2 = geodesic(user, end).meters
    total = geodesic(start, end).meters

    return abs((d1 + d2) - total) <= tol

#이후 이거 확인을 위해서 클릭시 위치가 찍히는 거 만들어서 그 장소의 제한 속도를 볼 수 있도록 해야함.
@app.route('/speed', methods=['GET'])
def speed():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    if lat is None or lon is None:
        return jsonify({'error': 'lat와 lon 파라미터가 필요합니다.'}), 400

    for row in speed_data:
        if is_in_segment(lat, lon, row):
            return jsonify({
                'road': row['노선명'],
                'start': row['시점부'],
                'end': row['종점부'],
                'speed_start': row['기점 방향 제한속도(kph)'],
                'speed_end': row['종점 방향 제한속도(kph)']
            })
    return jsonify({'message': '해당 위치의 제한속도 정보를 찾을 수 없습니다.'}), 200

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

@app.route('/')
def index():
    return render_template("index.html", tmap_key=TMAP_KEY)

@app.route("/weather", methods=["POST"])
def weather():
    try:
        data = request.get_json()
        if not data or "lat" not in data or "lon" not in data:
            return jsonify({"error": "위치 정보가 없습니다."}), 400

        lat, lon = data["lat"], data["lon"]
        print(f">>> 받은 위도: {lat}, 경도: {lon}")

        x, y = latlon_to_grid(lat, lon)
        print(f">>> 변환된 격자 좌표: x={x}, y={y}")

        base_date, base_time_str = get_latest_base_time()
        print(f">>> 기준 날짜(base_date): {base_date}, 기준 시간(base_time): {base_time_str}")

        url = f"http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"
        params = {
            "serviceKey":KMA_KEY,
            "numOfRows": "10000",
            "pageNo": "1",
            "dataType": "JSON",
            "base_date": base_date,
            "base_time": base_time_str,
            "nx": x,
            "ny": y,
        }

        res = requests.get(url, params=params)
        print(">>> 기상청 API 요청 URL:", res.url)
        print(">>> 응답 상태 코드:", res.status_code)
        print(">>> 응답 본문:", res.text)

        if res.status_code != 200:
            print(">>> 기상청 API 호출 실패:", res.text)
            return jsonify({"error": "기상청 API 호출 실패"}), 500

        json_data = res.json()
        items = json_data.get("response", {}).get("body", {}).get("items", {}).get("item", [])
        print(f">>> 받은 날씨 데이터 개수: {len(items)}개")

        if not items:
            return jsonify({"error": "기상 데이터가 없습니다."})

        target_items = {"POP": None, "PCP": None, "SNO": None}
        min_diff = {k: float("inf") for k in target_items}
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
        #print(">>> 최종 날씨 응답 데이터:", result)
        return jsonify(result)

    except Exception as e:
        print(">>> 서버 에러 발생:", e)
        return jsonify({"error": "서버 에러", "message": str(e)}), 500

@app.route("/reverse-geocode", methods=["POST"])
def reverse_geocode():
    data = request.get_json()
    lon = data.get("lon")
    lat = data.get("lat")
    if lon is None or lat is None:
        return jsonify({"error": "lon/lat 파라미터가 필요합니다."}), 400

    url = "https://apis.openapi.sk.com/tmap/geo/reversegeocoding"
    params = {
        "version": 1,
        "format": "json",
        "lon": lon,
        "lat": lat,
        "coordType": "WGS84GEO",
        "addressType": "A10"
    }
    headers = {"appKey": TMAP_KEY}

    res = requests.get(url, headers=headers, params=params)
    if res.status_code != 200:
        return jsonify({"error": "TMap API 호출 실패"}), res.status_code

    data = res.json()
    # 주소 정보만 리턴 (불필요한 데이터 제외)
    info = data.get("addressInfo", {})
    return jsonify({
        "city_do":    info.get("city_do"),
        "gu_gun":     info.get("gu_gun"),
        "eup_myun":   info.get("eup_myun"),
        "roadName":   info.get("roadName"),
        "buildingIndex": info.get("buildingIndex")
    })

@app.route("/fulladdr-geocode", methods=["POST"])
def fulladdr_geocode():
    fullAddr = request.json.get("fullAddr")
    if not fullAddr:
        return jsonify({"error": "Missing address"}), 400

    url = "https://apis.openapi.sk.com/tmap/geo/fullAddrGeo"
    headers = { "appKey": TMAP_KEY }
    params = {
        "version": 1,
        "format": "json",
        "coordType": "WGS84GEO",
        "fullAddr": fullAddr
    }

    try:
        res = requests.get(url, headers=headers, params=params)
        res.raise_for_status()
        return jsonify(res.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route("/route", methods=["POST"])
def route():
    data = request.get_json()
    # 1) 요청 파라미터 검증
    start = data.get("start")
    end   = data.get("end")
    if not start or not end:
        return jsonify({"error": "start/end 파라미터가 필요합니다."}), 400

    # 2) Tmap 경로탐색 API 호출
    url = "https://apis.openapi.sk.com/tmap/routes"
    params = {
        "version":     "1",
        "format":      "json",
        "appKey":      TMAP_KEY,
        # 클라이언트에서 넘어온 좌표
        "startX":      start["lon"],
        "startY":      start["lat"],
        "endX":        end["lon"],
        "endY":        end["lat"],
        # 좌표 타입을 모두 WGS84GEO로 → 서버에서 별도 변환 불필요
        "reqCoordType":"WGS84GEO",
        "resCoordType":"WGS84GEO",
        # 필요에 따라 클라이언트에서 searchOption, trafficInfo 전달 가능
        "searchOption": data.get("searchOption", "0"),
        "trafficInfo":  data.get("trafficInfo", "N")
    }
    try:
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        j = resp.json()
    except Exception as e:
        return jsonify({"error": "Tmap 경로 API 호출 실패", "detail": str(e)}), 500

    feats = j.get("features", [])
    if not feats:
        return jsonify({"error": "경로 데이터를 찾을 수 없습니다."}), 404

    # 3) LineString 좌표 추출 (lat, lon 순서로)
    coords = []
    for seg in feats:
        geom = seg.get("geometry", {})
        if geom.get("type") == "LineString":
            for x, y in geom.get("coordinates", []):
                coords.append({"lat": y, "lon": x})

    # 4) 요약 정보 꺼내기
    prop0 = feats[0]["properties"]
    distance = prop0.get("totalDistance", 0)         # 미터
    time_min = round(prop0.get("totalTime", 0) / 60)  # 분 단위로 반올림

    return jsonify({
        "route":    coords,
        "distance": distance,
        "time":     time_min
    })

@app.route('/about')
def about():
    return render_template("about.html")

@app.route('/help')
def help():
    return render_template("HowToUse.html")

if __name__ == "__main__":
    app.run(debug=True)
