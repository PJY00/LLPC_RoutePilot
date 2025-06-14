# oss_basic

- [Project summary](#RoutePilot)
  - [Purpose](#purpose)
  - [Requirements](#requirements)
  - [How to install](#how-to-install)
- [How to use](#how-to-use)
  - [내비게이션 기능 설명](#내비게이션-기능-설명)
    - [현재 위치 입력 및 현재 위치에서의 날씨 확인](#현재-위치-입력-및-현재-위치에서의-날씨-확인)
    - [출발자와 도착지 입력](#출발자와-도착지-입력)
    - [탐색 옵션](#탐색-옵션)
    - [교통정보](#교통정보)
    - [경로 보기](#경로-보기)
    - [지도 레벨](#지도-레벨)
    - [고속도로 제한속도](#고속도로-제한속도)
    - [경로에서의 현재 위치 표시](#경로에서의-현재-위치-표시)
  - [NAV바](#nav바)
  - [About페이지](#about페이지)
  - [Help페이지](#help페이지)
- [Version History](#version-history)
- [Contacts](#contacts)
- [License](#license)

---

# Project summary
* 프로젝트의 간단한 개요 소개

## Purpose

오픈소스 기초 프로젝트

악천후 상황시 자율주행 자동차는 제어권을 운전자에게 넘겨준다. 즉, 자율주행의 기능을 하지 못한다.
따라서 Route Pilot은 악천후를 피하는 방향의 길을 제공하여 악천후 지역을 피하며 길을 찾는 내비게이션 제공 및 부가적인 기능을 시스템의 형태로 만들 수 있도록 제안하며 해당 레포지토리는 이 시스템을 자동차에 설치를 하지 못한 상태에서 기능을 확인할 수 있도록 시각적으로 표현하고 있다.

## Requirements

* blinker==1.9.0
* certifi==2025.4.26
* charset-normalizer==3.4.2
* click==8.2.1
* colorama==0.4.6
* coverage==7.8.2
* Flask==3.1.1
* geographiclib==2.0
* geopy==2.4.1
* idna==3.10
* iniconfig==2.1.0
* itsdangerous==2.2.0
* Jinja2==3.1.6
* MarkupSafe==3.0.2
* packaging==25.0
* pluggy==1.6.0
* pytest==8.3.5
* pytest-cov==6.1.1
* python-dotenv==1.1.0
* requests==2.32.3
* urllib3==2.4.0
* Werkzeug==3.1.3



## How to install

```sh
git clone https://github.com/PJY00/LLPC_RoutePilot.git
cd LLPC_RoutePilot
pip3 install -r requirements.txt
```
---

# How to use

## 내비게이션 기능 설명
Route Pilot은 날씨(강수량 및 강설량)기반의 내비게이션을 제공합니다.

해당 내비게이션의 주요 기능들에 관련된 설명들은 아래의 목차들을 누르시면 알맞는 설명을 보실 수 있습니다.
  - [현재 위치 입력 및 현재 위치에서의 날씨 확인](#현재-위치-입력-및-현재-위치에서의-날씨-확인)
  - [출발지와 도착지 입력](#출발지와-도착지-입력)
  - [탐색 옵션](#탐색-옵션)
  - [교통정보](#교통정보)
  - [경로 보기](#경로-보기)
  - [지도 레벨](#지도-레벨)
  - [고속도로 제한속도](#고속도로-제한속도)
  - [경로에서의 현재 위치 표시](#경로에서의-현재-위치-표시)

### 현재 위치 입력 및 현재 위치에서의 날씨 확인
  ![nowpoint](RoutePilot/static/images/nowstatus.png)

현재 위치(GPS)를 받아 지도의 기본 화면을 현재 위치로 지정합니다. 또한 현재 위치에서의 강수 확률, 강수량, 강설량의 정보를 표시합니다.

### 출발지와 도착지 입력
![start-1](RoutePilot/static/images/start-click.png)
![start-2](RoutePilot/static/images/start-map.png)

**현재 위치를 출발지로** : 클릭하면 현재 위치를 출발지로 설정합니다. 동시에 출발 주소란에 현재 위치의 도로명 주소가 입력됩니다. 출발지에 마커가 찍히며 해당 마커의 밑에는 현재 위치의 강수 확률이 이모티콘으로 작게 나타납니다.

![end-1](RoutePilot/static/images/end-click.png)
<img src="RoutePilot/static/images/end-map.png" width="340">


**도착지 적용** : 도착지 주소 입력란에 도로명 주소 혹은 일반 주소(예-서울시청)를 입력하고 도착지 적용 버튼 클릭하면 도착지로 해당 주소가 도착지로 설정됩니다. 도착지로 설정이 되면 해당 주소에 마커가 찍히며 주소지로 화면이 이동됩니다. 아래의 사진과 같이 주소 자동 완성 기능이 추가되어 있다.

<img src="https://private-user-images.githubusercontent.com/163852701/451348776-4c1319ba-f17c-41fb-bb38-58035b744334.png?jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NDkxMDA1NDIsIm5iZiI6MTc0OTEwMDI0MiwicGF0aCI6Ii8xNjM4NTI3MDEvNDUxMzQ4Nzc2LTRjMTMxOWJhLWYxN2MtNDFmYi1iYjM4LTU4MDM1Yjc0NDMzNC5wbmc_WC1BbXotQWxnb3JpdGhtPUFXUzQtSE1BQy1TSEEyNTYmWC1BbXotQ3JlZGVudGlhbD1BS0lBVkNPRFlMU0E1M1BRSzRaQSUyRjIwMjUwNjA1JTJGdXMtZWFzdC0xJTJGczMlMkZhd3M0X3JlcXVlc3QmWC1BbXotRGF0ZT0yMDI1MDYwNVQwNTEwNDJaJlgtQW16LUV4cGlyZXM9MzAwJlgtQW16LVNpZ25hdHVyZT0xY2Q4ZGMyNTdmNGE2YjFjZGM4MzJkNDhjZDY5Mzk3ODA0MjVkYjU4YjAzOTMzNzE0Y2UxMzcwYmRmNTc2MzJlJlgtQW16LVNpZ25lZEhlYWRlcnM9aG9zdCJ9.QB9KEWeC9x6EU6yoVy50hWL0YDWZ4cmy31UMsUnr-MU" width="400">

### 탐색 옵션
![option](RoutePilot/static/images/option.png)


탐색 옵션에서는 추천경로와 최소시간 경로 중 원하는 옵션을 사용자가 선택할수 있습니다.

**교통최적+추천** - 출발지에서 도착지로 향하는 경로 중 강수량이 최대한 적은 경로를 안내합니다. 시간이 다소 걸릴 수 있습니다.

**교통최적+최소시간** - 강수량(강설량)은 무시하고 도착지에서 출발지로 향하는 경로 중 가장 시간이 적게 걸리는 경로를 안내합니다.

### 교통정보
![tinfo](RoutePilot/static/images/trafficinfo.png)


교통정보는 포함과 미포함을 사용자가 선택할 수 있습니다.

**포함** - 경로(폴리라인)에 실시간 교통정보를 확인 할 수 있습니다. 초록색은 원활, 노랑색은 보통, 빨간색은 혼잡을 나타냅니다.

**미포함** - 경로에 교통정보를 나타내지 않고 붉은 색으로만 경로를 표시합니다.

### 경로 보기
![routemap](RoutePilot/static/images/routemap.png)


경로보기 버튼을 누르면 사용자가 선택한 탐색옵션과 교통정보를 토대로 경로 탐색 및 교통정보를 처리합니다. 한 지도 화면 안에 모든 경로가 포함됩니다.

### 지도 레벨
사용자가 임의로 확대 및 축소할 수 있습니다. 또한 지도를 이동하는 등의 일반적인 지도 기능을 모두두 사용할 수 있습니다.

### 고속도로 제한속도
![mapspeed](RoutePilot/static/images/mapspeed.png)
![overs](RoutePilot/static/images/overspeed.png)
![corrects](RoutePilot/static/images/correctspeed.png)

Route Pilot은 한국도로공사에서 제공하는 고속도로에서의 제한속도를 제공합니다. 표시된 경로 위를 클릭했을 때, 만약 클릭한 위치가 고속도로 위라면 해당 고속도로의 제한속도를 지도 하단에 제공합니다. 또한 이 기능을 시험할 수 있도록 클릭했을 때 지도 상단에 현재속도를 사용자가 지정할 수 있도록 해 두었습니다. 만약 사용자가 입력한 속도가 제한속도보다 높다면 경고의 메시지를, 적절한 속도라면 확인의 메시지를 제공합니다. 강수량 적설량에 따라 감속량이 조절됩니다.

### 경로에서의 현재 위치 표시
자동차 아이콘이 클릭한 위치에 찍히며 해당 위치에 도달하기 위해 지나갈 경로를 지도에 표시합니다. 해당 기능은 고속도로 제한 속도의 기능에 부가적인 기능으로 추가하였습니다.

## NAV바
![프로젝트 로고](RoutePilot/static/images/RPlogo.png)

RoutePilot아이콘을 누르면 내비게이션을 보여주는 페이지(이하 main페이지라고 서술)로 이동 가능합니다. 이동할 때 내비게이션의 기능은 초기화되니 주의해주세요.

<img src="RoutePilot/static/images/navbar.png" width="300">

드롭다운(Dropdown)기능을 이용하여 about페이지와 help페이지에 어떤 요소들이 있는지 한 눈에 볼 수 있도록 구성하였습니다.

## About페이지
<img src="RoutePilot/static/images/aboutpage.png" width="450">

팀원들의 깃헙 페이지를 접속할수 있도록 연동하였습니다. 프로젝트를 작성한 팀원들의 다른 레포지토리도 확인해 보세요. 또한 프로젝트를 소개 내용을 해당 페이지가 포함하고 있습니다. 이 외에도 사용한 언어와 API내용 등을 포함하고 있으니 관심 있으시다면 구경하세요.

## Help페이지
<img src="RoutePilot/static/images/helppage.png" width="450">

Route Pilot 사용에 대한 정보가 간략히 나와있습니다.

---

# Version History

* v.0.1.0 

---
# Contacts

박지영(팀장) - kdio@chungbuk.ac.kr

 : CSS, NAV바, 기초 스켈레톤 구조, [주소 자동완성 리스트, 강수량에 따른 속도 감속 권장] 기능 구현, 오류 수정

최희진 - osislanc2918@gmail.com

 : [현재 위치 입력 및 현재 위치에서의 날씨 확인, 출발자와 도착지 입력, 탐색 옵션, 교통정보, 경로 보기, 지도 레벨, 고속도로 제한속도, 경로에서의 현재 위치 표시] 기능 구현, 코드 통합, 오류 수정, README문서 정리

이진 - leejin3064@gmail.com

 : About페이지 구현, 실시간 경로 표시 기능 추가, 오류 수정

이은지 - hkum0987@naver.com

 : Help페이지 구현, main page 속도계 구현, 오류 수정

---

# License

MIT License
