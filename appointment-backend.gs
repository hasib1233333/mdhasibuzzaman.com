/**
 * ═══════════════════════════════════════════════════════════════
 *  APPOINTMENT BACKEND — Google Apps Script
 *  Md Hasibuzzaman | hsbuzzaman@gmail.com
 * ═══════════════════════════════════════════════════════════════
 */

const ADMIN_EMAIL    = 'hsbuzzaman@gmail.com';
const ADMIN_NAME     = 'Md Hasibuzzaman';
const SHEET_NAME     = 'Appointments';
const SCHED_SHEET    = 'Schedule';
const CALENDAR_ID    = 'primary';
const MEETING_MINS   = 30;
const ALLOWED_ORIGIN = '*';

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'approve')      return handleApprove(e);
  if (action === 'decline')      return handleDecline(e);
  if (action === 'suggest')      return handleSuggest(e);
  if (action === 'getSchedule')  return handleGetSchedule();
  if (action === 'getDuration')  return handleGetDuration();
  return jsonResponse({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'request')      return handleRequest(data);
    if (data.action === 'saveSchedule') return handleSaveSchedule(data);
    if (data.action === 'saveDuration') return handleSaveDuration(data);
    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch(err) {
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

// ══════════════════════════════════════
//  SCHEDULE — get / save
// ══════════════════════════════════════
function handleGetSchedule() {
  const sheet = getOrCreateSchedSheet();
  const rows = sheet.getDataRange().getValues();
  // rows: [dow, name, slotsJson]
  const sched = {};
  for (let i = 1; i < rows.length; i++) {
    const dow   = Number(rows[i][0]);
    const name  = rows[i][1];
    const slots = JSON.parse(rows[i][2] || '[]');
    sched[dow]  = { name, slots };
  }
  return jsonResponse({ ok: true, schedule: sched });
}

function handleSaveSchedule(data) {
  const sched = data.schedule;
  if (!sched) return jsonResponse({ ok: false, error: 'No schedule provided' });
  const sheet = getOrCreateSchedSheet();
  // Clear and rewrite (keep header)
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
  const dayOrder = [1,2,3,4,5,6,0];
  const rows = dayOrder.map(d => {
    const day = sched[d] || { name: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d], slots: [] };
    return [d, day.name, JSON.stringify(day.slots || [])];
  });
  sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  return jsonResponse({ ok: true });
}

function handleGetDuration() {
  const props = PropertiesService.getScriptProperties();
  const dur = parseInt(props.getProperty('meeting_duration') || '30');
  return jsonResponse({ ok: true, duration: dur });
}

function handleSaveDuration(data) {
  const dur = parseInt(data.duration || '30');
  PropertiesService.getScriptProperties().setProperty('meeting_duration', String(dur));
  return jsonResponse({ ok: true });
}

function getOrCreateSchedSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SCHED_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(SCHED_SHEET);
    sheet.appendRow(['DayOfWeek', 'Name', 'SlotsJSON']);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,3).setFontWeight('bold').setBackground('#065E68').setFontColor('#fff');
    // Write default schedule
    const defaults = [
      [1,'Mon',  JSON.stringify([{start:'09:00',end:'18:00'}])],
      [2,'Tue',  JSON.stringify([{start:'09:00',end:'18:00'}])],
      [3,'Wed',  JSON.stringify([{start:'11:00',end:'12:00'}])],
      [4,'Thu',  JSON.stringify([{start:'11:00',end:'12:00'}])],
      [5,'Fri',  JSON.stringify([{start:'10:00',end:'18:00'}])],
      [6,'Sat',  JSON.stringify([{start:'09:00',end:'12:00'},{start:'15:00',end:'16:00'}])],
      [0,'Sun',  JSON.stringify([{start:'09:00',end:'12:00'},{start:'14:30',end:'16:30'}])]
    ];
    sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);
  }
  return sheet;
}

