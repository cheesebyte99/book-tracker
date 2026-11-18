# 내 책장 · 독서 정리

읽은 책과 읽고 싶은 책을 정리하는 휴대폰용 독서 기록 웹앱입니다.
파일 하나(`index.html`)로 동작하고, 기록은 서버가 아니라 **이 기기 브라우저(IndexedDB)** 에만 저장됩니다.
(예전 `localStorage` 기록은 처음 열 때 자동으로 옮겨집니다 — 사진·사진첩 포함)

- 앱: https://cheesebyte99.github.io/book-tracker/
- 원본: `book-tracker/book_tracker_app.html` (로컬 폴더의 같은 앱)
- 함께 쓰는 캘린더: https://cheesebyte99.github.io/book-tracker/calendar/ (원본 `shared-calendar/index.html`)

## 휴대폰에 앱처럼 설치

- **Android Chrome**: 주소창 오른쪽 `⋮` → **홈 화면에 추가**(또는 설치) → 이름 `내 책장`
- **iPhone Safari**: 공유 → **홈 화면에 추가**

설치하면 주소창 없이 독립 앱처럼 열립니다(`manifest.webmanifest`, `display: standalone`).

## 데이터 보관과 옮기기

기록은 브라우저 저장소에 있으므로 **주소(origin)가 다르면 서로 다른 기록**입니다.
예전 파일을 열어 쓰던 기록을 이 주소로 옮기려면:

1. 예전 화면에서 `설정` → **JSON으로 내보내기** (`books.json` 저장)
2. 이 주소에서 `설정` → **JSON 파일 가져오기** → 병합 선택

사진은 JSON에 함께 들어가고, CSV에는 들어가지 않습니다.

## 저장 공간 (IndexedDB)

- 책 기록은 **IndexedDB** — `pickle_book_tracker_db` → `library` → `main` 한 칸에 통째로 들어갑니다.
  사진·사진첩이 수백 MB 쌓여도 되고, 예전 `localStorage` 의 약 5MB 한도에 걸리지 않습니다.
- Gemini API 키(`pickle_book_tracker_gemini_key`)와 마지막 저장 시각만 `localStorage` 에 남습니다.
- 예전 `localStorage` 기록(`pickle_book_tracker_v1`)이 있으면 처음 한 번 IndexedDB 로 옮기고,
  다시 읽어 확인한 뒤에만 옛 사본을 지웁니다(`pickle_book_tracker_v1_migrated` 에 기록).
- IndexedDB 를 쓸 수 없는 브라우저에서는 예전처럼 `localStorage` 로 저장하고 5MB 한도 안내도 그대로 동작합니다.
- `백업·관리` 의 **저장 공간** 은 브라우저가 알려 주는 실제 사용량·남은 공간(`navigator.storage.estimate()`)을 보여 줍니다.
  크롬·삼성 인터넷에서는 브라우저가 저장소를 함부로 지우지 않도록 **지속 저장** 도 조용히 요청합니다.

## 파일 구성

| 파일 | 설명 |
| --- | --- |
| `index.html` | 앱 본체 (HTML + CSS + JS 인라인, 오프라인에서도 열림) |
| `manifest.webmanifest` | 홈 화면 추가용 앱 정보(이름·색·아이콘) |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | 앱 아이콘 (maskable 대응) |
| `apple-touch-icon.png` | iOS 홈 화면 아이콘 |
| `.nojekyll` | GitHub Pages 가 Jekyll 처리 없이 그대로 서빙하도록 |
| `calendar/index.html` | 우리들의 캘린더 앱 본체 (같은 저장소의 하위 경로로 배포) |
| `calendar/manifest.webmanifest`, `calendar/icon*.png`, `calendar/icon.svg`, `calendar/apple-touch-icon.png` | 캘린더 홈 화면 아이콘·앱 정보 |
| `android/` | 우리들의 캘린더 안드로이드 앱(APK) 프로젝트 |
| `photo-album/` | 우리 사진첩 (데이트·기념일 공유 앨범, `firebase-messaging-sw.js` 는 웹 푸시용) |
| `android-photo-album/` | 우리 사진첩 안드로이드 앱(APK) 프로젝트 |
| `firebase/functions/`, `firebase.json`, `.firebaserc` | 푸시 알림 서버(Cloud Functions)와 Firebase CLI 배포 설정 |
| `firebase/firestore.rules` | Firestore 보안 규칙 (CLI 로 배포) |

## 앱 기능

