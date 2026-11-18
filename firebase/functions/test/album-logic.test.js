'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../album-logic');

const day = (o) => Object.assign({ date: '2026-11-18', title: '제주도 여행', place: '', memo: '', author: '지우' }, o);

test('새 추억 알림', () => {
  const n = A.describeDayChange(null, day({ editedBy: 'dev-a', editor: '지우', photoCount: 5 }));
  assert.equal(n.type, 'add');
  assert.equal(n.by, 'dev-a');
  assert.equal(n.title, '📸 새 추억');
  assert.equal(n.body, '지우님이 「제주도 여행」 추억을 담았어요 · 사진 5장');
  assert.equal(n.date, '2026-11-18');
});

test('사진만 늘어난 수정은 사진 추가 알림', () => {
  const n = A.describeDayChange(day({ photoCount: 2, editedBy: 'dev-a' }), day({ photoCount: 5, editedBy: 'dev-b', editor: '재연' }));
  assert.equal(n.type, 'photos');
  assert.equal(n.body, '재연님이 「제주도 여행」에 사진 3장을 올렸어요');
});

test('내용 수정 알림, 제목 없으면 날짜로', () => {
  const n = A.describeDayChange(day({ title: '', memo: 'a', photoCount: 2 }), day({ title: '', memo: 'b', photoCount: 2, editedBy: 'x', editor: '재연' }));
  assert.equal(n.type, 'edit');
  assert.equal(n.body, '재연님이 「11/18(수)」 추억을 고쳤어요');
});

test('알리지 않는 경우', () => {
  // 기기 표시가 없는 쓰기(혼자 쓰던 추억 옮기기 등)
  assert.equal(A.describeDayChange(null, day({ photoCount: 3 })), null);
  // 삭제
  assert.equal(A.describeDayChange(day({ editedBy: 'a' }), null), null);
  // 사진을 빼거나 설명만 바꾼 저장
  assert.equal(A.describeDayChange(day({ photoCount: 3, editedBy: 'a' }), day({ photoCount: 2, editedBy: 'a' })), null);
  assert.equal(A.describeDayChange(day({ photoCount: 3, editedBy: 'a' }), day({ photoCount: 3, editedBy: 'b' })), null);
});

test('예전 문서(photoCount 없음)에서 고친 경우는 내용 수정만 본다', () => {
  assert.equal(A.describeDayChange(day(), day({ photoCount: 4, editedBy: 'a' })), null);
  assert.equal(A.describeDayChange(day(), day({ title: '새 제목', photoCount: 4, editedBy: 'a' })).type, 'edit');
});

test('받을 기기 고르기', () => {
  assert.equal(A.wantsDayAlert({ token: 't' }, 'dev-b', 'dev-a'), true);
  assert.equal(A.wantsDayAlert({ token: 't' }, 'dev-a', 'dev-a'), false);
  assert.equal(A.wantsDayAlert({ token: 't', changeAlerts: false }, 'b', 'a'), false);
  assert.equal(A.wantsDayAlert({ token: 't', enabled: false }, 'b', 'a'), false);
  assert.equal(A.wantsAnnivAlert({ token: 't' }), true);
  assert.equal(A.wantsAnnivAlert({ token: 't', annivAlerts: false }), false);
});

test('기념일 계산 — 시작한 날이 1일째', () => {
  assert.equal(A.dayNumber('2026-01-01', '2026-01-01'), 1);
  assert.deepEqual(A.milestonesOn('2026-01-01', '2026-04-10'), ['100일']);
  assert.deepEqual(A.milestonesOn('2026-01-01', '2026-04-11'), []);
  assert.deepEqual(A.milestonesOn('2026-01-01', '2027-01-01'), ['1주년']);
  assert.deepEqual(A.milestonesOn('2026-01-01', '2026-01-01'), []);
  assert.deepEqual(A.milestonesOn('', '2027-01-01'), []);
  // 윤일에 시작했으면 평년에는 2월 28일
  assert.deepEqual(A.milestonesOn('2024-02-29', '2025-02-28'), ['1주년']);
  assert.deepEqual(A.milestonesOn('2024-02-29', '2028-02-29'), ['4주년']);
  assert.deepEqual(A.milestonesOn('2024-02-29', '2028-02-28'), []);
});

test('기념일 알림 — 당일·하루 전·일주일 전', () => {
  const since = '2026-01-01'; // 100일 = 2026-04-10
  const today = A.buildAnniversaryNotes(since, '2026-04-10');
  assert.equal(today.length, 1);
  assert.equal(today[0].title, '💝 오늘은 우리 100일이에요');
  assert.equal(today[0].body, '1/1(목)부터 함께한 지 100일째, 축하해요!');

  const eve = A.buildAnniversaryNotes(since, '2026-04-09');
  assert.equal(eve[0].title, '💝 내일은 우리 100일');
  assert.equal(eve[0].date, '2026-04-10');

  const week = A.buildAnniversaryNotes(since, '2026-04-03');
  assert.equal(week[0].title, '💝 일주일 뒤는 우리 100일');

  assert.deepEqual(A.buildAnniversaryNotes(since, '2026-04-05'), []);
  assert.deepEqual(A.buildAnniversaryNotes('', '2026-04-10'), []);
});