// ══════════════════════════════════════
//  1. NEW APPOINTMENT REQUEST
// ══════════════════════════════════════
function handleRequest(data) {
  const { name, email, date, time, timeRange, purpose, message } = data;
  const apptId = 'APT-' + Date.now().toString(36).toUpperCase();
  const created = new Date().toISOString();

  const sheet = getOrCreateSheet();
  sheet.appendRow([
    apptId, name, email, date, time, timeRange, purpose,
    message || '', 'pending', '', created, ''
  ]);

  const scriptUrl = ScriptApp.getService().getUrl();
  const approveUrl = scriptUrl + '?action=approve&id=' + apptId;
  const declineUrl = scriptUrl + '?action=decline&id=' + apptId;
  const formattedDate = formatDateStr(date);

  const adminSubject = '📅 New Appointment Request — ' + name;
  const adminBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#065E68,#097C87);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:1.4rem;">New Appointment Request</h2>
    <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:.9rem;">Someone wants to meet with you</p>
  </div>
  <div style="background:#fff;border:2px solid #cde8ea;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
    <table style="width:100%;border-collapse:collapse;font-size:.95rem;">
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;width:140px;">Name</td><td style="padding:8px 0;color:#1a1a1a;font-weight:600;">${escHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Email</td><td style="padding:8px 0;"><a href="mailto:${escHtml(email)}" style="color:#097C87;">${escHtml(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Date</td><td style="padding:8px 0;color:#1a1a1a;">${formattedDate}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Time (TST)</td><td style="padding:8px 0;color:#1a1a1a;">${escHtml(timeRange)}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Purpose</td><td style="padding:8px 0;color:#1a1a1a;">${escHtml(purpose)}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;vertical-align:top;">Message</td><td style="padding:8px 0;color:#1a1a1a;">${escHtml(message||'(none)')}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Request ID</td><td style="padding:8px 0;color:#aaa;font-family:monospace;font-size:.85rem;">${apptId}</td></tr>
    </table>
    <div style="margin-top:24px;display:flex;gap:12px;">
      <a href="${approveUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#065E68,#23CED9);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:.95rem;">✓ Approve &amp; Create Meet Link</a>
      <a href="${declineUrl}" style="display:inline-block;padding:12px 28px;background:#f1f5f9;color:#666;text-decoration:none;border-radius:10px;font-weight:700;font-size:.95rem;border:2px solid #e2e8f0;">✗ Decline</a>
    </div>
    <p style="font-size:.8rem;color:#aaa;margin-top:16px;">You can also manage appointments from your website admin panel.</p>
  </div>
</div>`;
  GmailApp.sendEmail(ADMIN_EMAIL, adminSubject, '', { htmlBody: adminBody, name: ADMIN_NAME + ' — Appointment System' });

  const reqSubject = '✅ Appointment Request Received — ' + ADMIN_NAME;
  const reqBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#065E68,#097C87);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:1.4rem;">Request Received!</h2>
    <p style="color:rgba(255,255,255,.8);margin:6px 0 0;">Your appointment request has been sent successfully.</p>
  </div>
  <div style="background:#fff;border:2px solid #cde8ea;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
    <p style="color:#1a1a1a;">Hi <strong>${escHtml(name)}</strong>,</p>
    <p style="color:#4a5a5c;line-height:1.7;">Thank you for your appointment request. I have received it and will review it shortly. If approved, you will receive a <strong>Google Meet link</strong> at this email address.</p>
    <div style="background:#F2FAFA;border:2px solid #cde8ea;border-radius:12px;padding:20px;margin:20px 0;">
      <h3 style="color:#065E68;margin:0 0 12px;font-size:1rem;">Your Request Details</h3>
      <table style="width:100%;font-size:.9rem;border-collapse:collapse;">
        <tr><td style="padding:5px 0;color:#4a5a5c;font-weight:700;width:120px;">Date</td><td style="padding:5px 0;color:#1a1a1a;">${formattedDate}</td></tr>
        <tr><td style="padding:5px 0;color:#4a5a5c;font-weight:700;">Time (TST)</td><td style="padding:5px 0;color:#1a1a1a;">${escHtml(timeRange)}</td></tr>
        <tr><td style="padding:5px 0;color:#4a5a5c;font-weight:700;">Purpose</td><td style="padding:5px 0;color:#1a1a1a;">${escHtml(purpose)}</td></tr>
      </table>
    </div>
    <p style="color:#4a5a5c;font-size:.88rem;">Expected response: within 24 hours.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="color:#aaa;font-size:.8rem;margin:0;">Md Hasibuzzaman · Ph.D. Candidate, EECS · National Taipei University, Taiwan</p>
  </div>
</div>`;
  GmailApp.sendEmail(email, reqSubject, '', { htmlBody: reqBody, name: ADMIN_NAME });

  return jsonResponse({ ok: true, id: apptId });
}