책 추가(표지 사진, EXIF 촬영일로 시작일 자동 입력) · 상태(읽는 중/완독/읽고 싶음) · 별점 · 메모 ·
**📸 책 사진첩**(기억하고 싶은 구절을 사진으로 찍어 책마다 모아 두기 — 사진별 페이지·메모, 크게 보기, 넘기기, 지우기) ·
검색·필터·정렬 · 통계 · JSON/CSV 내보내기·가져오기 · 제목으로 표지 정보 찾기(Gemini API 키는 선택,
기기 저장소에만 보관되고 내보내기 파일에는 포함되지 않음)

## 🔗 실시간 공유 (Firebase)

`백업·관리` 탭의 **🔗 실시간 공유** 에서 **공유 시작** 을 누르면 지금 책장이 Firebase Firestore
(`jaeyeon-life` 프로젝트, `bookshelves/{방ID}/books`)에 올라가고, 링크가 만들어집니다.

- 공유 링크: `https://cheesebyte99.github.io/book-tracker/?room=<방ID>`
- 링크를 받은 사람은 같은 책장을 보며, 추가·수정·삭제가 서로 바로 반영됩니다(onSnapshot).
- **방 나가기** 를 누르면 이 기기에 저장된 원래 내 책장으로 돌아갑니다(공유 중에는 이 기기 기록을 건드리지 않음).
- **Gemini API 키는 절대 공유되지 않습니다.** 키는 `pickle_book_tracker_gemini_key` 로 각 기기의
  localStorage 에만 있고, Firestore 로 보내는 문서에는 들어가지 않습니다.
- 표지 사진은 Firestore 문서 한도(1MB)에 맞게 필요하면 자동으로 다시 줄여 올립니다. 아주 큰 사진은 공유본에서 빠집니다.
- **📸 사진첩은 책마다 하위 컬렉션** `bookshelves/{방ID}/books/{책번호}/gallery/{사진번호}` 에 **사진 한 장씩** 올라갑니다.
  문서 하나에 사진 한 장이라 1MB 한도와 상관없이 **장수 제한 없이** 공유되고, 사진 추가·메모 수정·삭제가
  다른 기기에 **실시간(onSnapshot)** 으로 반영됩니다. 책을 지우면 그 책의 사진첩 문서도 함께 지워집니다.
  부모 책 문서에는 글자·표지만 들어갑니다(예전 문서에 남아 있던 `gallery` 배열은 읽을 때만 합쳐 보여 주고, 하위 컬렉션으로 옮깁니다).

### Firestore 규칙 (`firebase/firestore.rules`)

이 저장소의 앱이 쓰는 규칙은 **이미 게시되어 있습니다**(jaeyeon-life → Firestore → 규칙).
규칙을 바꿀 때는 콘솔 편집기에 `firebase/firestore.rules` 의 내용을 넣고 **게시**하거나,

```bash
firebase deploy --only firestore:rules    # firebase-tools + 로그인이 되어 있을 때
```

> 콘솔 편집기는 한 번에 다룰 수 있는 길이가 짧아, 게시된 규칙은 같은 내용을 공백·함수 이름만 줄인 한 줄짜리 사본입니다.
> 사진첩 경로(`.../gallery/{photoId}`)는 `id`(문자열)·`dataUrl`(900KB까지)·`note`(120자까지, 선택)·`addedAt`/`updatedAt`(timestamp) 만 허용합니다.

## 📅 우리들의 캘린더

`공유 캘린더` 도 같은 저장소의 `/calendar/` 경로에 함께 배포합니다.

- 앱: https://cheesebyte99.github.io/book-tracker/calendar/
- 원본: `shared-calendar/index.html` (Firebase `jaeyeon-life` 프로젝트, `rooms/{방ID}/events`)
- 방 링크: `https://cheesebyte99.github.io/book-tracker/calendar/?room=<방ID>`
- **한 화면 달력**: 달력이 화면을 꽉 채우고, 칸마다 일정 제목이 색 칩으로 보입니다(기간 일정은 날짜를 가로지르는 바).
  날짜를 누르면 그 날 일정을 자세히 보는 창이 열리고, 옆으로 밀면 이전/다음 달로 넘어갑니다.
- **아이폰**: Safari 로 열고 공유(□↑) → **홈 화면에 추가** 하면 캘린더 아이콘(`calendar/apple-touch-icon.png`)으로 앱처럼 열립니다.
  `calendar/manifest.webmanifest` 에는 일부러 `start_url` 을 두지 않아, 추가할 때 열려 있던 방 주소(`?room=`)로 열립니다.
  「📤 친구 초대」는 휴대폰 공유 창(`navigator.share`)을 쓰고, 안 되는 브라우저에서는 링크를 복사합니다.
  입력칸은 16px 이라 아이폰이 입력할 때 화면을 확대하지 않고, 노치·홈 막대 여백(`safe-area-inset`)을 지킵니다.
