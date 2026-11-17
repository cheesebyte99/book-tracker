'use strict';
/**
 * 우리들의 캘린더 — 푸시 알림 (Firebase Cloud Functions 2세대)
 *
 * 1) eventChanged : 일정이 추가·수정·삭제되면 같은 방의 다른 기기에 바로 알린다.
 * 2) dailyReminders: 5분마다 돌며, 각 기기가 정한 「당일 알림 시간」이 된 기기에
 *    오늘·내일·모레… 일정(일정마다 고른 「며칠 전」)을 알린다.
 * 받을 수 없는 토큰(앱 삭제 등)은 기기 문서를 지워 정리한다.
 */
const { setGlobalOptions } = require('firebase-functions');
const { onDocumentWritten } = require('firebase-functions/firestore');
const { onSchedule } = require('firebase-functions/scheduler');
const logger = require('firebase-functions/logger');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const logic = require('./logic');

// Firestore 데이터베이스와 같은 지역에서 돌린다 (배포 때 확인한 값)
const REGION = process.env.FUNCTIONS_REGION || 'asia-northeast3';
const APP_URL = 'https://cheesebyte99.github.io/book-tracker/calendar/';
const ICON_URL = APP_URL + 'icon-192.png';

setGlobalOptions({ region: REGION, maxInstances: 3 });
initializeApp();
const db = getFirestore();

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
]);

function buildMessage(device, roomId, note) {
  const link = APP_URL + '?room=' + encodeURIComponent(roomId) + (note.date ? '&date=' + note.date : '');
  const data = { room: roomId, date: note.date || '', link };
  const msg = { token: device.token, notification: { title: note.title, body: note.body }, data };
  if (device.platform === 'android') {
    const n = { channelId: 'calendar' };
    if (note.tag) n.tag = note.tag;
    msg.android = { priority: 'high', notification: n };
  } else {
    const n = { icon: ICON_URL, badge: ICON_URL };
    if (note.tag) n.tag = note.tag;
    msg.webpush = { headers: { Urgency: 'high' }, notification: n, fcmOptions: { link } };
  }
  return msg;
}

/** targets: [{ref, data}] 기기 문서 — 실패한 토큰은 지우고 t.dead 로 표시한다 */
async function sendTo(targets, roomId, note) {
  if (!targets.length) return 0;
  const messages = targets.map((t) => buildMessage(t.data, roomId, note));
  const res = await getMessaging().sendEach(messages);
  const cleanup = [];
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error && r.error.code;
      logger.warn('push failed', { room: roomId, device: targets[i].ref.id, code });
      if (DEAD_TOKEN_CODES.has(code)) {
        targets[i].dead = true;
        cleanup.push(targets[i].ref.delete().catch(() => {}));
      }
    }
  });
  await Promise.all(cleanup);
  return res.successCount;
}

exports.eventChanged = onDocumentWritten('rooms/{roomId}/events/{eventId}', async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.exists ? change.before.data() : null;
  const after = change.after.exists ? change.after.data() : null;
  const note = logic.describeChange(before, after);
  if (!note) return;
  const roomId = event.params.roomId;
  const snap = await db.collection('rooms').doc(roomId).collection('devices').get();
  const targets = [];
  snap.forEach((d) => {
    if (logic.wantsChangeAlert(d.data(), d.id, note.by)) targets.push({ ref: d.ref, data: d.data() });
  });
  note.tag = 'ev-' + event.params.eventId;
  const sent = await sendTo(targets, roomId, note);
  logger.info('change alert', { room: roomId, type: note.type, targets: targets.length, sent });
});

exports.dailyReminders = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Asia/Seoul' }, async () => {
  const now = new Date();
  const devices = await db.collectionGroup('devices').get();
  // 방별로 「지금 보낼 차례인 기기」를 모은다
  const byRoom = new Map();
  devices.forEach((d) => {
    const room = d.ref.parent.parent;
    if (!room || room.parent.id !== 'rooms') return;
    const date = logic.remindDueDate(d.data(), now);
    if (!date) return;
    if (!byRoom.has(room.id)) byRoom.set(room.id, []);
    byRoom.get(room.id).push({ ref: d.ref, data: d.data(), date });
  });

  for (const [roomId, due] of byRoom) {
    const dates = due.map((t) => t.date).sort();
    const from = dates[0];
    const to = logic.addDays(dates[dates.length - 1], logic.MAX_REMINDER_DAYS);
    const evSnap = await db.collection('rooms').doc(roomId).collection('events')
      .where('date', '>=', from).where('date', '<=', to).get();
    const events = evSnap.docs.map((d) => d.data());

    for (const t of due) {
      const notes = logic.buildReminders(events, t.date);
      for (const note of notes) {
        if (t.dead) break;
        note.tag = 'remind-' + note.date;
        await sendTo([t], roomId, note);
      }
      // 일정이 없어도 오늘은 끝 — 같은 날 두 번 보내지 않게 (지운 기기는 되살리지 않는다)
      if (!t.dead) await t.ref.update({ lastRemind: t.date }).catch(() => {});
      logger.info('reminders', { room: roomId, device: t.ref.id, date: t.date, notes: notes.length });
    }
  }
});
