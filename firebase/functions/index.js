'use strict';
/**
 * 우리들의 캘린더 — 푸시 알림 (Firebase Cloud Functions 2세대)
 *
 * 1) eventChanged : 일정이 추가·수정·삭제되면 같은 방의 다른 기기에 바로 알린다.
 * 2) dailyReminders: 5분마다 돌며, 각 기기가 정한 「당일 알림 시간」이 된 기기에
 *    오늘·내일·모레… 일정(일정마다 고른 「며칠 전」)을 알린다.
 * 우리 사진첩(albums/…)
 * 3) albumDayChanged   : 추억이 새로 담기거나 사진이 늘면 같은 앨범의 다른 기기에 바로 알린다.
 * 4) albumAnniversaries: 5분마다 돌며, 각 기기의 알림 시간이 되면 100일·n주년·결혼기념일을
 *    당일·하루 전·일주일 전에 알린다.
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
const albumLogic = require('./album-logic');

// Firestore 데이터베이스와 같은 지역에서 돌린다 (배포 때 확인한 값)
const REGION = process.env.FUNCTIONS_REGION || 'asia-northeast3';
const APP_URL = 'https://cheesebyte99.github.io/book-tracker/calendar/';
const ICON_URL = APP_URL + 'icon-192.png';
const ALBUM_URL = 'https://cheesebyte99.github.io/book-tracker/photo-album/';

// 앱마다 다른 것: 알림을 누르면 열 주소, 안드로이드 알림 채널, 웹 알림 아이콘
const CALENDAR_APP = { url: APP_URL, channel: 'calendar', icon: ICON_URL, withDate: true };
const ALBUM_APP = { url: ALBUM_URL, channel: 'album', icon: ALBUM_URL + 'icon-192.png', withDate: false };

setGlobalOptions({ region: REGION, maxInstances: 3 });
initializeApp();
const db = getFirestore();

const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
]);

function buildMessage(device, roomId, note, app) {
  const link = app.url + '?room=' + encodeURIComponent(roomId) + (app.withDate && note.date ? '&date=' + note.date : '');
  const data = { room: roomId, date: note.date || '', link };
  const msg = { token: device.token, notification: { title: note.title, body: note.body }, data };
  if (device.platform === 'android') {
    const n = { channelId: app.channel };
    if (note.tag) n.tag = note.tag;
    msg.android = { priority: 'high', notification: n };
  } else {
    const n = { icon: app.icon, badge: app.icon };
    if (note.tag) n.tag = note.tag;
    msg.webpush = { headers: { Urgency: 'high' }, notification: n, fcmOptions: { link } };
  }
  return msg;
}

/** targets: [{ref, data}] 기기 문서 — 실패한 토큰은 지우고 t.dead 로 표시한다 */
async function sendTo(targets, roomId, note, app = CALENDAR_APP) {
  if (!targets.length) return 0;
  const messages = targets.map((t) => buildMessage(t.data, roomId, note, app));
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

// ---------------------------------------------------------------- 우리 사진첩

exports.albumDayChanged = onDocumentWritten('albums/{albumId}/days/{dayId}', async (event) => {
  const change = event.data;
  if (!change) return;
  const before = change.before.exists ? change.before.data() : null;
  const after = change.after.exists ? change.after.data() : null;
  const note = albumLogic.describeDayChange(before, after);
  if (!note) return;
  const albumId = event.params.albumId;
  const snap = await db.collection('albums').doc(albumId).collection('devices').get();
  const targets = [];
  snap.forEach((d) => {
    if (albumLogic.wantsDayAlert(d.data(), d.id, note.by)) targets.push({ ref: d.ref, data: d.data() });
  });
  note.tag = 'day-' + event.params.dayId;
  const sent = await sendTo(targets, albumId, note, ALBUM_APP);
  logger.info('album alert', { album: albumId, type: note.type, targets: targets.length, sent });
});

exports.albumAnniversaries = onSchedule({ schedule: 'every 5 minutes', timeZone: 'Asia/Seoul' }, async () => {
  const now = new Date();
  const devices = await db.collectionGroup('devices').get();
  const byAlbum = new Map();
  devices.forEach((d) => {
    const album = d.ref.parent.parent;
    if (!album || album.parent.id !== 'albums') return;
    if (!albumLogic.wantsAnnivAlert(d.data())) return;
    const date = logic.remindDueDate(d.data(), now);
    if (!date) return;
    if (!byAlbum.has(album.id)) byAlbum.set(album.id, []);
    byAlbum.get(album.id).push({ ref: d.ref, data: d.data(), date });
  });

  for (const [albumId, due] of byAlbum) {
    const albumSnap = await db.collection('albums').doc(albumId).get();
    const dates = albumSnap.exists ? { since: albumSnap.get('since'), wedding: albumSnap.get('wedding') } : {};
    for (const t of due) {
      const notes = albumLogic.buildAnniversaryNotes(dates, t.date);
      for (const note of notes) {
        if (t.dead) break;
        note.tag = 'anniv-' + note.date;
        await sendTo([t], albumId, note, ALBUM_APP);
      }
      // 기념일이 없어도 오늘은 끝 — 같은 날 두 번 보내지 않게 (지운 기기는 되살리지 않는다)
      if (!t.dead) await t.ref.update({ lastRemind: t.date }).catch(() => {});
      if (notes.length) logger.info('anniversary', { album: albumId, device: t.ref.id, date: t.date, notes: notes.length });
    }
  }
});
