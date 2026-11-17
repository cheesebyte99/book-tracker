'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../logic');

const ev = (o) => Object.assign({ title: '저녁 약속', date: '2026-11-20', allDay: false, startTime: '19:00', author: '지우', color: 'meet', memo: '' }, o);

test('추가·수정·삭제 알림 문구', () => {
  const add = L.describeChange(null, ev({ editedBy: 'dev-a', editor: '지우' }));
  assert.equal(add.type, 'add');
  assert.equal(add.by, 'dev-a');
  assert.equal(add.title, '📅 새 일정');
  assert.equal(add.body, '지우님이 「저녁 약속」 일정을 추가했어요 · 11/20(금) 19:00');

  const edit = L.describeChange(ev(), ev({ title: '저녁 약속 (강남)', editor: '재연', editedBy: 'dev-b' }));
  assert.equal(edit.type, 'edit');
  assert.match(edit.body, /^재연님이 「저녁 약속 \(강남\)」 일정을 수정했어요/);

  const del = L.describeChange(ev({ editor: '재연', editedBy: 'dev-b' }), null);
  assert.equal(del.type, 'delete');
  assert.equal(del.by, 'dev-b');
  assert.match(del.body, /^재연님이 「저녁 약속」 일정을 삭제했어요/);
});

test('기간 일정·종일 표시', () => {
  const n = L.describeChange(null, ev({ allDay: true, startTime: null, date: '2026-11-19', endDate: '2026-11-24', title: '제주도 여행' }));
  assert.match(n.body, /11\/19\(목\)~11\/24\(화\)$/);
});

test('누가 지웠는지만 적은 쓰기(삭제 직전)는 알리지 않는다', () => {
  const before = ev({ updatedAt: 1 });
  const after = ev({ updatedAt: 2, editedBy: 'dev-b', editor: '재연' });
  assert.equal(L.describeChange(before, after), null);
});

test('이름이 없거나 익명이면 「누군가」', () => {
  assert.match(L.describeChange(null, ev({ author: '익명' })).body, /^누군가 「/);
  assert.match(L.describeChange(ev(), null).body, /^누군가 「/); // 예전 앱이 지운 경우
});

test('변경 알림 대상: 바꾼 기기·끈 기기·토큰 없는 기기는 제외', () => {
  assert.equal(L.wantsChangeAlert({ token: 't' }, 'dev-a', 'dev-b'), true);
  assert.equal(L.wantsChangeAlert({ token: 't' }, 'dev-b', 'dev-b'), false);
  assert.equal(L.wantsChangeAlert({ token: 't', changeAlerts: false }, 'dev-a', 'dev-b'), false);
  assert.equal(L.wantsChangeAlert({ token: 't', enabled: false }, 'dev-a', 'dev-b'), false);
  assert.equal(L.wantsChangeAlert({}, 'dev-a', 'dev-b'), false);
});

test('reminders: 없으면 당일·1일 전·2일 전, 이상한 값은 버림', () => {
  assert.deepEqual(L.reminderDays({}), [0, 1, 2]);
  assert.deepEqual(L.reminderDays({ reminders: [] }), []);
  assert.deepEqual(L.reminderDays({ reminders: [7, 1, 1, -1, 9, 'x', 2.5, 3] }), [1, 3, 7]);
});

test('당일 알림 시간: 서울 09:00 설정 → 09:00~09:14 에만, 하루 한 번', () => {
  const dev = { token: 't', remindTime: '09:00', tz: 'Asia/Seoul' };
  // 2026-11-20 09:03 KST = 00:03 UTC
  assert.equal(L.remindDueDate(dev, new Date('2026-11-20T00:03:00Z')), '2026-11-20');
  assert.equal(L.remindDueDate(dev, new Date('2026-11-20T00:20:00Z')), null);   // 09:20 — 지남
  assert.equal(L.remindDueDate(dev, new Date('2026-11-19T23:58:00Z')), null);   // 08:58 — 아직
  assert.equal(L.remindDueDate(Object.assign({ lastRemind: '2026-11-20' }, dev), new Date('2026-11-20T00:03:00Z')), null);
  assert.equal(L.remindDueDate(Object.assign({ enabled: false }, dev), new Date('2026-11-20T00:03:00Z')), null);
});

test('당일 알림 시간: 자정 직전 설정이 자정 넘어 실행돼도 그 날짜로', () => {
  const dev = { token: 't', remindTime: '23:55', tz: 'Asia/Seoul' };
  // 2026-11-21 00:05 KST = 2026-11-20 15:05 UTC
  assert.equal(L.remindDueDate(dev, new Date('2026-11-20T15:05:00Z')), '2026-11-20');
});

test('다른 시간대 기기 (뉴욕)', () => {
  const dev = { token: 't', remindTime: '08:30', tz: 'America/New_York' };
  // 2026-11-20 08:31 EST = 13:31 UTC
  assert.equal(L.remindDueDate(dev, new Date('2026-11-20T13:31:00Z')), '2026-11-20');
});

test('미리 알림 묶음: 오늘·내일·모레, 일정별 설정, 시간순', () => {
  const events = [
    ev({ title: '점심', date: '2026-11-20', startTime: '12:00' }),
    ev({ title: '아침 운동', date: '2026-11-20', startTime: '07:00' }),
    ev({ title: '제주도 여행', date: '2026-11-21', endDate: '2026-11-24', allDay: true, startTime: null }),
    ev({ title: '시험', date: '2026-11-22', allDay: true, startTime: null, reminders: [0] }), // 모레지만 당일만 알림
    ev({ title: '생일', date: '2026-11-27', allDay: true, startTime: null, reminders: [7] }),
    ev({ title: '알림 끔', date: '2026-11-20', reminders: [] })
  ];
  const r = L.buildReminders(events, '2026-11-20');
  assert.deepEqual(r.map((x) => x.days), [0, 1, 7]);
  assert.equal(r[0].title, '⏰ 오늘 일정 · 11/20(금)');
  assert.equal(r[0].body, '07:00 아침 운동 · 12:00 점심');
  assert.equal(r[1].title, '⏰ 내일 일정 · 11/21(토)');
  assert.equal(r[1].body, '제주도 여행 (~11/24(화))');
  assert.equal(r[2].title, '⏰ 7일 후 일정 · 11/27(금)');
});

test('미리 알림: 다섯 개가 넘으면 「외 n개」', () => {
  const events = [];
  for (let i = 1; i <= 7; i++) events.push(ev({ title: '약속' + i, startTime: '1' + i + ':00' }));
  const r = L.buildReminders(events, '2026-11-20');
  assert.match(r[0].body, / 외 2개$/);
});

test('날짜 계산: 달·해 넘김', () => {
  assert.equal(L.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(L.addDays('2026-03-01', -1), '2026-02-28');
});