// ══════════════════════════════════════
//  2. APPROVE
// ══════════════════════════════════════
function handleApprove(e) {
  const apptId = e.parameter.id;
  if (!apptId) return htmlResponse('❌ Missing appointment ID.');

  const sheet = getOrCreateSheet();
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');
  const statusCol = headers.indexOf('Status');
  const meetCol   = headers.indexOf('MeetLink');

  let rowIndex = -1, appt = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === apptId) { rowIndex = i + 1; appt = data[i]; break; }
  }
  if (!appt) return htmlResponse('❌ Appointment not found: ' + apptId);
  if (appt[statusCol] === 'approved') return htmlResponse('ℹ️ Already approved. Meet link: ' + appt[meetCol]);

  const dateRaw  = appt[headers.indexOf('Date')];
  const timeRaw  = appt[headers.indexOf('Time')];
  const name     = appt[headers.indexOf('Name')];
  const email    = appt[headers.indexOf('Email')];
  const purpose  = appt[headers.indexOf('Purpose')];
  const timeRange= appt[headers.indexOf('TimeRange')];

  const dateStr = toDateString(dateRaw);
  const timeStr = toTimeString(timeRaw);

  const [y,m,d]  = dateStr.split('-').map(Number);
  const [hh,mm]  = timeStr.split(':').map(Number);
  const startUTC = new Date(Date.UTC(y, m-1, d, hh - 8, mm));
  const endUTC   = new Date(startUTC.getTime() + MEETING_MINS * 60000);

  const calendar = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  const event = calendar.createEvent(
    'Meeting with ' + name + ' — ' + purpose,
    startUTC, endUTC,
    {
      description: 'Appointment Purpose: ' + purpose + '\nRequester: ' + name + ' (' + email + ')\nRequest ID: ' + apptId,
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      conferenceData: true
    }
  );

  let meetLink = '';
  try {
    const calEvent = Calendar.Events.patch(
      { conferenceData: { createRequest: { requestId: apptId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } },
      CALENDAR_ID, event.getId().replace('@google.com',''),
      { conferenceDataVersion: 1 }
    );
    meetLink = calEvent.hangoutLink || calEvent.conferenceData.entryPoints[0].uri;
  } catch(err) {
    meetLink = event.getHangoutLink() || 'https://meet.google.com';
  }

  sheet.getRange(rowIndex, statusCol + 1).setValue('approved');
  sheet.getRange(rowIndex, meetCol + 1).setValue(meetLink);

  const formattedDate = formatDateStr(dateStr);

  const adminSubject = '✅ Approved — ' + name + ' on ' + formattedDate;
  const adminBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#065E68,#097C87);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;">Appointment Approved ✓</h2>
  </div>
  <div style="background:#fff;border:2px solid #cde8ea;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
    <table style="width:100%;font-size:.95rem;border-collapse:collapse;">
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;width:140px;">Requester</td><td style="padding:8px 0;">${escHtml(name)}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Email</td><td style="padding:8px 0;"><a href="mailto:${escHtml(email)}" style="color:#097C87;">${escHtml(email)}</a></td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Date</td><td style="padding:8px 0;">${formattedDate}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Time</td><td style="padding:8px 0;">${escHtml(timeRange)}</td></tr>
      <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Meet Link</td><td style="padding:8px 0;"><a href="${meetLink}" style="color:#097C87;">${meetLink}</a></td></tr>
    </table>
    <a href="${meetLink}" style="display:inline-block;margin-top:20px;padding:12px 28px;background:linear-gradient(135deg,#065E68,#23CED9);color:#fff;text-decoration:none;border-radius:10px;font-weight:800;">Join Google Meet</a>
  </div>
</div>`;
  GmailApp.sendEmail(ADMIN_EMAIL, adminSubject, '', { htmlBody: adminBody, name: ADMIN_NAME + ' — Appointment System' });

  const reqSubject = '🎉 Appointment Approved — Google Meet Link Inside';
  const reqBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#065E68,#097C87);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;">Your Appointment is Confirmed! 🎉</h2>
  </div>
  <div style="background:#fff;border:2px solid #cde8ea;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
    <p>Hi <strong>${escHtml(name)}</strong>,</p>
    <p style="color:#4a5a5c;line-height:1.7;">Your appointment has been <strong style="color:#166534;">approved</strong>.</p>
    <div style="background:#F2FAFA;border:2px solid #cde8ea;border-radius:12px;padding:20px;margin:20px 0;">
      <table style="width:100%;font-size:.95rem;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;width:120px;">Date</td><td style="padding:8px 0;">${formattedDate}</td></tr>
        <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Time (TST)</td><td style="padding:8px 0;">${escHtml(timeRange)}</td></tr>
        <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Duration</td><td style="padding:8px 0;">${MEETING_MINS} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#4a5a5c;font-weight:700;">Host</td><td style="padding:8px 0;">${ADMIN_NAME}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0;">
      <a href="${meetLink}" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#065E68,#23CED9);color:#fff;text-decoration:none;border-radius:12px;font-weight:900;font-size:1.1rem;">Join Google Meet</a>
      <p style="color:#aaa;font-size:.82rem;margin-top:10px;">${meetLink}</p>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="color:#aaa;font-size:.8rem;margin:0;">Md Hasibuzzaman · National Taipei University, Taiwan</p>
  </div>
</div>`;
  GmailApp.sendEmail(email, reqSubject, '', { htmlBody: reqBody, name: ADMIN_NAME });

  return htmlResponse(`
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:60px auto;text-align:center;padding:40px;background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);">
      <div style="font-size:3rem;margin-bottom:16px;">✅</div>
      <h2 style="color:#065E68;">Appointment Approved!</h2>
      <p style="color:#4a5a5c;">Meet link sent to <strong>${escHtml(email)}</strong>.</p>
      <div style="margin-top:24px;padding:16px;background:#F2FAFA;border-radius:12px;border:2px solid #cde8ea;">
        <a href="${meetLink}" style="color:#097C87;font-weight:700;word-break:break-all;">${meetLink}</a>
      </div>
      <p style="color:#aaa;font-size:.8rem;margin-top:20px;">You can close this tab.</p>
    </div>`);
}

