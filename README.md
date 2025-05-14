# oss_basic

### Used Language-Python3.13.2

---
현재 README는 이후 수정할 예정입니다. 현재의 내용은 커밋 규칙을 보여주기 위한 내용입니다.

### 커밋 규칙

모든 커밋 메시지는 영어로 작성한다.  
동사형 구분 단어와 간단한 설명으로 이루어지게 하며 둘은 빈 칸으로 구분한다(" ")  
설명은 40자 이내로 제한한다.  
동사형 단어는 대문자로 작성하고 설명문의 첫 글자는 대문자, 나머지는 소문자로 작성한다.  
설명부분에는 문제점이나 바뀐요소를 이해하기 쉽고 간단한 형식으로 작성한다.  

Pull Request와 Issue의 내용은 한국어와 영어 두 내용을 모두 포함해야 한다.

#### 이용할 동사형 단어
ADD-이미지 혹은 파일을 새로 추가하였을 때 사용한다.  
FEAT-새로운 기능을 추가하였을 때 사용한다.  
FIX-오류나 버그를 수정하였을 때 사용한다.  
REF-기존 코드를 리팩토링하거나 개선했을 때 사용한다.  
CHORE-설정 파일 수정, 빌드 관련 작업 등 코드 수정이 아닌 유지보수와 관련된 변경사항이 있을 경우 사용한다.  

---
#### 예시

ADD Image of the logo  
FEAT Function of navigate in the road  
FIX Fix the bug in making map  
REF Delete the useless method  
CHORE Update the gitignore  

---


임시보관

127.0.0.1 - - [14/May/2025 14:19:12] "GET /speed?lat=36.62518120491803&lon=127.45757259016392 HTTP/1.1" 404 -
127.0.0.1 - - [14/May/2025 14:19:19] "GET / HTTP/1.1" 200 -
127.0.0.1 - - [14/May/2025 14:19:20] "GET /static/CSS/nav.css HTTP/1.1" 304 -
127.0.0.1 - - [14/May/2025 14:19:20] "GET /static/JS/main.js HTTP/1.1" 304 -        
127.0.0.1 - - [14/May/2025 14:19:20] "GET /speed?lat=36.62518120491803&lon=127.45757259016392 HTTP/1.1" 404 -
>>> 받은 위도: 36.62518120491803, 경도: 127.45757259016392
>>> 변환된 격자 좌표: x=68, y=106
>>> 기준 날짜(base_date): 20250514, 기준 시간(base_time): 1130
>>> 기상청 API 요청 URL: http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=6btho4zDh2O2ygQRePbgdQFgfa%252BWiojmF1VSqplCuvedRHOo2EtKUz19stQML5bnJ9zS2De1qEEc3X4dXlbu8w%253D%253D&numOfRows=10000&pageNo=1&dataType=JSON&base_date=20250514&base_time=1130&nx=68&ny=106
>>> 응답 상태 코드: 200
>>> 응답 본문: <OpenAPI_ServiceResponse>
        <cmmMsgHeader>
                <errMsg>SERVICE ERROR</errMsg>
                <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>  
                <returnReasonCode>30</returnReasonCode>
        </cmmMsgHeader>
</OpenAPI_ServiceResponse>
>>> 서버 에러 발생: Expecting value: line 1 column 1 (char 0)
127.0.0.1 - - [14/May/2025 14:19:20] "POST /weather HTTP/1.1" 500 -

날씨관련 오류 메시지임

날씨 데이터의 개수를 줄이는 것이 속도를 올리는 방법일 듯. 필요한 정보(강수확률, 강수량, 강설량)만 가져오자