- **일정 글씨 크기**: 위쪽 「글씨 크기 100%」 버튼에서 달력 칸의 일정 글씨·막대 크기를 10%~100%(10% 단위, 기본 100%)로 고릅니다.
  작게 할수록 한 칸에 일정이 더 들어가며, 이 기기의 localStorage(`shared-calendar:chip-scale`)에만 저장됩니다.
- **꾸미기 (⚙️ 설정)**: 테마 9가지(기본=휴대폰 라이트/다크 따라감 · 화이트 · 블랙 · 네이비 · 핑크 · 파랑 · 민트 · 라벤더 · 피치)와
  배경 사진(긴 변 1600px JPEG 로 줄여 이 기기 IndexedDB `shared-calendar-ui` 에 저장) · 사진 투명도(0~90%).
  모두 이 기기에만 저장되고(`shared-calendar:theme`, `shared-calendar:bg-alpha`) 친구 화면에는 영향이 없습니다.
  안드로이드 앱은 테마에 맞춰 상태 막대 색도 바꿉니다(`AndroidApp.setSystemBars`).
- **카테고리 편집**: 일정 창의 「✏️ 편집」에서 카테고리 이름·색을 바꾸고, 추가·삭제합니다.
  방마다 `rooms/{방ID}/categories/{id}` (`name`·`color`(#rrggbb)·`order`)에 저장되어 친구와 함께 씁니다.
  저장된 카테고리가 없으면 기본 4개(약속·여행·기념일·기타)를 씁니다. 지운 카테고리의 일정은 「미분류」(회색)로 보입니다.
- **기간 일정**: 일정 추가에서 「기간 일정 (여러 날)」을 켜면 시작~종료 날짜를 고르고, 달력에 날짜를 가로지르는 바로 표시됩니다.
  문서에 `endDate`(마지막 날, `YYYY-MM-DD`)가 더해지며 하루 일정 문서는 예전과 같습니다.
  Firestore 규칙이 `rooms/{방ID}/events` 문서에 `endDate` 를 허용해야 저장됩니다 — `firebase/firestore.rules` 를 콘솔에 붙여 넣고 게시.

### 📱 안드로이드 앱 (APK) — `android/`

같은 캘린더를 설치형 안드로이드 앱으로 감싼 것입니다. `calendar/index.html` 을 빌드 때 그대로 앱 안에 넣으므로
웹판을 고치면 앱도 다음 빌드에 같이 바뀝니다. 일정은 웹판과 똑같이 Firestore `rooms/{방ID}/events` 로 실시간 공유됩니다
(앱 ↔ 앱, 앱 ↔ 브라우저 모두 같은 방이면 함께 보임).

- 앱은 페이지를 `https://cheesebyte99.github.io/book-tracker/calendar/` 주소로 열되, 파일은 앱 안의 것을 씁니다
  (`WebViewAssetLoader`). 그래서 인터넷이 잠깐 끊겨도 화면은 바로 뜨고, 초대 링크는 웹 주소 그대로라 앱이 없는 친구도 브라우저로 들어옵니다.
- 앱에서만: **📤 친구 초대** 버튼이 카카오톡 등으로 보내는 안드로이드 공유 창을 엽니다 · 방 설정에 초대 링크를 통째로 붙여 넣어도 방 ID 만 골라 이동 ·
  다른 앱에서 초대 글을 **공유 → 우리들의 캘린더** 로 보내면 그 방이 열림 · 뒤로 가기는 열린 창부터 닫음.
- 초대 링크를 눌러 앱이 바로 열리게 하려면: 앱 정보 → **기본으로 열기** → `cheesebyte99.github.io` 링크 허용
  (안드로이드 12+ 는 도메인 인증 파일이 없으면 기본으로 꺼져 있음).

빌드:

```bash
cd android
./gradlew assembleRelease     # → app/build/outputs/apk/release/app-release.apk  (ANDROID_HOME 필요)
```

GitHub Actions(`.github/workflows/android-apk.yml`)가 `android/`·`calendar/` 변경 때마다 APK 를 만들어
실행 결과의 **Artifacts** 에 올리고, `main` 브랜치면 **Releases** 에 `our-calendar.apk` 로 올립니다.

서명: 저장소 비밀값 `ANDROID_KEYSTORE_BASE64`·`ANDROID_KEYSTORE_PASSWORD`·`ANDROID_KEY_ALIAS`·`ANDROID_KEY_PASSWORD` 가 있으면 그 키,
없으면 `android/debug.keystore`(비밀번호 `android`) 로 서명합니다. 같은 키로 서명돼야 덮어쓰기 업데이트가 되므로 키를 바꾸면 한 번 지우고 다시 설치해야 합니다.

### 🔔 푸시 알림 (Cloud Functions + FCM)

- **설정(⚙️)**: 알림 받기 · 당일 알림 시간(5분 단위, 기본 09:00) · 일정 추가·수정·삭제 알림 · 내 이름 · 글씨 크기.
  알림 설정은 기기마다 따로이고(localStorage `shared-calendar:push`), 켜면 `rooms/{방ID}/devices/{기기ID}` 에
  FCM 토큰·당일 알림 시간·시간대를 등록합니다(앱은 쓰기·지우기만, 읽기는 서버만). 방을 바꾸면 예전 방 등록은 지웁니다.
- **일정마다 알림**: 당일 · 1일 전 · 2일 전 · 3일 전 · 1주 전 중 여러 개(`reminders: [0,1,2]`). 새 일정과 예전 일정의 기본값은 당일·1일 전·2일 전.
- **서버** (`firebase/functions`, 서울 asia-northeast3, Node 22, 2세대):
  - `eventChanged` — 일정 추가·수정·삭제 시 같은 방의 다른 기기에 「○○님이 「제목」 일정을 추가했어요」.
    저장·삭제 때 앱이 `editedBy`(기기)·`editor`(이름)를 적어 두어, 바꾼 사람 본인에게는 보내지 않습니다.
  - `dailyReminders` — 5분마다, 각 기기의 당일 알림 시간이 된 기기에 「⏰ 오늘/내일/모레 일정」을 하루 한 번(`lastRemind`).
  - 받을 수 없는 토큰(앱 삭제 등)은 기기 문서를 지워 정리합니다. 판단 로직은 `logic.js`, 시험은 `npm test`.
- **받는 쪽**: 안드로이드 앱은 네이티브 FCM(`android/app/google-services.json`), 웹·아이폰 홈 화면 앱은
  `calendar/firebase-messaging-sw.js` + VAPID 키. 알림을 누르면 그 방·날짜 상세가 열립니다(`?room=…&date=…`).
- 배포 (프로젝트 소유자 계정으로 로그인한 뒤):

```bash
cd firebase/functions && npm install && npm test && cd ../..
firebase deploy --only firestore:rules,functions   # firebase.json · .firebaserc 기준
```

#### 🤖 자동 배포 (GitHub Actions)

`main` 에 `firebase/`·`firebase.json`·`.firebaserc` 가 바뀌어 올라가면 `.github/workflows/firebase-deploy.yml` 이
서버 시험(`npm test`) 뒤 `firebase deploy --only firestore:rules,functions` 를 대신 실행합니다. Actions 탭 → 「Firebase 배포」 → Run workflow 로 손으로도 돌릴 수 있어요.
처음 한 번만 서비스 계정 키를 넣어 둡니다.

1. [Google Cloud 콘솔 → IAM 및 관리자 → 서비스 계정](https://console.cloud.google.com/iam-admin/serviceaccounts?project=jaeyeon-life) → **서비스 계정 만들기** (이름 예: `github-deploy`).
2. 역할 세 개를 줍니다: **편집자**, **Cloud Functions 관리자**, **서비스 계정 사용자**.
3. 만든 계정 → **키** 탭 → 키 추가 → 새 키 만들기 → **JSON** → 파일이 내려받아집니다.
4. GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret**
   이름 `FIREBASE_SERVICE_ACCOUNT`, 값에 그 JSON 파일 내용 **전체**를 붙여 넣고 저장. (내려받은 파일은 지워 두세요.)

키가 없으면 워크플로는 경고만 남기고 배포를 건너뜁니다. 코드에서 함수가 빠져 지워야 하는 경우에는 지우지 않고 멈추므로, 그때는 직접 `firebase deploy` 로 확인합니다.

> 이제 규칙은 콘솔 편집기 대신 CLI 로 배포하므로 한 줄 길이 제한을 신경 쓰지 않아도 됩니다.
> 처음 2세대 함수를 배포할 때는 Eventarc 권한이 퍼지는 데 몇 분 걸려 한 번 실패할 수 있습니다(몇 분 뒤 다시 배포).

## 📸 우리 사진첩 안드로이드 앱 (APK) — `android-photo-album/`

`photo-album/` 폴더를 그대로 앱 안에 넣어 WebView 로 띄웁니다(웹과 앱이 같은 파일을 씀).
페이지는 `https://cheesebyte99.github.io/book-tracker/photo-album/` 주소로 열리되 앱 안의 파일로 바로 응답하므로,
인터넷 없이도 화면이 열리고 웹판과 같은 공유 앨범(방)·Cloudinary 설정을 그대로 씁니다.

앱에서만 달라지는 점:
- **⤓ 원본 저장** → 휴대폰 `사진/우리사진첩` 폴더에 바로 저장
- 공유 링크 **복사** → 카카오톡 등으로 바로 보내는 공유 창
- 받은 공유 링크를 누르거나 「공유 → 우리 사진첩」으로 보내면 그 앨범으로 바로 열림
- 사진 여러 장 한 번에 고르기, 뒤로 가기로 창 닫기·타임라인으로 돌아가기
- 푸시 알림(네이티브 FCM) — `android-photo-album/app/google-services.json` 이 있을 때만 켜짐 (아래 참고)

```bash
cd android-photo-album
./gradlew assembleRelease   # app/build/outputs/apk/release/app-release.apk
```

GitHub Actions(`.github/workflows/photo-album-apk.yml`)가 `android-photo-album/`·`photo-album/` 변경 때마다 APK 를 만들어
Actions 아티팩트(`our-photo-album-apk`)로 올리고, `main` 에서는 「우리 사진첩 APK」 릴리스로도 올립니다.
서명 키는 캘린더 앱과 같은 방식(비밀값 `ANDROID_KEYSTORE_*`, 없으면 `debug.keystore`)입니다.

### 💝 기념일 · 🔔 사진첩 알림

- **기념일(설정 → 💝 우리 기념일)**: 처음 만난 날을 넣으면 헤더에 「함께한 지 n일째」, 설정에 다가오는 100일 단위·n주년과 D-day 를 보여 줍니다.
  함께 쓰는 앨범에서는 앨범 문서 `albums/{방ID}.since` 에 저장돼 두 사람이 같은 날을 씁니다(시작한 날이 1일째).
- **알림(설정 → 🔔 알림)**: 알림 받기 · 새 추억·사진 알림 · 기념일 알림 · 기념일 알림 시간(기본 09:00). 함께 쓰는 앨범에서만 동작하며,
  켜면 `albums/{방ID}/devices/{기기ID}` 에 토큰·설정을 등록합니다(앱은 쓰기·지우기만, 읽기는 서버만).
- **서버**(`firebase/functions`, 캘린더와 같은 코드베이스):
  - `albumDayChanged` — 상대가 새 추억을 담거나 사진을 더 올리거나 날짜·제목·장소·메모를 고치면 「○○님이 「제목」에 사진 3장을 올렸어요」.
    저장할 때 앱이 `editedBy`(기기)·`editor`(이름)·`photoCount` 를 적어 두어, 올린 사람 본인에게는 보내지 않습니다.
    사진 빼기·설명만 바꾸기·삭제, 혼자 쓰던 추억을 방으로 옮길 때는 알리지 않습니다.
  - `albumAnniversaries` — 5분마다, 각 기기의 알림 시간에 100일·200일…·n주년을 **당일·하루 전·일주일 전** 알림(하루 한 번, `lastRemind`). 판단 로직은 `album-logic.js`.
- **받는 쪽**: 아이폰은 Safari → 공유 → 「홈 화면에 추가」로 연 앱(iOS 16.4 이상)에서 `photo-album/firebase-messaging-sw.js` + VAPID 키(캘린더와 같은 키)로 받습니다.
  안드로이드 앱은 네이티브 FCM 이라 Firebase 콘솔에 **안드로이드 앱(패키지 `io.github.cheesebyte99.photoalbum`)을 추가**하고 받은
  `google-services.json` 을 `android-photo-album/app/` 에 넣어야 알림이 켜집니다. 없으면 알림 없이 빌드됩니다.
- 새 규칙·함수는 위 「배포」 명령(`firebase deploy --only firestore:rules,functions`)으로 올립니다.
  규칙을 올리기 전에도 추억 저장은 되도록, 예전 규칙이 막으면 알림용 칸 없이 다시 저장합니다.

## 갱신 방법

```bash
python3 sync_from_source.py          # ../book-tracker/book_tracker_app.html → index.html (PWA 머리말 유지)
cp ../shared-calendar/index.html calendar/index.html  # 캘린더 수정 후
git add -A && git commit -m "앱 갱신" && git push
```

> `index.html` 을 `cp` 로 통째로 덮어쓰면 `manifest`·아이콘 같은 PWA 머리말이 사라집니다.
> 그래서 `sync_from_source.py` 로 옮깁니다.

GitHub Pages 는 `main` 브랜치 루트를 그대로 서빙하며, push 후 1분 안에 반영됩니다.
