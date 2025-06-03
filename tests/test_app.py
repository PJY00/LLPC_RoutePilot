import pytest
import json
import os
import requests
from datetime import datetime, timedelta

import RoutePilot.app as app_module
from RoutePilot.app import (
    app,
    load_speed_data,
    haversine,
    is_in_segment,
    latlon_to_grid,
    get_latest_base_time
)

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

# ---------------------------
# 1. 유틸 함수(Unit) 테스트
# ---------------------------

def test_load_speed_data_format():
    """load_speed_data()가 리스트를 반환하고, 내부 필드들이 올바른 타입으로 변환되었는지 확인"""
    data = load_speed_data()
    assert isinstance(data, list) and len(data) > 0

    sample = data[0]
    # CSV 헤더에 따라 변환된 키들이 존재하고, float으로 파싱되었는지 검증
    assert isinstance(sample['시점위도'], float)
    assert isinstance(sample['시점경도'], float)
    assert isinstance(sample['종점위도'], float)
    assert isinstance(sample['종점경도'], float)
    assert isinstance(sample['기점 방향 제한속도(kph)'], float)
    assert isinstance(sample['종점 방향 제한속도(kph)'], float)

def test_load_speed_data_file_missing(monkeypatch):
    """
    load_speed_data()가 CSV 파일을 찾지 못할 때 예외가 터지는지 확인.
    """
    # load_speed_data 함수 자체를 FileNotFoundError를 던지도록 덮어쓰기
    monkeypatch.setattr(app_module, 'load_speed_data',
                        lambda: (_ for _ in ()).throw(FileNotFoundError("파일 없음")))
    with pytest.raises(FileNotFoundError):
        _ = app_module.load_speed_data()

def test_haversine_same_point_zero():
    """haversine()에 같은 좌표를 넣으면 0m를 반환해야 함."""
    d = haversine(37.5665, 126.9780, 37.5665, 126.9780)
    assert abs(d) < 1e-6

def test_haversine_known_distance():
    """haversine() 함수가 알려진 두 점 사이 거리(서울 시청 ↔ 명동)를 대략 올바르게 계산하는지 확인"""
    # 서울 시청(37.5665, 126.9780), 명동(37.5605, 126.9850) 사이 대략 900m 내외
    dist = haversine(37.5665, 126.9780, 37.5605, 126.9850)
    assert 800 < dist < 1000

def test_is_in_segment_true_and_false():
    """is_in_segment()가 동일한 지점일 때 True, 먼 지점일 때 False 반환 확인"""
    # 동일 지점을 start/end로 정의 → tol=0이면 무조건 True
    row_same = {
        '시점위도': 37.0, '시점경도': 127.0,
        '종점위도': 37.0, '종점경도': 127.0
    }
    assert is_in_segment(37.0, 127.0, row_same, tol=0) is True

    # 완전히 다른 지점일 때 tol 작으면 False
    row_diff = {
        '시점위도': 37.0, '시점경도': 127.0,
        '종점위도': 38.0, '종점경도': 128.0
    }
    assert is_in_segment(35.0, 125.0, row_diff, tol=10) is False

def test_latlon_to_grid_consistency():
    """latlon_to_grid()가 항상 정수 쌍을 반환하고, 동일 입력 시 항상 같은 결과를 내는지 확인"""
    x1, y1 = latlon_to_grid(37.5665, 126.9780)
    x2, y2 = latlon_to_grid(37.5665, 126.9780)
    assert isinstance(x1, int) and isinstance(y1, int)
    assert (x1, y1) == (x2, y2)

def test_get_latest_base_time_edge_cases(monkeypatch):
    """get_latest_base_time()가 경계 시간에 올바른 base_time/base_date를 반환하는지 확인"""
    # 1) KST 2025-06-01 02:50일 때 → base_time = "0200"
    #    UTC = KST - 9h = 2025-05-31 17:50
    fake_utc = datetime(2025, 5, 31, 17, 50)
    class FakeDatetime:
        @classmethod
        def utcnow(cls):
            return fake_utc
    monkeypatch.setattr(app_module, 'datetime', FakeDatetime)
    base_date, base_time = get_latest_base_time()
    assert base_date == "20250601"
    assert base_time == "0200"

    # 2) KST 2025-06-01 00:30일 때 → forecast_hours 중 가장 가까운 과거 = 23:00 (전날)
    #    UTC = 2025-05-31 15:30
    fake_utc_2 = datetime(2025, 5, 31, 15, 30)
    class FakeDatetime2:
        @classmethod
        def utcnow(cls):
            return fake_utc_2
    monkeypatch.setattr(app_module, 'datetime', FakeDatetime2)
    base_date2, base_time2 = get_latest_base_time()
    assert base_date2 == "20250531"
    assert base_time2 == "2300"

