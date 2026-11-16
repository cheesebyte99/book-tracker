# 내 책장 · 독서 정리

읽은 책과 읽고 싶은 책을 정리하는 휴대폰용 독서 기록 웹앱입니다.
파일 하나(`index.html`)로 동작하고, 기록은 서버가 아니라 **이 기기 브라우저(localStorage)** 에만 저장됩니다.

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

## 파일 구성

| 파일 | 설명 |
| --- | --- |
| `index.html` | 앱 본체 (HTML + CSS + JS 인라인, 오프라인에서도 열림) |
| `manifest.webmanifest` | 홈 화면 추가용 앱 정보(이름·색·아이콘) |
| `icon.svg`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | 앱 아이콘 (maskable 대응) |
| `apple-touch-icon.png` | iOS 홈 화면 아이콘 |
| `.nojekyll` | GitHub Pages 가 Jekyll 처리 없이 그대로 서빙하도록 |
| `calendar/index.html` | 우리들의 캘린더 앱 본체 (같은 저장소의 하위 경로로 배포) |

## 앱 기능

책 추가(표지 사진, EXIF 촬영일로 시작일 자동 입력) · 상태(읽는 중/완독/읽고 싶음) · 별점 · 메모 ·
검색·필터·정렬 · 통계 · JSON/CSV 내보내기·가져오기 · 제목으로 표지 정보 찾기(Gemini API 키는 선택,
기기 저장소에만 보관되고 내보내기 파일에는 포함되지 않음)

## 🔗 실시간 공유 (Firebase)

`백업·관리` 탭의 **🔗 실시간 공유** 에서 **공유 시작** 을 누르면 지금 책장이 Firebase Firestore
(`jaeyeon-life` 프로젝트, `bookshelves/{방ID}/books`)에 올라가고, 링크가 만들어집니다.

- 공유 링크: `https://cheesebyte99.github.io/book-tracker/?room=<방ID>`
- 링크를 받은 사람은 같은 책장을 보며, 추가·수정·삭제가 서로 바로 반영됩니다(onSnapshot).
- **방 나가기** 를 누르면 이 기기에 저장된 원래 내 책장으로 돌아갑니다(공유 중에는 localStorage 를 건드리지 않음).
- **Gemini API 키는 절대 공유되지 않습니다.** 키는 `pickle_book_tracker_gemini_key` 로 각 기기의
  localStorage 에만 있고, Firestore 로 보내는 문서에는 들어가지 않습니다.
- 사진은 Firestore 문서 한도(1MB)에 맞게 필요하면 자동으로 다시 줄여 올립니다. 아주 큰 사진은 공유본에서 빠집니다.

## 📅 우리들의 캘린더

`공유 캘린더` 도 같은 저장소의 `/calendar/` 경로에 함께 배포합니다.

- 앱: https://cheesebyte99.github.io/book-tracker/calendar/
- 원본: `shared-calendar/index.html` (Firebase `jaeyeon-life` 프로젝트, `rooms/{방ID}/events`)
- 방 링크: `https://cheesebyte99.github.io/book-tracker/calendar/?room=<방ID>`

## 갱신 방법

```bash
cp ../book-tracker/book_tracker_app.html index.html   # 앱 수정 후
cp ../shared-calendar/index.html calendar/index.html  # 캘린더 수정 후
git add -A && git commit -m "앱 갱신" && git push
```

GitHub Pages 는 `main` 브랜치 루트를 그대로 서빙하며, push 후 1분 안에 반영됩니다.
