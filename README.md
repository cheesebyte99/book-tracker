# 내 책장 · 독서 정리

읽은 책과 읽고 싶은 책을 정리하는 휴대폰용 독서 기록 웹앱입니다.
파일 하나(`index.html`)로 동작하고, 기록은 서버가 아니라 **이 기기 브라우저(IndexedDB)** 에만 저장됩니다.
(예전 `localStorage` 기록은 처음 열 때 자동으로 옮겨집니다 — 사진·사진첩 포함)

- 앱: https://cheesebyte99.github.io/book-tracker/
- 원본: `book-tracker/book_tracker_app.html` (로컬 폴더의 같은 앱)

## 함께 쓰는 다른 앱 (따로 옮겼어요)

| 앱 | 저장소 | 주소 |
| --- | --- | --- |
| 📅 우리들의 캘린더 | [our-calendar](https://github.com/cheesebyte99/our-calendar) | https://cheesebyte99.github.io/our-calendar/ |
| 📸 우리 사진첩 | [our-photo-album](https://github.com/cheesebyte99/our-photo-album) | https://cheesebyte99.github.io/our-photo-album/ |
| 🔥 Firestore 규칙 · 알림 서버 | [our-firebase](https://github.com/cheesebyte99/our-firebase) | (웹 없음) |

예전 주소 `/book-tracker/calendar/`·`/book-tracker/photo-album/` 에는 새 주소로 넘겨 주는 페이지(`index.html`)와,
이미 등록된 웹 알림이 계속 뜨도록 `firebase-messaging-sw.js` 만 남겨 두었습니다.

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
| `calendar/`, `photo-album/` | 옮긴 앱의 예전 주소 — 새 주소로 넘겨 주는 페이지와 웹 알림용 `firebase-messaging-sw.js` |
| `sync_from_source.py` | 원본 앱 파일을 `index.html` 로 옮기는 스크립트 |

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

### Firestore 규칙

규칙과 알림 서버는 [our-firebase](https://github.com/cheesebyte99/our-firebase) 저장소에서 관리하고, 그 저장소의 `main` 에 올리면 자동으로 배포됩니다.
책장 경로는 `bookshelves/{방}/books/{책}` 과 사진첩 하위 컬렉션 `…/gallery/{사진}`
(`id`·`dataUrl`(900KB까지)·`note`(120자까지)·`addedAt`/`updatedAt`) 입니다.

## 갱신 방법

```bash
python3 sync_from_source.py          # ../book-tracker/book_tracker_app.html → index.html (PWA 머리말 유지)
git add -A && git commit -m "앱 갱신" && git push
```

> `index.html` 을 `cp` 로 통째로 덮어쓰면 `manifest`·아이콘 같은 PWA 머리말이 사라집니다.
> 그래서 `sync_from_source.py` 로 옮깁니다.

GitHub Pages 는 `main` 브랜치 루트를 그대로 서빙하며, push 후 1분 안에 반영됩니다.
