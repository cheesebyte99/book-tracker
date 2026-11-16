#!/usr/bin/env python3
"""앱 본체를 배포용 index.html 로 옮깁니다.

`book-tracker/book_tracker_app.html` 을 그대로 복사하면 index.html 에만 있는
PWA 머리말(manifest · 아이콘 · apple 메타)이 사라집니다. 이 스크립트는 지금
index.html 의 `<title>` 다음 ~ `<style>` 앞 블록을 그대로 붙여 넣습니다.

사용:
    python3 sync_from_source.py            # ../book-tracker/book_tracker_app.html → index.html
    python3 sync_from_source.py 원본.html  # 다른 원본 파일
"""

import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
TARGET = HERE / "index.html"
SOURCE = HERE.parent / "book-tracker" / "book_tracker_app.html"


def index_of(lines, needle):
    for i, line in enumerate(lines):
        if needle in line:
            return i
    raise SystemExit(f"{needle!r} 을(를) 찾지 못했습니다.")


def main():
    source = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    app = source.read_text(encoding="utf-8").splitlines(keepends=True)
    current = TARGET.read_text(encoding="utf-8").splitlines(keepends=True)

    head_start = index_of(current, "<title>")
    head_end = index_of(current, "<style>")
    head_block = current[head_start + 1:head_end]

    app_title = index_of(app, "<title>")
    app_style = index_of(app, "<style>")
    merged = app[:app_title + 1] + head_block + app[app_style:]

    TARGET.write_text("".join(merged), encoding="utf-8")
    print(f"{source} → {TARGET} ({len(merged)}줄, PWA 머리말 {len(head_block)}줄 유지)")


if __name__ == "__main__":
    main()