def test_get_latest_base_time_parsing(monkeypatch):
    """
    get_latest_base_time() 내부에서 datetime.strptime 실패할 때
    예외가 발생하지 않고 올바른 범위(base_time)만 반환하는지 확인
    """
    # KST 시간을 강제로 특정 시점으로 설정(예: 12:00), parsing 로직 영향 없음
    fake_utc = datetime(2025, 6, 1, 12, 0)
    class FakeDT:
        @classmethod
        def utcnow(cls):
            return fake_utc
    monkeypatch.setattr(app_module, 'datetime', FakeDT)
    base_date, base_time = get_latest_base_time()
    # 12:00 기준으로 forecast_hours [2,5,8,11,14,17,20,23] → 11이 가장 가까운 과거
    assert base_time in ["1100", "1400", "1700", "2000", "2300"]

# ---------------------------
# 2. API 라우트 성공/실패 분기 테스트
# ---------------------------

def test_index(client):
    """메인 페이지 렌더링 확인 (템플릿이 정상적으로 반환되는지)"""
    response = client.get('/')
    assert response.status_code == 200
    # HTML 태그가 포함되어 있는지, 혹은 TMAP_KEY 문자열이 포함되어 있는지 확인
    assert b"<html" in response.data or b"Tmap" in response.data

def test_index_contains_tmap_key(client):
    """
    index()가 템플릿에 tmap_key 변수를 포함해서 렌더링하는지,
    HTML 내부에 TMAP_KEY 자바스크립트 변수가 존재하는지 검사
    """
    resp = client.get('/')
    body = resp.data.decode('utf-8')
    assert "const TMAP_KEY" in body

def test_about_and_help_rendering(client):
    """/about, /help 라우트가 정상적으로 HTML 반환되는지 확인"""
    resp1 = client.get('/about')
    assert resp1.status_code == 200
    assert b"<html" in resp1.data

    resp2 = client.get('/help')
    assert resp2.status_code == 200
    assert b"<html" in resp2.data

def test_speed_valid_and_invalid(client):
    """/speed 라우트의 정상/오류 케이스 테스트"""
    # 유효 좌표 전달 시 200, 'road' 또는 'message' 키 존재
    response_valid = client.get('/speed?lat=37.5665&lon=126.9780')
    assert response_valid.status_code == 200
    data_valid = response_valid.get_json()
    assert isinstance(data_valid, dict)
    assert 'road' in data_valid or 'message' in data_valid

    # 좌표 없이 호출 시 400, 'error' 키 존재
    response_invalid = client.get('/speed')
    assert response_invalid.status_code == 400
    data_invalid = response_invalid.get_json()
    assert data_invalid.get('error') is not None

def test_speed_exact_segment(client, monkeypatch):
    """
    /speed: start=end인 구간에 딱 맞춘 좌표 테스트
    """
    # speed_data 리스트 맨 앞에 “start=end”인 가짜 row 삽입
    fake_row = {
        '노선명': 'TEST_ROAD',
        '시점부': 'A',
        '종점부': 'A',
        '구간길이': '0',
        '기점 방향 제한속도(kph)': 50.0,
        '종점 방향 제한속도(kph)': 50.0,
        '시점위도': 37.0000,
        '시점경도': 127.0000,
        '종점위도': 37.0000,
        '종점경도': 127.0000
    }
    orig_data = app_module.speed_data
    monkeypatch.setattr(app_module, 'speed_data', [fake_row] + orig_data)

    resp = client.get('/speed?lat=37.0&lon=127.0')
    assert resp.status_code == 200
    d = resp.get_json()
    assert d['road'] == 'TEST_ROAD'
    assert d['speed_start'] == 50.0

def test_weather_missing_params(client):
    """/weather: 위도/경도 파라미터 누락 시 400 에러"""
    resp = client.post('/weather', json={})
    assert resp.status_code == 400
    assert resp.get_json().get('error') == "위치 정보가 없습니다."

def test_weather_api_fail(monkeypatch, client):
    """/weather: 기상청 API가 200이 아닌 상태 코드를 반환할 때 500 에러"""
    class BadResponse:
        status_code = 500
        text = "Error"
        def json(self):
            return {}
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: BadResponse())
    resp = client.post('/weather', json={"lat": 37.5, "lon": 127.0})
    assert resp.status_code == 500
    assert 'error' in resp.get_json()

def test_weather_no_items(monkeypatch, client):
    """/weather: items가 빈 리스트일 때 '기상 데이터가 없습니다.' 메시지 반환"""
    class NoItemsResponse:
        status_code = 200
        def json(self):
            return {"response": {"body": {"items": {"item": []}}}}
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: NoItemsResponse())
    resp = client.post('/weather', json={"lat": 37.5, "lon": 127.0})
    assert resp.status_code == 200
    assert resp.get_json().get('error') == "기상 데이터가 없습니다."

