'use strict';
/**
 * 우리 사진첩 알림 판단 로직 (Firebase 와 상관없는 순수 함수 — test/ 에서 시험한다)
 *
 * 앨범 문서  albums/{방}
 *   name, cloudinary?, since?(우리가 시작한 날 YYYY-MM-DD — 이날이 1일째)
 * 추억 문서  albums/{방}/days/{id}
 *   date(YYYY-MM-DD), title, place?, memo?, author,
 *   editedBy?(마지막으로 저장한 기기 id), editor?(그 사람 이름), photoCount?(그 추억의 사진 수)
 *   editedBy 가 없으면(혼자 쓰던 추억을 방으로 옮길 때 등) 알리지 않는다.
 * 기기 문서  albums/{방}/devices/{기기id}
 *   token, platform('android'|'web'), enabled, changeAlerts, annivAlerts, remindTime('HH:MM'), tz, name, lastRemind?
 */
const { addDays, shortDate } = require('./logic');

/** 기념일을 며칠 전에 알릴지 (당일·하루 전·일주일 전) */
const ANNIV_LEAD_DAYS = [0, 1, 7];
const CONTENT_FIELDS = ['date', 'title', 'place', 'memo'];

function isDateKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function count(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** 「제목」(제목이 없으면 「11/18(수)」) */
function dayLabel(day) {
  const title = String((day && day.title) || '').trim();
  if (title) return '「' + title + '」';
  return isDateKey(day && day.date) ? '「' + shortDate(day.date) + '」' : '「제목 없음」';
}

/**
 * 추억 문서 변경 → 알릴 내용. 알릴 것이 없으면 null.
 * - 새 추억: 「○○님이 「제목」 추억을 담았어요 · 사진 3장」
 * - 사진이 늘어난 수정: 「○○님이 「제목」에 사진 2장을 올렸어요」
 * - 날짜·제목·장소·메모 수정: 「○○님이 「제목」 추억을 고쳤어요」
 * 사진을 빼거나 설명만 바꾼 저장, 삭제는 알리지 않는다.
 */
function describeDayChange(before, after) {
  if (!after || !after.editedBy) return null;
  const name = String(after.editor || after.author || '').trim();
  const who = name ? name + '님이' : '누군가';
  const label = dayLabel(after);
  const photos = count(after.photoCount);
  const base = { by: String(after.editedBy), date: isDateKey(after.date) ? after.date : '' };

  if (!before) {
    return Object.assign(base, {
      type: 'add',
      title: '📸 새 추억',
      body: who + ' ' + label + ' 추억을 담았어요' + (photos ? ' · 사진 ' + photos + '장' : '')
    });
  }

  const prev = count(before.photoCount);
  const added = photos !== null && prev !== null ? photos - prev : 0;
  if (added > 0) {
    return Object.assign(base, {
      type: 'photos',
      title: '📸 사진 추가',
      body: who + ' ' + label + '에 사진 ' + added + '장을 올렸어요'
    });
  }

  const changed = CONTENT_FIELDS.some((k) => String(before[k] || '') !== String(after[k] || ''));
  if (!changed) return null;
  return Object.assign(base, {
    type: 'edit',
    title: '✏️ 추억 수정',
    body: who + ' ' + label + ' 추억을 고쳤어요'
  });
}

/** 이 기기가 새 추억·사진 알림을 받아야 하는지 */
function wantsDayAlert(device, deviceId, by) {
  if (!device || !device.token) return false;
  if (device.enabled === false || device.changeAlerts === false) return false;
  return deviceId !== by; // 올린 사람 자신에게는 보내지 않는다
}

function wantsAnnivAlert(device) {
  return !!(device && device.token && device.enabled !== false && device.annivAlerts !== false);
}

function dayNumber(since, date) {
  const a = Date.UTC(+since.slice(0, 4), +since.slice(5, 7) - 1, +since.slice(8, 10));
  const b = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
  return Math.round((b - a) / 86400000) + 1; // 시작한 날이 1일째
}

function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** 그날이 기념일이면 이름들(예 ['100일'], ['1주년']), 아니면 빈 배열 */
function milestonesOn(since, date) {
  if (!isDateKey(since) || !isDateKey(date) || date <= since) return [];
  const out = [];
  const n = dayNumber(since, date);
  if (n % 100 === 0) out.push(n + '일');
  const years = +date.slice(0, 4) - +since.slice(0, 4);
  let md = since.slice(5);
  if (md === '02-29' && !isLeap(+date.slice(0, 4))) md = '02-28'; // 윤일에 시작했으면 평년엔 2월 28일
  if (years > 0 && date.slice(5) === md) out.push(years + '주년');
  return out;
}

/**
 * 오늘(localDate) 보낼 기념일 알림들 — 당일·하루 전·일주일 전.
 * @returns [{days, title, body, date}]
 */
function buildAnniversaryNotes(since, localDate) {
  const out = [];
  for (const d of ANNIV_LEAD_DAYS) {
    const date = addDays(localDate, d);
    const names = milestonesOn(since, date);
    if (!names.length) continue;
    const what = '우리 ' + names.join(' · ');
    let title;
    let body;
    if (d === 0) {
      title = '💝 오늘은 ' + what + '이에요';
      body = shortDate(since) + '부터 함께한 지 ' + dayNumber(since, date) + '일째, 축하해요!';
    } else {
      const when = d === 1 ? '내일은' : d === 7 ? '일주일 뒤는' : d + '일 뒤는';
      title = '💝 ' + when + ' ' + what;
      body = shortDate(date) + ' · 미리 준비해 볼까요?';
    }
    out.push({ days: d, title, body, date });
  }
  return out;
}

module.exports = {
  ANNIV_LEAD_DAYS,
  describeDayChange, wantsDayAlert, wantsAnnivAlert,
  dayNumber, milestonesOn, buildAnniversaryNotes
};