// ══════════════════════════════════════
//  3. DECLINE
// ══════════════════════════════════════
function handleDecline(e) {
  const apptId = e.parameter.id;
  if (!apptId) return htmlResponse('❌ Missing ID.');

  const sheet   = getOrCreateSheet();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');
  const statusCol = headers.indexOf('Status');
  const nameCol = headers.indexOf('Name');
  const emailCol = headers.indexOf('Email');

  let rowIndex = -1, appt = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === apptId) { rowIndex = i + 1; appt = data[i]; break; }
  }
  if (!appt) return htmlResponse('❌ Appointment not found.');
  if (appt[statusCol] === 'declined') return htmlResponse('ℹ️ Already declined.');

  sheet.getRange(rowIndex, statusCol + 1).setValue('declined');

  const name  = appt[nameCol];
  const email = appt[emailCol];

  const reqSubject = 'Appointment Request Update — ' + ADMIN_NAME;
  const reqBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#065E68,#097C87);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;">Appointment Update</h2>
  </div>
  <div style="background:#fff;border:2px solid #cde8ea;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
    <p>Hi <strong>${escHtml(name)}</strong>,</p>
    <p style="color:#4a5a5c;line-height:1.7;">Thank you for your interest. Unfortunately I am unable to accommodate your request at the selected time. Please feel free to submit a new request or contact me at <a href="mailto:${ADMIN_EMAIL}" style="color:#097C87;">${ADMIN_EMAIL}</a>.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="color:#aaa;font-size:.8rem;margin:0;">Md Hasibuzzaman · National Taipei University, Taiwan</p>
  </div>