def test_weather_malformed_json(monkeypatch, client):
    """
    /weather: 기상청 API가 잘못된 JSON(예: item이 string)이 왔을 때
    예외 블록으로 빠져서 500 에러가 나는지 확인
    """
    class BadJSONResponse:
        status_code = 200
        def json(self):
            # items가 리스트가 아니라 string이어서 KeyError 발생
            return {"response": {"body": {"items": {"item": "not a list"}}}}
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: BadJSONResponse())
    res = client.post('/weather', json={"lat": 37.5, "lon": 127.0})
    assert res.status_code == 500
    assert 'error' in res.get_json()

def test_weather_mocked_success(monkeypatch, client):
    """/weather: 정상적인 기상 데이터 반환 경로 테스트"""
    def mock_requests_post(*args, **kwargs):
        class MockResponse:
            def __init__(self):
                self.status_code = 200
            def json(self):
                return {
                    "response": {
                        "body": {
                            "items": {
                                "item": [
                                    {"category": "POP", "fcstDate": "20240601", "fcstTime": "1200", "fcstValue": "60"},
                                    {"category": "PCP", "fcstDate": "20240601", "fcstTime": "1200", "fcstValue": "1.0mm"},
                                    {"category": "SNO", "fcstDate": "20240601", "fcstTime": "1200", "fcstValue": "0cm"}
                                ]
                            }
                        }
                    }
                }
        return MockResponse()

    monkeypatch.setattr(app_module.requests, "get", mock_requests_post)
    resp = client.post('/weather', json={"lat": 37.5, "lon": 127.0})
    assert resp.status_code == 200
    data = resp.get_json()
    assert all(key in data for key in ("pop", "pcp", "sno"))

def test_reverse_geocode_invalid(client):
    """/reverse-geocode: lon/lat 누락 시 400 에러"""
    response = client.post('/reverse-geocode', json={})
    assert response.status_code == 400
    assert response.get_json().get('error') == "lon/lat 파라미터가 필요합니다."

def test_reverse_geocode_partial_keys(monkeypatch, client):
    """
    /reverse-geocode: addressInfo에 일부 키가 누락된 JSON일 때,
    누락된 키는 None으로 반환되는지 확인
    """
    fake_json = {
        "addressInfo": {
            "city_do": "서울특별시",
            # "gu_gun" 누락
            "eup_myun": "Test-eup",
            # "roadName" 누락
            "buildingIndex": "123"
        }
    }
    class PartialResp:
        status_code = 200
        def json(self):
            return fake_json
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: PartialResp())
    res = client.post('/reverse-geocode', json={"lon": 126.9780, "lat": 37.5665})
    assert res.status_code == 200
    data = res.get_json()
    assert data['city_do'] == "서울특별시"
    # 누락된 필드는 None으로 내려와야 함
    assert data['gu_gun'] is None
    assert data['roadName'] is None

def test_reverse_geocode_success(monkeypatch, client):
    """/reverse-geocode: 정상적인 주소 정보 반환 경로 테스트"""
    fake_json = {
        "addressInfo": {
            "city_do": "서울특별시",
            "gu_gun": "중구",
            "eup_myun": "",
            "roadName": "세종대로",
            "buildingIndex": "1"
        }
    }
    class FakeResp:
        status_code = 200
        def json(self):
            return fake_json
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: FakeResp())
    resp = client.post('/reverse-geocode', json={"lon": 126.9780, "lat": 37.5665})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['city_do'] == "서울특별시"
    assert data['roadName'] == "세종대로"

def test_reverse_geocode_api_fail(monkeypatch, client):
    """/reverse-geocode: TMap API 실패 시 해당 상태 코드 반환하는지 확인"""
    class ErrorResp:
        status_code = 500
        text = "Error"
        def json(self):
            return {}
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: ErrorResp())
    resp = client.post('/reverse-geocode', json={"lon": 126.9780, "lat": 37.5665})
    assert resp.status_code == 500
    assert 'error' in resp.get_json()

def test_fulladdr_geocode_invalid(client):
    """/fulladdr-geocode: fullAddr 누락 시 400 에러"""
    response = client.post('/fulladdr-geocode', json={})
    assert response.status_code == 400
    assert 'error' in response.get_json()

def test_fulladdr_geocode_empty_result(monkeypatch, client):
    """
    /fulladdr-geocode: TMap API가 빈 JSON({})을 반환할 때,
    200 OK이지만 빈 dict가 반환되는지 확인
    """
    class EmptyResp:
        def raise_for_status(self): pass
        def json(self):
            return {}
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: EmptyResp())
    resp = client.post('/fulladdr-geocode', json={"fullAddr": "아무 주소"})
    assert resp.status_code == 200
    assert resp.get_json() == {}

