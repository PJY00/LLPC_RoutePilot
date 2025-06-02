# oss_basic

- [Project summary](#RoutePilot)
  - [Purpose](#purpose)
  - [Requirements](#requirements)
  - [How to install](#how-to-install)
- [How to use](#how-to-use)
- [Version History](#version-history)
- [Contacts](#contacts)
- [License](#license)

---

### Project summary
* 프로젝젝트의 간단한 개요 소개

#### Purpose

오픈소스 기초 프로젝트

악천후 상황시 자율주행 자동차는 제어권을 운전자에게 넘겨준다. 즉, 자율주행의 기능을 하지 못한다.
따라서 Route Pilot은 악천후를 피하는 방향의 길을 제공하여 악천후 지역을 피하며 길을 찾는 네비게이션 제공 및 부가적인 기능을 시스템의 형태로 만들 수 있도록 제안하며 해당 레포지토리는 이 시스템을 자동차에 설치를 하지 못한 상태에서 기능을 확인할 수 있도록 시각적으로 표현하고 있다.

#### Requirements

* Python 3.13.2
* Flask 3.1.0
* flask-cors 5.0.1
* Jinja2 3.1.6
* Werkzeug 3.1.3
* python-dotenv 1.1.0
* requests 2.32.3
* click 8.1.8
* itsdangerous 2.2.0
* MarkupSafe 3.0.2


#### How to install

```sh
git clone https://github.com/PJY00/LLPC_RoutePilot.git
cd LLPC_RoutePilot
pip3 install -r requirements.txt
```
---

### How to use

이곳에는 완성되면 완성 네비게이션 화면 및 시각화 한 자료들, 어떻게 사용하면 되는지에 대하여 사진을 첨부하고 기술한다.
TODO
입력요소
-현재 위치
-목적지
-길찾기 조건 선택

출력 요소
-출발지와 도착지를 모두 포함하는 지도
-선택 조건으로 찾은 경로 표출
-현재 위치(고속도로일 때)의 제한속도 표기
-날씨정보 표출

---

### Version History

* v.0.1.0 : 개발중

---

### Contacts

박지영(팀장) - kdio@chungbuk.ac.kr

최희진 - osislanc2918@gmail.com

이진 - leejin3064@gmail.com

이은지 - hkum0987@naver.com

---

### License

MIT License
