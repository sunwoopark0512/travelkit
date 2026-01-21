# TravelKit - 여행 필수품 체크리스트 앱

<!-- SSOT-SUMMARY-START -->
> **SSoT Status**: VibeCoding Console (Updated: 2026-01-20)
>
> **Success Metrics**:
> - Iteration 로그가 100% 남는다
> - needs-action 항목이 콘솔에서 즉시 식별된다
> - SSoT 변경 시 README 요약이 자동 갱신된다
> - main 푸시마다 Docs가 GitHub Pages에 배포된다
>
> **Core Features**:
> - Obsidian DataviewJS 운영 콘솔
> - SSoT 단일 기준 문서
> - MkDocs 자동 배포
<!-- SSOT-SUMMARY-END -->

## 프로젝트 개요

**TravelKit**은 개인 및 소규모 팀을 위한 스마트 여행 물품 관리 및 체크 도구입니다.

## 📋 목차

- [프로젝트 개요](#프로젝트-개요)
- [프로젝트 소개](#프로젝트-소개)
- [실행 환경](#실행-환경)
- [의존성 및 설치 명령](#의존성-및-설치-명령)
- [상세 실행 단계](#상세-실행-단계)
- [데이터베이스 설정](#데이터베이스-설정)
- [백엔드 설정 및 실행](#백엔드-설정-및-실행)
- [미니프로그램 설정 및 실행](#미니프로그램-설정-및-실행)
- [기능 사용 가이드](#기능-사용-가이드)
- [자주 묻는 질문](#자주-묻는-질문)
- [기술 지원](#기술-지원)

---

## 📖 프로젝트 소개

**TravelKit**은 스마트 여행 물품 관리 앱으로, 사용자에게 다음 기능을 제공합니다:
- 📝 여행 일정 생성 및 관리
- ✅ 스마트 물품 체크리스트 생성
- 🔍 실시간 물품 휴대 여부 확인
- 👥 다인 협업 여행 지원
- 📊 여행 통계 정보 조회

### 기술 스택

- **백엔드**: Spring Boot + MyBatis + MySQL
- **프론트엔드**: WeChat 미니프로그램
- **데이터베이스**: MySQL 5.7+

---

## 🔧 실행 환경

### 필수 소프트웨어

1. **MySQL 5.7+** 또는 **MySQL 8.0+**
   - 다운로드: https://dev.mysql.com/downloads/mysql/
   - MySQL 서비스가 실행 중인지 확인

2. **JDK 1.8+** 또는 **JDK 11+ (JDK17 권장)**
   - 다운로드: https://www.oracle.com/java/technologies/downloads/
   - JAVA_HOME 환경 변수 설정

3. **Maven 3.6+**
   - 다운로드: https://maven.apache.org/download.cgi
   - MAVEN_HOME 환경 변수 설정

4. **WeChat 개발자 도구**
   - 다운로드: https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
   - 최신 안정 버전 사용

5. **Node.js 16+ (선택)**
   - 추가 프론트엔드 빌드 도구나 스크립트 사용 시 필요

6. **Python 3.8+ (선택)**
   - 향후 데이터 분석이나 스크립트 처리에 사용 가능

### 환경 확인

#### MySQL 확인
```bash
mysql --version
# 예: mysql  Ver 8.0.xx for Win64 on x86_64
```

#### Java 확인
```bash
java -version
# 예: java version "1.8.0_xxx" 또는 "11.0.x"
```

#### Maven 확인
```bash
mvn -version
# Maven 버전 및 Java 버전 정보 표시
```

---

## 📦 의존성 및 설치 명령

본 프로젝트는 **백엔드(Spring Boot)**와 **WeChat 미니프로그램 프론트엔드** 두 부분으로 구성됩니다.

### 백엔드 의존성 (Maven 관리)

주요 의존성:

- `spring-boot-starter-web`: 웹 및 REST 인터페이스 지원
- `spring-boot-starter-test`: 단위 테스트
- `mysql-connector-java`: MySQL 드라이버
- `mybatis-spring-boot-starter`: MyBatis 영속성 프레임워크
- `druid-spring-boot-starter`: Druid 데이터 소스 연결 풀
- `lombok`: 엔티티 클래스 코드 간소화
- `knife4j-spring-boot-starter`: API 문서 (Swagger 향상)

모든 의존성은 Maven이 자동으로 다운로드합니다.

**설치 명령:**

```bash
cd new-backend
# 의존성 다운로드 및 컴파일
mvn clean install -DskipTests
```

프로젝트 실행만 할 경우:

```bash
cd new-backend
mvn dependency:resolve
```

### 미니프로그램 프론트엔드 의존성

본 프로젝트는 **네이티브 WeChat 미니프로그램** 기술 스택을 사용합니다:

- npm 패키지 관리자 의존 없음
- `npm install` 불필요
- 모든 코드는 WeChat 개발자 도구로 직접 컴파일 및 실행

WeChat 개발자 도구를 설치하고 `last-mini-program` 디렉토리를 열면 됩니다.

---

## 🧭 상세 실행 단계

### 단계 1: 기본 환경 설치

1. **MySQL 5.7+ / 8.0+** 설치 및 실행
2. **JDK 8+ / 11+ / 17 (JDK17 권장)** 설치, `JAVA_HOME` 설정
3. **Maven 3.6+** 설치
4. **WeChat 개발자 도구** 설치
5. (선택) Node.js 16+, Python 3.8+ 설치

### 단계 2: 데이터베이스 가져오기 (123.sql 사용)

1. 커맨드라인/터미널 열기:
   ```bash
   mysql -u root -p
   ```
2. MySQL에서 데이터베이스 생성:
   ```sql
   CREATE DATABASE IF NOT EXISTS check
     DEFAULT CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```
3. 커맨드라인에서 `123.sql` 가져오기:
   ```bash
   mysql -u root -p check < new-backend/sql/123.sql
   ```
4. 선택: 클라이언트 도구(Navicat / Workbench)로 동일한 `123.sql` 파일 가져오기

### 단계 3: 백엔드 데이터베이스 연결 설정

1. 파일 열기: `new-backend/src/main/resources/application.yml`
2. 로컬 MySQL 설정에 맞게 수정:
   ```yaml
   spring:
     datasource:
       druid:
         username: root          # 실제 사용자명으로 수정
         password: MySQL비밀번호   # 실제 비밀번호로 수정
         driver-class-name: com.mysql.cj.jdbc.Driver
         url: jdbc:mysql://localhost:3306/check?serverTimezone=Asia/Shanghai&useUnicode=true&characterEncoding=utf8
   ```
3. 파일 저장

### 단계 4: 의존성 다운로드 및 백엔드 실행

1. 커맨드라인에서 백엔드 디렉토리로 이동:
   ```bash
   cd new-backend
   ```
2. 의존성 다운로드 및 컴파일 (첫 실행 시 필수):
   ```bash
   mvn clean install -DskipTests
   ```
3. 백엔드 서비스 실행:
   ```bash
   mvn spring-boot:run
   ```
4. 콘솔에 다음이 표시되면 실행 성공:
   - `Started CheckApplication ...`
   - `Tomcat started on port(s): 8080`  
   백엔드가 `http://localhost:8080`에서 정상 실행 중
5. 브라우저에서 `http://localhost:8080/doc.html` 접속  
   API 문서가 열리면 백엔드가 정상 작동 중

### 단계 5: 미니프로그램 API 주소 설정

1. 파일 열기: `last-mini-program/utils/api.js`
2. 확인 또는 수정:
   ```javascript
   const BASE_URL = 'http://localhost:8080'; // 백엔드 API 주소
   ```
3. 백엔드가 다른 주소나 포트에서 실행 중이면 실제 주소로 수정

### 단계 6: WeChat 개발자 도구 설정

1. **WeChat 개발자 도구** 열기
2. 왼쪽 상단 **"프로젝트 가져오기"** 클릭:
   - 프로젝트 디렉토리: `last-mini-program` 선택
   - AppID: 테스트 계정 또는 정식 미니프로그램 AppID 사용
3. 가져오기 성공 후, 오른쪽 상단 **"상세정보"** 클릭:
   - **"로컬 설정"** 탭에서 체크:  
     **✅ 합법 도메인, web-view(비즈니스 도메인), TLS 버전 및 HTTPS 인증서 검증 안함**
4. 도구 모음에서 **"컴파일"** 버튼 클릭, 시뮬레이터에서 미니프로그램 실행 대기

### 단계 7: 연동 및 로그인 테스트

1. 백엔드 콘솔에 오류가 없고, 포트 `8080`이 리스닝 상태인지 확인
2. WeChat 개발자 도구에서:
   - **"디버거" → "Network"** 패널 열기
   - 로그인 페이지로 돌아가 약관 동의, **"WeChat 인증 로그인"** 또는 **"게스트 모드"** 클릭
3. Network 패널 확인:
   - 요청 주소가 `http://localhost:8080/api/...`인지 확인
   - HTTP 200 반환 및 비즈니스 데이터 확인
4. 로그인 성공 후, 홈페이지와 일정 목록에서 데이터 표시 정상 여부 확인

이로써 프로젝트(데이터베이스 + 백엔드 + 미니프로그램) 전체 과정을 완료할 수 있습니다.

---

## 💾 데이터베이스 설정

### 1단계: 데이터베이스 가져오기

#### 방법 1: 커맨드라인 사용 (권장)

1. **커맨드라인(Windows) 또는 터미널(Mac/Linux) 열기**

2. **MySQL 로그인**
   ```bash
   mysql -u root -p
   ```
   MySQL 비밀번호 입력

3. **데이터베이스 생성 (존재하지 않을 경우)**
   ```sql
   CREATE DATABASE IF NOT EXISTS check DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **MySQL 종료**
   ```sql
   exit;
   ```

5. **데이터베이스 파일 가져오기**
   ```bash
   mysql -u root -p check < 123.sql
   ```
   MySQL 비밀번호 입력, 가져오기 완료 대기

#### 방법 2: MySQL 클라이언트 도구 사용

1. **Navicat, phpMyAdmin 또는 MySQL Workbench 열기**

2. **MySQL 서버에 연결**

3. **데이터베이스 생성**
   - 데이터베이스명: `check`
   - 문자셋: `utf8mb4`
   - 정렬 규칙: `utf8mb4_unicode_ci`

4. **SQL 파일 가져오기**
   - 데이터베이스 `check` 선택
   - "가져오기" 또는 "Execute SQL File" 클릭
   - `123.sql` 파일 선택
   - 가져오기 실행

### 2단계: 데이터베이스 확인

가져오기 성공 여부 확인:

```sql
USE check;

-- 모든 테이블 보기
SHOW TABLES;

-- 13개의 테이블이 있어야 함:
-- users, trips, items, item_categories, item_overview,
-- trip_templates, template_items, cooperative_trips,
-- cooperative_trip_members, cooperative_items,
-- cooperative_item_checks, cooperative_trip_invites, check_history

-- 사용자 수 확인
SELECT COUNT(*) FROM users;

-- 일정 수 확인
SELECT COUNT(*) FROM trips;
```

### 데이터베이스 설정 정보

- **데이터베이스명**: `check`
- **문자셋**: `utf8mb4`
- **포트**: `3306` (기본값)
- **사용자명**: `root` (상황에 따라 수정)
- **비밀번호**: 실제 상황에 맞게 설정

---

## 🚀 백엔드 설정 및 실행

### 1단계: 데이터베이스 연결 설정

1. **백엔드 설정 파일 열기**
   ```
   new-backend/src/main/resources/application.yml
   ```

2. **데이터베이스 설정 수정**
   ```yaml
   spring:
     datasource:
       druid:
         username: root               # MySQL 사용자명으로 수정
         password: MySQL비밀번호       # MySQL 비밀번호로 수정
         driver-class-name: com.mysql.cj.jdbc.Driver
         url: jdbc:mysql://localhost:3306/check?serverTimezone=Asia/Shanghai&useUnicode=true&characterEncoding=utf8
   ```

   **중요**: `password`를 실제 MySQL 비밀번호로 수정하세요!

### 2단계: 백엔드 서비스 실행

#### 방법 1: Maven 명령 사용 (권장)

1. **커맨드라인에서 백엔드 프로젝트 디렉토리로 이동**
   ```bash
   cd new-backend
   ```

2. **Spring Boot 애플리케이션 실행**
   ```bash
   mvn spring-boot:run
   ```

3. **실행 완료 대기**
   - `Started CheckApplication in X.XXX seconds` 표시되면 실행 성공
   - 백엔드 서비스: `http://localhost:8080`

#### 방법 2: IDE 사용 (IntelliJ IDEA / Eclipse)

1. **프로젝트 가져오기**
   - IDE 열기, `File` -> `Open` 선택
   - `new-backend` 디렉토리 선택

2. **Maven 의존성 다운로드 완료 대기**

3. **메인 클래스 실행**
   - `com.example.check.CheckApplication.java` 찾기
   - 우클릭 -> `Run 'CheckApplication'`

### 3단계: 백엔드 서비스 확인

1. **API 문서 접속**
   - 브라우저에서 `http://localhost:8080/doc.html` 접속
   - Knife4j API 문서 인터페이스가 보여야 함

2. **API 인터페이스 테스트**
   ```bash
   # 사용자 목록 API 테스트
   curl http://localhost:8080/api/users/page?pageNum=1&pageSize=10
   ```

3. **실행 로그 확인**
   - 오류 정보가 없는지 확인
   - `Tomcat started on port(s): 8080` 표시 확인

### 백엔드 설정 정보

- **서비스 포트**: `8080`
- **API 기본 경로**: `/api`
- **API 문서**: `http://localhost:8080/doc.html`

---

## 📱 미니프로그램 설정 및 실행

### 1단계: API 주소 설정

1. **미니프로그램 API 설정 파일 열기**
   ```
   last-mini-program/utils/api.js
   ```

2. **BASE_URL 설정 확인**
   ```javascript
   // 4번째 줄, BASE_URL 확인:
   const BASE_URL = 'http://localhost:8080';
   ```

   **참고**: 백엔드가 다른 주소에서 실행 중이면 해당 주소로 수정

### 2단계: WeChat 개발자 도구 설정

1. **WeChat 개발자 도구 열기**

2. **프로젝트 가져오기**
   - "+" -> "프로젝트 가져오기" 클릭
   - 프로젝트 디렉토리: `last-mini-program` 선택
   - AppID: "테스트 계정" 선택 또는 본인의 미니프로그램 AppID 사용
   - 프로젝트명: TravelKit

3. **중요 설정 - 로컬 설정**
   - 오른쪽 상단 **"상세정보"** 버튼 클릭
   - **"로컬 설정"** 탭으로 전환
   - ✅ **체크** "합법 도메인, web-view(비즈니스 도메인), TLS 버전 및 HTTPS 인증서 검증 안함"
   
   **이 단계는 매우 중요합니다!** 체크하지 않으면 로컬 백엔드 서비스에 연결할 수 없습니다.

### 3단계: 미니프로그램 실행

1. **프로젝트 컴파일**
   - 도구 모음에서 **"컴파일"** 버튼 클릭
   - 또는 단축키 `Ctrl + B` (Windows) 또는 `Cmd + B` (Mac)

2. **콘솔 확인**
   - **"디버거"** -> **"Console"** 열어 로그 확인
   - 빨간색 오류 정보가 없는지 확인

3. **네트워크 요청 테스트**
   - **"디버거"** -> **"Network"** 열기
   - 로그인 시도, 네트워크 요청이 발생하는지 확인

### 미니프로그램 프로젝트 구조

```
last-mini-program/
├── app.js              # 미니프로그램 진입점 파일
├── app.json            # 미니프로그램 설정 파일
├── app.wxss           # 전역 스타일
├── pages/             # 페이지 디렉토리
│   ├── login/         # 로그인 페이지
│   ├── home/          # 홈페이지
│   ├── trip-list/     # 일정 목록
│   └── ...
├── utils/             # 유틸리티 함수
│   ├── api.js         # API 인터페이스 래핑
│   └── auth.js        # 인증 유틸리티
└── components/        # 컴포넌트 디렉토리
```

---

## 🎯 기능 사용 가이드

### 1. 사용자 로그인

#### WeChat 로그인
1. 미니프로그램 열어 로그인 페이지로 이동
2. "이용약관 및 개인정보 처리방침에 동의합니다" 체크
3. "WeChat 인증 로그인" 클릭
4. 시스템이 자동으로 WeChat 로그인 자격 증명을 받아 로그인 완료

#### 게스트 모드
1. 로그인 페이지에서 "게스트 모드" 클릭
2. 인증 없이 바로 시스템 진입
3. 기능 제한됨, WeChat 로그인 권장

### 2. 일정 생성

1. **일정 목록 진입**
   - 하단 네비게이션 바에서 "일정" 클릭
   - 또는 홈페이지에서 진입

2. **새 일정 생성**
   - "+" 또는 "일정 생성" 버튼 클릭
   - 일정 정보 입력:
     - 일정명
     - 목적지
     - 시작 날짜
     - 종료 날짜
     - 인원 수
     - 일정 유형
     - 예산 범위
     - 특별 요구사항

3. **물품 체크리스트 선택**
   - 템플릿에서 생성 가능
   - 물품 수동 추가 가능
   - 물품 개요에서 선택 가능

### 3. 물품 관리

#### 물품 추가
1. 일정 상세 페이지로 이동
2. "물품 추가" 클릭
3. 카테고리 선택 또는 물품 개요에서 선택
4. 물품명 및 메모 입력
5. 우선순위 설정 (높음/중간/낮음)

#### 물품 카테고리
- 증빙류: 신분증, 여권, 비자 등
- 의류: 옷, 신발, 액세서리 등
- 전자기기: 휴대폰, 충전기, 카메라 등
- 세면용품: 칫솔, 치약, 세안제 등
- 의약품: 상비약, 응급용품
- 식품류: 간식, 물, 즉석식품
- 기타: 기타 물품

### 4. 체크 기능

#### 체크 시작
1. 일정 상세 페이지로 이동
2. "체크 시작" 버튼 클릭
3. 시스템이 체크 모드로 진입

#### 물품 체크
1. 체크 페이지에서 물품을 하나씩 확인
2. 물품 오른쪽의 체크박스를 클릭하여 "휴대함"으로 표시
3. 불필요한 물품은 건너뛰기 가능
4. 실시간으로 체크 진행률 확인

#### 체크 완료
1. 체크 완료 후, "체크 완료" 클릭
2. 체크 결과 통계 확인
3. 체크 기록 열람 가능

### 5. 협업 일정

#### 협업 일정 생성
1. 일정 목록에서 "협업 일정 생성" 클릭
2. 일정 정보 입력
3. 생성 후 다른 사용자 초대 가능

#### 멤버 초대
1. 협업 일정 상세 페이지로 이동
2. "멤버 초대" 클릭
3. 초대 링크 또는 단축 코드 생성
4. 다른 사용자에게 공유

#### 협업 일정 참여
1. 초대 링크 또는 단축 코드로 참여
2. 또는 초대 QR코드 스캔
3. 참여 후 일정 물품 조회 및 편집 가능

#### 협업 체크
- 각 멤버가 독립적으로 자신의 물품 체크
- 실시간으로 다른 멤버의 체크 진행률 확인
- 멤버 간 물품 분배 지원

### 6. 일정 템플릿

#### 템플릿 사용
1. 일정 생성 시 "템플릿에서 생성" 선택
2. 공개 템플릿 탐색
3. 적합한 템플릿 선택
4. 일정 및 물품 체크리스트 자동 생성

#### 템플릿 생성
1. "일정 템플릿" 페이지로 이동
2. "템플릿 생성" 클릭
3. 템플릿 정보 입력
4. 물품 체크리스트 추가
5. 공개 여부 선택

### 7. 개인 센터

#### 개인 정보 보기
- 아바타, 닉네임, 성별, 생일
- 자기소개
- 사용자 유형 (일반 사용자/관리자)

#### 개인 정보 편집
1. "마이" 페이지로 이동
2. "정보 편집" 클릭
3. 개인 정보 수정
4. 변경 사항 저장

#### 통계 정보 보기
- 총 일정 수
- 완료된 일정 수
- 총 여행 일수
- 체크 완료율

### 8. 관리자 기능

#### 사용자 관리
- 전체 사용자 목록 보기
- 사용자 비활성화/활성화
- 사용자 권한 수정

#### 템플릿 심사
- 심사 대기 중인 템플릿 보기
- 템플릿 승인/거부
- 심사 사유 보기

---

## ❓ 자주 묻는 질문

### 데이터베이스 관련 문제

#### Q1: 데이터베이스 가져오기 시 "Access denied" 오류
**A:** MySQL 사용자명과 비밀번호가 올바른지 확인하고, 데이터베이스 생성 권한이 있는지 확인하세요.

#### Q2: 가져오기 후 테이블이 비어있음
**A:** SQL 파일이 완전한지 확인하고, 가져오기 과정에서 오류가 없었는지 확인하세요. MySQL 오류 로그를 확인할 수 있습니다.

#### Q3: 문자 인코딩 오류
**A:** 데이터베이스와 테이블이 모두 `utf8mb4` 문자셋을 사용하도록 설정하세요.

### 백엔드 관련 문제

#### Q1: 백엔드 실행 실패, 데이터베이스 연결 오류
**A:**
1. MySQL 서비스가 실행 중인지 확인
2. `application.yml`의 데이터베이스 설정이 올바른지 확인
3. 데이터베이스 `check`가 존재하는지 확인
4. 사용자명과 비밀번호가 올바른지 확인

#### Q2: 포트 8080이 이미 사용 중
**A:**
1. `application.yml`에서 `server.port`를 다른 포트(예: 8081)로 수정
2. 동시에 미니프로그램 `api.js`의 `BASE_URL`도 수정

#### Q3: Maven 의존성 다운로드 실패
**A:**
1. 네트워크 연결 확인
2. Maven 미러 소스 설정 (알리바바 클라우드 미러)
3. Maven 캐시 정리: `mvn clean`

### 미니프로그램 관련 문제

#### Q1: 미니프로그램이 백엔드에 연결 불가, "url not in domain list" 오류
**A:**
1. "합법 도메인 검증 안함"이 체크되어 있는지 확인 (개발자 도구 -> 상세정보 -> 로컬 설정)
2. `api.js`의 `BASE_URL`이 `http://localhost:8080`인지 확인
3. 개발자 도구를 완전히 닫았다가 다시 열기

#### Q2: 로그인 실패, "인증되지 않음" 오류
**A:**
- 이것은 정상입니다. 새 버전의 WeChat 미니프로그램은 사용자 정보 인증이 필요하지 않습니다
- 이용약관에 동의하면 로그인됩니다

#### Q3: 페이지가 빈 화면으로 표시되거나 오류 발생
**A:**
1. 콘솔 오류 정보 확인
2. 백엔드 서비스가 정상 실행 중인지 확인
3. 네트워크 요청이 성공했는지 확인
4. 미니프로그램 재컴파일 시도

#### Q4: 계정 전환 테스트 불가
**A:**
1. 로그인 페이지에서 현재 로그인된 계정 표시
2. "계정 전환" 버튼 클릭
3. 또는 "마이" 페이지에서 "로그아웃" 클릭

### 기능 관련 문제

#### Q1: 다른 계정으로 테스트하려면?
**A:**
1. 로그인 페이지에서 "계정 전환" 클릭
2. 또는 WeChat 개발자 도구에서 캐시 삭제
3. 다른 WeChat 계정으로 다시 로그인

#### Q2: 데이터베이스 초기화하려면?
**A:**
```bash
# SQL 파일 다시 가져오기
mysql -u root -p check < 123.sql
```

#### Q3: API 문서 보려면?
**A:**
- 백엔드 서비스 실행 후, 접속: `http://localhost:8080/doc.html`

---

## 🔍 디버깅 팁

### 백엔드 디버깅

1. **로그 보기**
   - 백엔드 실행 시 콘솔에 로그 출력
   - 오류 정보 및 스택 트레이스 확인

2. **API 테스트**
   - Postman 또는 curl로 API 테스트
   - `http://localhost:8080/doc.html`에서 API 문서 확인

3. **데이터베이스 쿼리**
   - MySQL 클라이언트로 데이터 확인
   - 데이터가 올바른지 검증

### 미니프로그램 디버깅

1. **콘솔 보기**
   - 개발자 도구의 "디버거" -> "Console" 열기
   - JavaScript 오류 및 로그 확인

2. **네트워크 요청 보기**
   - "디버거" -> "Network" 열기
   - 요청 URL, 매개변수, 응답 데이터 확인

3. **스토리지 보기**
   - "디버거" -> "Storage" 열기
   - 로컬에 저장된 사용자 정보 및 토큰 확인

---

## 📞 기술 지원

### 프로젝트 구조

```
Travelkit/
├── new-backend/          # 백엔드 프로젝트
│   ├── src/             # 소스 코드
│   ├── pom.xml          # Maven 설정
│   └── sql/             # SQL 스크립트
│       └── 123.sql      # 전체 데이터베이스 스크립트
└── last-mini-program/   # 미니프로그램 프로젝트
    ├── pages/           # 페이지
    ├── utils/           # 유틸리티 함수
    └── app.json         # 미니프로그램 설정
```

### 중요 파일 설명

- **데이터베이스 스크립트**: `new-backend/sql/123.sql` - 전체 데이터베이스 구조 및 데이터 포함
- **백엔드 설정**: `new-backend/src/main/resources/application.yml` - 데이터베이스 연결 설정
- **API 설정**: `last-mini-program/utils/api.js` - 백엔드 API 주소 설정
- **미니프로그램 설정**: `last-mini-program/app.json` - 미니프로그램 페이지 및 tabBar 설정

### 빠른 확인 체크리스트

프로젝트 실행 전 확인사항:

- [ ] MySQL 서비스 실행 중
- [ ] 데이터베이스 `check` 생성 및 데이터 가져오기 완료
- [ ] `application.yml`에서 데이터베이스 비밀번호 수정 완료
- [ ] 백엔드 서비스 실행 중 (http://localhost:8080)
- [ ] WeChat 개발자 도구에서 "합법 도메인 검증 안함" 체크됨
- [ ] `api.js`의 `BASE_URL` 올바르게 설정됨

---

## 📝 버전 정보

- **데이터베이스 버전**: MySQL 5.7+
- **백엔드 프레임워크**: Spring Boot 2.x
- **미니프로그램 기반 라이브러리**: 2.10.4+
- **문서 버전**: v1.0

---

## 🎉 시작하기

위의 단계를 따라 설정을 완료하면, TravelKit 미니프로그램을 사용할 수 있습니다!

1. ✅ 데이터베이스 `123.sql` 가져오기
2. ✅ 백엔드 서비스 설정 및 실행
3. ✅ 미니프로그램 설정 및 실행
4. ✅ WeChat 로그인 또는 게스트 모드로 로그인
5. ✅ 일정 생성하고 사용 시작!

**즐거운 여행 되세요!** 🚀

---

*문제가 있으면 "자주 묻는 질문" 섹션을 확인하거나 로그 정보를 검토하세요.*