def test_fulladdr_geocode_success(monkeypatch, client):
    """/fulladdr-geocode: 정상적인 전체 주소 -> 좌표 변환 경로 테스트"""
    fake_full = {"matchedAddress": "서울특별시 종로구 세종대로 1"}
    class FakeResp:
        def raise_for_status(self): pass
        def json(self):
            return fake_full
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: FakeResp())
    resp = client.post('/fulladdr-geocode', json={"fullAddr": "서울 종로구 세종대로 1"})
    assert resp.status_code == 200
    assert resp.get_json().get('matchedAddress') == "서울특별시 종로구 세종대로 1"

def test_fulladdr_geocode_error(monkeypatch, client):
    """/fulladdr-geocode: TMap API 호출 예외 시 500 에러"""
    def raise_exc(*args, **kwargs):
        raise requests.exceptions.RequestException("네트워크 오류")
    monkeypatch.setattr(app_module.requests, 'get', raise_exc)
    resp = client.post('/fulladdr-geocode', json={"fullAddr": "서울 종로구 세종대로 1"})
    assert resp.status_code == 500
    assert 'error' in resp.get_json()

def test_route_missing_params(client):
    """/route: start 또는 end 누락 시 400 에러"""
    resp = client.post('/route', json={})
    assert resp.status_code == 400
    assert 'error' in resp.get_json()

def test_route_non_linestring(monkeypatch, client):
    """
    /route: features 안에 LineString이 아닌 Point만 있을 때,
    coords는 빈 리스트, distance/time은 정상값으로 반환되는지 확인
    """
    fake_data = {
        "features": [
            {
                "geometry": {"type": "Point", "coordinates": [126.9780, 37.5665]},
                "properties": {"totalDistance": 1234, "totalTime": 600}
            }
        ]
    }
    class FakeResp:
        def raise_for_status(self): pass
        def json(self):
            return fake_data

    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: FakeResp())
    payload = {"start": {"lon": 126.9780, "lat": 37.5665}, "end": {"lon": 126.9790, "lat": 37.5670}}
    resp = client.post('/route', json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    # LineString이 없으므로 route는 빈 리스트, but 거리/시간은 첫 properties 기준
    assert data['route'] == []
    assert data['distance'] == 1234
    assert data['time'] == 10  # 600초 → 10분

def test_route_success(monkeypatch, client):
    """/route: 정상적인 경로 탐색 로직 검증"""
    fake_data = {
        "features": [
            {
                "geometry": {"type": "LineString", "coordinates": [[126.9780, 37.5665], [126.9790, 37.5670]]},
                "properties": {"totalDistance": 1000, "totalTime": 600}
            }
        ]
    }
    class FakeResp:
        def raise_for_status(self): pass
        def json(self):
            return fake_data

    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: FakeResp())
    payload = {"start": {"lon": 126.9780, "lat": 37.5665}, "end": {"lon": 126.9790, "lat": 37.5670}}
    resp = client.post('/route', json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data['route'], list) and len(data['route']) == 2
    assert data['distance'] == 1000
    assert data['time'] == 10  # 600초 → 10분

def test_route_no_features(monkeypatch, client):
    """/route: features가 빈 리스트일 때 404 에러"""
    class FakeResp:
        def raise_for_status(self): pass
        def json(self):
            return {"features": []}
    monkeypatch.setattr(app_module.requests, 'get', lambda *a, **k: FakeResp())
    payload = {"start": {"lon": 126.9780, "lat": 37.5665}, "end": {"lon": 126.9790, "lat": 37.5670}}
    resp = client.post('/route', json=payload)
    assert resp.status_code == 404
    assert 'error' in resp.get_json()

def test_route_api_exception(monkeypatch, client):
    """/route: TMap API 호출 예외 시 500 에러"""
    def raise_exc(*args, **kwargs):
        raise requests.exceptions.RequestException("Error")
    monkeypatch.setattr(app_module.requests, 'get', raise_exc)
    payload = {"start": {"lon": 126.9780, "lat": 37.5665}, "end": {"lon": 126.9790, "lat": 37.5670}}
    resp = client.post('/route', json=payload)
    assert resp.status_code == 500
    assert 'error' in resp.get_json()

# ---------------------------
# 3. Flask 기본 에러 핸들링 테스트
# ---------------------------

def test_undefined_endpoint_returns_404(client):
    """존재하지 않는 URL로 GET 요청 시 404 에러 확인"""
    resp = client.get('/no-such-endpoint')
    assert resp.status_code == 404

def test_method_not_allowed(client):
    """
    /speed 엔드포인트는 GET만 허용, POST로 요청하면 405 Method Not Allowed 발생하는지 확인
    """
    resp = client.post('/speed', json={"lat": 37.5, "lon": 127.0})
    assert resp.status_code == 405
