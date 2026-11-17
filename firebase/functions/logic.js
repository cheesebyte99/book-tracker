'use strict';
/**
 * 알림 판단 로직 (Firebase 와 상관없는 순수 함수 — test/ 에서 시험한다)
 *
 * 일정 문서  rooms/{방}/events/{id}
 *   date(시작일 YYYY-MM-DD), endDate?(마지막 날), title, allDay, startTime?, author,
 *   reminders?(며칠 전에 알릴지, 예 [0,1,2] — 없으면 DEFAULT_REMINDERS),
 *   editedBy?(마지막으로 바꾼 기기 id), editor?(그 사람 이름)
 * 기기 문서  rooms/{방}/devices/{기기id}
 *   token, platform('android'|'web'), enabled, changeAlerts, remindTime('HH:MM'), tz, name, lastRemind?
 */

const DEFAULT_REMINDERS = [0, 1, 2];
const MAX_REMINDER_DAYS = 7;
// 이 필드만 바뀐 수정은 알리지 않는다 (삭제 직전에 「누가 지웠는지」 적는 쓰기 등)
const META_FIELDS = new Set(['updatedAt', 'createdAt', 'editedBy', 'editor']);
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const REMIND_WINDOW_MIN = 15; // 정한 시각부터 15분 안에 한 번 (스케줄러가 조금 늦게 돌아도 놓치지 않게)

function isDateKey(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function shortDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return m + '/' + d + '(' + WEEKDAYS[wd] + ')';
}

function reminderDays(ev) {
  const list = Array.isArray(ev && ev.reminders) ? ev.reminders : DEFAULT_REMINDERS;
  const out = [];
  for (const v of list) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n <= MAX_REMINDER_DAYS && !out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}

function whenLabel(ev) {
  if (!ev || !isDateKey(ev.date)) return '';
  let s = shortDate(ev.date);
  if (isDateKey(ev.endDate) && ev.endDate > ev.date) s += '~' + shortDate(ev.endDate);
  if (!ev.allDay && ev.startTime) s += ' ' + ev.startTime;
  return s;
}

function sameContent(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    if (META_FIELDS.has(k)) continue;
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}

/**
 * 일정 문서 변경 → 알릴 내용. 알릴 것이 없으면 null.
 * before/after: 문서 데이터(없으면 null)
 */
function describeChange(before, after) {
  if (!before && !after) return null;
  let type;
  if (!before) type = 'add';
  else if (!after) type = 'delete';
  else if (sameContent(before, after)) return null;
  else type = 'edit';

  const ev = after || before;
  const src = type === 'delete' ? before : after;
  const by = (src && src.editedBy) || '';
  const name = String((src && (src.editor || (type === 'add' ? src.author : ''))) || '').trim();
  const who = name && name !== '익명' ? name + '님이' : '누군가';
  const verb = { add: '추가했어요', edit: '수정했어요', delete: '삭제했어요' }[type];
  const head = { add: '새 일정', edit: '일정 수정', delete: '일정 삭제' }[type];
  const title = String(ev.title || '제목 없음');
  const when = whenLabel(ev);
  return {
    type,
    by,
    title: '📅 ' + head,
    body: who + ' 「' + title + '」 일정을 ' + verb + (when ? ' · ' + when : ''),
    date: isDateKey(ev.date) ? ev.date : ''
  };
}

/** 이 기기가 변경 알림을 받아야 하는지 */
function wantsChangeAlert(device, deviceId, by) {
  if (!device || !device.token) return false;
  if (device.enabled === false || device.changeAlerts === false) return false;
  return deviceId !== by; // 바꾼 사람 자신에게는 보내지 않는다
}

/** 기기의 현지 날짜·분 (tz 가 이상하면 서울) */
function localNow(now, tz) {
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
  } catch (e) {
    return localNow(now, 'Asia/Seoul');
  }
  const p = {};
  for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
  return { date: p.year + '-' + p.month + '-' + p.day, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

function parseTime(v) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9 * 60; // 기본 오전 9시
}

/** 지금 미리 알림을 보낼 차례면 그 기기의 현지 날짜, 아니면 null */
function remindDueDate(device, now) {
  if (!device || !device.token || device.enabled === false) return null;
  const local = localNow(now, device.tz);
  const diff = (local.minutes - parseTime(device.remindTime) + 1440) % 1440;
  if (diff >= REMIND_WINDOW_MIN) return null;
  // 자정 바로 뒤로 넘어간 경우(23:55 설정, 00:05 실행)에는 어제 날짜로 본다
  const date = local.minutes < diff ? addDays(local.date, -1) : local.date;
  if (device.lastRemind === date) return null;
  return date;
}

/**
 * 오늘(localDate) 보낼 미리 알림 묶음. 며칠 전인지(0=오늘,1=내일…)별로 하나씩.
 * @returns [{days, title, body, date}]
 */
function buildReminders(events, localDate) {
  const groups = new Map();
  for (const ev of events) {
    if (!ev || !isDateKey(ev.date)) continue;
    for (const d of reminderDays(ev)) {
      if (ev.date === addDays(localDate, d)) {
        if (!groups.has(d)) groups.set(d, []);
        groups.get(d).push(ev);
      }
    }
  }
  const out = [];
  for (const d of [...groups.keys()].sort((a, b) => a - b)) {
    const list = groups.get(d).sort((a, b) => {
      const at = a.allDay ? '' : (a.startTime || '99:99');
      const bt = b.allDay ? '' : (b.startTime || '99:99');
      return at < bt ? -1 : at > bt ? 1 : String(a.title).localeCompare(String(b.title), 'ko');
    });
    const label = d === 0 ? '오늘' : d === 1 ? '내일' : d === 2 ? '모레' : d + '일 후';
    const date = addDays(localDate, d);
    const items = list.map((ev) => {
      let s = String(ev.title || '제목 없음');
      if (!ev.allDay && ev.startTime) s = ev.startTime + ' ' + s;
      if (isDateKey(ev.endDate) && ev.endDate > ev.date) s += ' (~' + shortDate(ev.endDate) + ')';
      return s;
    });
    let body = items.slice(0, 5).join(' · ');
    if (items.length > 5) body += ' 외 ' + (items.length - 5) + '개';
    out.push({ days: d, title: '⏰ ' + label + ' 일정 · ' + shortDate(date), body, date });
  }
  return out;
}

module.exports = {
  DEFAULT_REMINDERS, MAX_REMINDER_DAYS, REMIND_WINDOW_MIN,
  addDays, shortDate, reminderDays, whenLabel, describeChange, wantsChangeAlert,
  localNow, parseTime, remindDueDate, buildReminders
};