</div>`;
  GmailApp.sendEmail(email, reqSubject, '', { htmlBody: reqBody, name: ADMIN_NAME });

  return htmlResponse(`
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:60px auto;text-align:center;padding:40px;background:#fff;border-radius:20px;box-shadow:0 8px 40px rgba(0,0,0,.12);">
      <div style="font-size:3rem;margin-bottom:16px;">✗</div>
      <h2 style="color:#4a5a5c;">Appointment Declined</h2>
      <p style="color:#4a5a5c;">${escHtml(name)} has been notified.</p>
      <p style="color:#aaa;font-size:.8rem;margin-top:20px;">You can close this tab.</p>
    </div>`);
}

// ══════════════════════════════════════
//  4. SUGGEST ALTERNATE TIME
// ══════════════════════════════════════
function handleSuggest(e) {
  const apptId = e.parameter.id;
  const sdate  = e.parameter.sdate;
  const stime  = e.parameter.stime;
  const smsg   = e.parameter.smsg || '';
  if (!apptId || !sdate || !stime) return jsonResponse({ ok: false, error: 'Missing params' });

  const sheet = getOrCreateSheet();
  const data  = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');

  let appt = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === apptId) { appt = data[i]; break; }
  }
  if (!appt) return jsonResponse({ ok: false, error: 'Not found' });

  const name  = appt[headers.indexOf('Name')];
  const email = appt[headers.indexOf('Email')];
  const [sh, sm] = stime.split(':').map(Number);
  const endTotal = sh*60 + sm + 30;
  const suggestedRange = fmt12h(sh, sm) + ' – ' + fmt12h(Math.floor(endTotal/60), endTotal%60);
  const formattedDate = formatDateStr(sdate);

  const subject = '📅 Suggested Meeting Time — ' + ADMIN_NAME;
  const body = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:linear-gradient(135deg,#065E68,#097C87);padding:28px 32px;border-radius:12px 12px 0 0;">
    <h2 style="color:#fff;margin:0;">New Time Suggestion</h2>
    <p style="color:rgba(255,255,255,.8);margin:6px 0 0;">A new time has been proposed for your appointment.</p>
  </div>
  <div style="background:#fff;border:2px solid #cde8ea;border-top:none;padding:28px 32px;border-radius:0 0 12px 12px;">
    <p>Hi <strong>${escHtml(name)}</strong>,</p>
    <p style="color:#4a5a5c;line-height:1.7;">The originally requested time is not available. Here is a suggested alternate time:</p>
    <div style="background:#F2FAFA;border:2px solid #23CED9;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <div style="font-size:1.3rem;font-weight:900;color:#065E68;">${formattedDate}</div>
      <div style="font-size:1.1rem;font-weight:700;color:#097C87;margin-top:4px;">${suggestedRange} (TST)</div>
    </div>
    ${smsg ? `<p style="color:#4a5a5c;line-height:1.7;">${escHtml(smsg)}</p>` : ''}
    <p style="color:#4a5a5c;font-size:.88rem;">Please reply to this email to confirm or request a different time.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
    <p style="color:#aaa;font-size:.8rem;margin:0;">Md Hasibuzzaman · National Taipei University, Taiwan</p>
  </div>
</div>`;
  GmailApp.sendEmail(email, subject, '', { htmlBody: body, name: ADMIN_NAME });
  return jsonResponse({ ok: true });
}

function fmt12h(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return h12 + (m > 0 ? ':' + String(m).padStart(2,'0') : '') + ' ' + ampm;
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['ID','Name','Email','Date','Time','TimeRange','Purpose','Message','Status','MeetLink','Created','Updated']);
    sheet.setFrozenRows(1);
    sheet.getRange(1,1,1,12).setFontWeight('bold').setBackground('#065E68').setFontColor('#ffffff');
  }
  return sheet;
}

function toDateString(val) {
  if (!val) return '';
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(val).trim();
}

function toTimeString(val) {
  if (!val) return '00:00';
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, '0');
    const m = String(val.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  return String(val).trim();
}

function formatDateStr(dateStr) {
  try {
    const normalized = toDateString(dateStr);
    const [y,m,d] = normalized.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const dt = new Date(y, m-1, d);
    return days[dt.getDay()] + ', ' + months[m-1] + ' ' + d + ', ' + y;
  } catch(e) { return String(dateStr); }
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse(html) {
  return HtmlService.createHtmlOutput(html);
}
