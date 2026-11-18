# book-tracker — 📚 내 책장

## 저장소 원칙 (cheesebyte99 의 앱들)

- **새 프로그램은 새 저장소에서 만든다.** 기존 저장소에 하위 폴더로 더하지 않는다.
  Claude 는 저장소를 직접 만들 수 없으므로, 이름을 제안하고 사용자가 GitHub 에서 **빈 저장소**를 만들면
  그 저장소를 세션에 연결해 웹 주소(GitHub Pages)·빌드·자동 배포를 처음부터 따로 설정한다.
- 저장소 구성
  | 저장소 | 내용 | 주소 |
  | --- | --- | --- |
  | `book-tracker` | 📚 내 책장 (+ 옮긴 앱의 예전 주소에서 새 주소로 넘겨 주는 페이지) | https://cheesebyte99.github.io/book-tracker/ |
  | `our-calendar` | 📅 우리들의 캘린더 웹 + 안드로이드 앱 | https://cheesebyte99.github.io/our-calendar/ |
  | `our-photo-album` | 📸 우리 사진첩 웹 + 안드로이드 앱 | https://cheesebyte99.github.io/our-photo-album/ |
  | `our-firebase` | 🔥 Firestore 규칙 · Cloud Functions(알림 서버) · 자동 배포 | (웹 없음) |
- 모든 앱이 Firebase 프로젝트 `jaeyeon-life` 하나를 함께 쓴다. **Firestore 규칙·알림 서버는 `our-firebase` 에만 둔다**
  (규칙 파일은 프로젝트에 하나뿐이라 나눠 두면 서로 덮어쓴다). 새 앱이 Firebase 를 쓰면 그 부분만 `our-firebase` 에 더한다.
- 앱에 새 Firestore 칸을 더할 때는 `our-firebase` 의 규칙을 **먼저** 배포(`main` 에 올리면 자동 배포)하고, 그다음 앱을 올린다.
- 안드로이드 APK 는 각 저장소의 GitHub Actions 가 빌드해 Releases 에 올린다. 서명은 각 저장소의 `android/debug.keystore`
  (폰에 깔린 앱과 같은 키 — 바꾸면 덮어쓰기 업데이트가 안 된다).
- 사용자와는 한국어로, 개발자가 아닌 사람도 따라 할 수 있게 단계별로 안내한다.

## 이 저장소

- 독서 기록 웹앱 하나(`index.html`)와 PWA 파일들. 기록은 기기 IndexedDB, 실시간 공유는 Firestore `bookshelves/…`.
- `index.html` 은 원본 `book_tracker_app.html` 에서 `sync_from_source.py` 로 옮긴다(통째로 덮어쓰면 PWA 머리말이 사라짐).
- `calendar/`·`photo-album/` 은 옮긴 앱의 **예전 주소**다. 새 주소로 넘겨 주는 `index.html` 과, 이미 등록된 웹 알림이 계속 뜨도록
  `firebase-messaging-sw.js` 만 남겨 두었다. 지우지 않는다.
