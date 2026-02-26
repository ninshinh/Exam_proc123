// Apps Script: exam webapp
// Sheet layout (rows):
//   Row 1: Exam Title metadata
//   Row 2: Exam Description metadata
//   Row 3: Teacher metadata
//   Row 4: Column headers
//   Row 5+: Question data (cols A-E) + Student results (cols F-N)
//
// Column layout (row 4 headers):
//   A: Number   B: Question   C: Answer   D: Timer Seconds   E: Entire Exam Timer(Minutes)
//   F: LAST NAME   G: FIRST NAME   H: SECTION
//   I: Score   J: Correct Answer   K: Mistakes   L: Start Time   M: End Time   N: Date

var DATA_START_ROW = 5;

function doGet(e) { return doPost(e); }

function doPost(e) {
  let params = {};
  try {
    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      params = e.parameter;
    } else if (e && e.postData) {
      if (e.postData.type === 'application/json') {
        params = JSON.parse(e.postData.contents);
      } else if (e.postData.contents) {
        try { params = JSON.parse(e.postData.contents); }
        catch (je) { params = e.parameter || {}; }
      }
    } else {
      params = e.parameter || {};
    }
  } catch (err) {
    return json({ success: false, error: 'Parameter parsing error: ' + err.toString() });
  }

  const action    = params.action;
  const sheetCode = params.code;
  const lastName  = params.lastName;
  const firstName = params.firstName;
  const section   = params.section || '';

  if (action === 'createExamSheet') {
    return createExamSheet(
      sheetCode,
      params.title       || '',
      params.description || '',
      params.teacher     || '',
      params.startTime   || '',
      params.endTime     || ''
    );
  }

  if (action === 'checkDuplicate') {
    if (!lastName || !firstName || !sheetCode) {
      return json({ exists: false, error: 'Missing lastName, firstName, or code' });
    }
    return checkDuplicate(sheetCode, lastName, firstName, section);
  }

  if (action === 'recordResultsFM') {
    return recordResultsFM(
      sheetCode, lastName, firstName, section,
      params.score    || '',
      params.correct  || '',
      params.mistakes || '',
      params.startTime|| '',
      params.endTime  || '',
      params.date     || ''
    );
  }

  if (action === 'getAllQuestionsAndAnswers' && sheetCode) {
    return getAllQuestionsAndAnswers(sheetCode);
  }

  if (action === 'repairSheet' && sheetCode) {
    return repairSheet(sheetCode);
  }

  if (action === 'logViolation') {
    return logViolation(
      sheetCode, lastName, firstName, section,
      params.violationType  || '',
      params.violationCount || 1,
      params.questionNumber || 'N/A',
      params.timestamp      || null
    );
  }

  if (action === 'recordGrade') {
    return recordGrade(sheetCode, lastName, firstName, section,
      params.submittedAnswers, params.startTime, params.endTime, params.date);
  }

  if (action === 'recordPartial') {
    return recordPartial(sheetCode, lastName, firstName, section,
      params.submittedAnswers || '{}', params.status || 'partial', params.timestamp || null);
  }

  return json({ error: 'Invalid action' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// CREATE EXAM SHEET TAB
// ============================================================================
function createExamSheet(sheetCode, title, description, teacher, startTime, endTime) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) {
    return json({ success: false, error: 'Lock timeout' });
  }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss.getSheetByName(sheetCode)) {
      lock.releaseLock();
      return json({ success: true, message: 'Sheet "' + sheetCode + '" already exists.' });
    }

    var sheet = ss.insertSheet(sheetCode);
    var BG_META  = '#1f3864';
    var FG_LABEL = '#ffd966';
    var FG_VALUE = '#ffffff';
    var NCOLS    = 14; // A–N

    // ── Rows 1–3: Metadata ───────────────────────────────────────────────────
    [['Exam Title', title || sheetCode],
     ['Exam Description', description || ''],
     ['Teacher', teacher || '']
    ].forEach(function(pair, i) {
      var row = i + 1;
      sheet.getRange(row, 1).setValue(pair[0])
        .setBackground(BG_META).setFontColor(FG_LABEL).setFontWeight('bold');
      sheet.getRange(row, 2, 1, NCOLS - 1).merge().setValue(pair[1])
        .setBackground(BG_META).setFontColor(FG_VALUE);
    });

    // ── Row 4: Column headers ────────────────────────────────────────────────
    var BG_HDR = '#1e5631';
    var headers = [
      'Number', 'Question', 'Answer', 'Timer Seconds', 'Entire Exam Timer(Minutes)',
      'LAST NAME', 'FIRST NAME', 'SECTION',
      'Score', 'Correct Answer', 'Mistakes', 'Start Time', 'End Time', 'Date'
    ];
    var hdrRange = sheet.getRange(4, 1, 1, headers.length);
    hdrRange.setValues([headers])
      .setBackground(BG_HDR).setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center');

    // ── Row 5: Placeholder question ──────────────────────────────────────────
    sheet.getRange(5, 1, 1, 3).setValues([['1', '(Enter your first question here)', 'A']]);
    sheet.getRange(5, 4).setValue(30);

    // ── Column widths ────────────────────────────────────────────────────────
    var widths = [70, 320, 80, 100, 160, 120, 120, 100, 70, 120, 80, 120, 120, 100];
    widths.forEach(function(w, i) { sheet.setColumnWidth(i + 1, w); });

    sheet.setFrozenRows(4);

    lock.releaseLock();
    return json({ success: true, message: 'Sheet "' + sheetCode + '" created.', sheetCode: sheetCode });
  } catch (err) {
    lock.releaseLock();
    return json({ success: false, error: err.toString() });
  }
}

// ============================================================================
// CHECK DUPLICATE  (checks col F = LAST NAME, col G = FIRST NAME, col H = SECTION)
// ============================================================================
function checkDuplicate(sheetCode, lastName, firstName, section) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetCode);
    if (!sheet) return json({ exists: false, error: 'Sheet not found: ' + sheetCode });

    var lastRow = sheet.getLastRow();
    if (lastRow < DATA_START_ROW) return json({ exists: false });

    var numRows = lastRow - DATA_START_ROW + 1;
    // Read cols F, G, H (6,7,8) — LAST NAME, FIRST NAME, SECTION
    var data = sheet.getRange(DATA_START_ROW, 6, numRows, 3).getValues();

    var normLast    = String(lastName  || '').toLowerCase().trim();
    var normFirst   = String(firstName || '').toLowerCase().trim();
    var normSection = String(section   || '').toLowerCase().trim();

    for (var i = 0; i < data.length; i++) {
      var rLast    = String(data[i][0] || '').toLowerCase().trim();
      var rFirst   = String(data[i][1] || '').toLowerCase().trim();
      var rSection = String(data[i][2] || '').toLowerCase().trim();

      // Match on last + first name; also match section if provided
      if (rLast === normLast && rFirst === normFirst) {
        if (!normSection || !rSection || rSection === normSection) {
          return json({ exists: true });
        }
      }
    }
    return json({ exists: false });
  } catch (err) {
    return json({ exists: false, error: err.toString() });
  }
}

// ============================================================================
// RECORD RESULTS TO COLUMNS F–N  (F=LAST, G=FIRST, H=SECTION, I–N=scores/times)
// ============================================================================
function recordResultsFM(sheetCode, lastName, firstName, section, score, correct, mistakes, startTime, endTime, date) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return json({ success: false, error: 'Lock timeout' }); }

  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetCode);
    if (!sheet) { lock.releaseLock(); return json({ success: false, error: 'Sheet "' + sheetCode + '" not found' }); }

    var lastRow   = sheet.getLastRow();
    var dataStart = DATA_START_ROW;
    var targetRow = dataStart;

    if (lastRow >= dataStart) {
      var colFData = sheet.getRange(dataStart, 6, lastRow - dataStart + 1, 1).getValues();
      targetRow = lastRow + 1;
      for (var i = 0; i < colFData.length; i++) {
        if (!colFData[i][0] || colFData[i][0] === '') {
          targetRow = dataStart + i;
          break;
        }
      }
    }

    // Ensure times have seconds
    var fmtTime = function(t) {
      var s = String(t || '');
      if (s && !s.match(/\d{1,2}:\d{2}:\d{2}/)) s = s + ':00';
      return s;
    };

    // Write F–N (cols 6–14): LAST NAME, FIRST NAME, SECTION, Score, Correct, Mistakes, Start, End, Date
    sheet.getRange(targetRow, 6, 1, 9).setValues([[
      String(lastName  || ''),  // F
      String(firstName || ''),  // G
      String(section   || ''),  // H
      String(score     || ''),  // I
      String(correct   || ''),  // J
      String(mistakes  || ''),  // K
      fmtTime(startTime),       // L
      fmtTime(endTime),         // M
      String(date      || '')   // N
    ]]);

    lock.releaseLock();
    return json({ success: true, row: targetRow, message: 'Results saved to row ' + targetRow });
  } catch (err) {
    lock.releaseLock();
    return json({ success: false, error: err.toString() });
  }
}

// ============================================================================
// LOG VIOLATION
// ============================================================================
function logViolation(sheetCode, lastName, firstName, section, violationType, violationCount, questionNumber, timestamp) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return json({ success: false, error: 'Lock timeout' }); }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var vSheet = ss.getSheetByName('Violations');
    if (!vSheet) {
      vSheet = ss.insertSheet('Violations');
      vSheet.getRange(1, 1, 1, 9).setValues([[
        'Timestamp', 'Test Code', 'Last Name', 'First Name', 'Section',
        'Violation Type', 'Violation #', 'Question #', 'Action Taken'
      ]]);
      vSheet.setFrozenRows(1);
    }

    var count = parseInt(violationCount) || 1;
    var action = count === 1 ? 'Warning - 20s countdown'
               : count === 2 ? 'Final Warning - 20s countdown'
               : 'EXAM SUBMITTED - Auto-terminated';

    var ts = timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    vSheet.insertRowBefore(2);
    vSheet.getRange(2, 1, 1, 9).setValues([[
      ts, sheetCode || '', lastName || '', firstName || '', section || '',
      violationType || 'Unknown', count, questionNumber || 'N/A', action
    ]]);

    lock.releaseLock();
    return json({ success: true });
  } catch (err) {
    lock.releaseLock();
    return json({ success: false, error: err.toString() });
  }
}

// ============================================================================
// RECORD GRADE (legacy)
// ============================================================================
function recordGrade(sheetCode, lastName, firstName, section, submittedAnswersJson, startTime, endTime, date) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return json({ success: false, error: 'Lock timeout' }); }
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetCode);
    if (!sheet) { lock.releaseLock(); return json({ success: false, error: 'Sheet not found' }); }

    var lastRow = sheet.getLastRow();
    var data    = sheet.getRange(1, 1, Math.max(lastRow, 2), 4).getValues();
    var correctMap = {};
    for (var r = 1; r < data.length; r++) {
      var qCode = normalizeToQ(data[r][0] || r);
      var ans   = String(data[r][2] || '').trim();
      if (ans) correctMap[qCode] = ans.toUpperCase();
    }

    var submitted = {};
    try { submitted = JSON.parse(submittedAnswersJson); } catch (e) {}

    var score = 0, total = Object.keys(correctMap).length;
    for (var qc in submitted) {
      if (correctMap[qc] && String(submitted[qc]).trim().toUpperCase() === correctMap[qc]) score++;
    }
    var wrong = total - score;

    var sub = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');
    if (sub.getLastRow() === 0) {
      sub.getRange(1,1,1,13).setValues([['Timestamp','Code','LastName','FirstName','Section','Status','Answers','StartTime','EndTime','Date','Score','Correct','Mistakes']]);
    }
    sub.insertRowBefore(2);
    var ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sub.getRange(2,1,1,13).setValues([[ts, sheetCode, lastName, firstName, section, 'completed',
      submittedAnswersJson, startTime, endTime, date,
      Math.round((score/total)*100)+'%', score, wrong]]);

    lock.releaseLock();
    return json({ success: true, score: Math.round((score/total)*100)+'%', correct: score, wrong: wrong });
  } catch (err) {
    lock.releaseLock();
    return json({ success: false, error: err.toString() });
  }
}

// ============================================================================
// RECORD PARTIAL
// ============================================================================
function recordPartial(sheetCode, lastName, firstName, section, submittedAnswersJson, status, timestamp) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return json({ success: false, error: 'Lock timeout' }); }
  try {
    var ss  = SpreadsheetApp.getActiveSpreadsheet();
    var sub = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');
    if (sub.getLastRow() === 0) {
      sub.getRange(1,1,1,10).setValues([['Timestamp','Code','LastName','FirstName','Section','Status','Answers','StartTime','EndTime','Date']]);
    }
    sub.insertRowBefore(2);
    var ts = timestamp || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sub.getRange(2,1,1,10).setValues([[ts, sheetCode, lastName, firstName, section, status, submittedAnswersJson, '', '', '']]);
    lock.releaseLock();
    return json({ success: true });
  } catch (err) {
    lock.releaseLock();
    return json({ success: false, error: err.toString() });
  }
}

// ============================================================================
// GET ALL QUESTIONS AND ANSWERS
// ============================================================================
function getAllQuestionsAndAnswers(sheetCode) {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetCode);
    if (!sheet) {
      return json({ questions: [], questionsMap: {}, defaultTimerSeconds: 30,
                    error: 'Sheet not found for code: ' + sheetCode });
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < DATA_START_ROW) {
      return json({ questions: [], questionsMap: {}, defaultTimerSeconds: 30 });
    }

    var numRows = lastRow - DATA_START_ROW + 1;
    var data    = sheet.getRange(DATA_START_ROW, 1, numRows, 5).getValues();

    var defaultTimerSeconds    = 30;
    var globalExamTimerSeconds = null;

    if (data.length > 0) {
      var d5 = data[0][3];
      if (d5 !== '' && !isNaN(d5) && Number(d5) > 0)
        defaultTimerSeconds = Math.max(10, Math.min(300, parseInt(d5, 10)));
      var e5 = data[0][4];
      if (e5 !== '' && !isNaN(e5) && parseInt(e5, 10) > 0)
        globalExamTimerSeconds = parseInt(e5, 10) * 60;
    }

    var questionsList = [];
    var expectedNum   = 1;

    for (var r = 0; r < data.length; r++) {
      var rawId  = String(data[r][0] || '').trim();
      var rawQ   = String(data[r][1] || '').trim();
      var rawAns = String(data[r][2] || '').trim();
      var rawTmr = data[r][3];

      if (!rawId && !rawQ && !rawAns && (rawTmr === '' || rawTmr == null)) continue;

      var num = /^\d+$/.test(rawId) ? parseInt(rawId, 10) : expectedNum;
      var timerSeconds = defaultTimerSeconds;
      if (rawTmr !== '' && !isNaN(rawTmr) && Number(rawTmr) > 0)
        timerSeconds = Math.max(10, Math.min(300, parseInt(rawTmr, 10)));

      var formatted = rawQ;
      try { formatted = formatQuestion(rawQ); } catch (e) { formatted = rawQ.replace(/\s+/g,' ').trim(); }

      var code = 'Q' + String(num).padStart(3, '0');
      questionsList.push({ num: num, code: code, question: formatted, answer: rawAns || '-', timerSeconds: timerSeconds });
      expectedNum = num + 1;
    }

    var questionsMap = {};
    questionsList.forEach(function(q) { questionsMap[q.code] = q; });

    return json({
      questions: questionsList,
      questionsMap: questionsMap,
      defaultTimerSeconds: defaultTimerSeconds,
      globalExamTimerSeconds: globalExamTimerSeconds
    });
  } catch (err) {
    return json({ questions: [], questionsMap: {}, defaultTimerSeconds: 30, error: err.toString() });
  }
}

// ============================================================================
// REPAIR SHEET — fixes existing sheets that are missing SECTION column (H)
// or have wrong column order. Safe to run on any sheet.
// ============================================================================
function repairSheet(sheetCode) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return json({ success: false, error: 'Lock timeout' }); }
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetCode);
    if (!sheet) { lock.releaseLock(); return json({ success: false, error: 'Sheet not found: ' + sheetCode }); }

    // Expected headers row 4, columns A–N (14 cols)
    var expectedHeaders = [
      'Number', 'Question', 'Answer', 'Timer Seconds', 'Entire Exam Timer(Minutes)',
      'LAST NAME', 'FIRST NAME', 'SECTION',
      'Score', 'Correct Answer', 'Mistakes', 'Start Time', 'End Time', 'Date'
    ];

    var BG_HDR = '#1e5631';
    var hdrRange = sheet.getRange(4, 1, 1, expectedHeaders.length);
    var current  = hdrRange.getValues()[0];

    // Check if row 4 already has the correct 14-column layout
    var alreadyCorrect = current.length >= 14 &&
      String(current[7] || '').trim().toUpperCase() === 'SECTION';

    if (!alreadyCorrect) {
      // Overwrite row 4 with the correct headers
      hdrRange.setValues([expectedHeaders])
        .setBackground(BG_HDR).setFontColor('#ffffff')
        .setFontWeight('bold').setHorizontalAlignment('center');

      // Ensure the sheet has at least 14 columns
      if (sheet.getMaxColumns() < 14) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), 14 - sheet.getMaxColumns());
      }

      lock.releaseLock();
      return json({ success: true, repaired: true, message: 'Header row repaired for sheet: ' + sheetCode });
    }

    lock.releaseLock();
    return json({ success: true, repaired: false, message: 'Sheet headers are already correct.' });
  } catch (err) {
    lock.releaseLock();
    return json({ success: false, error: err.toString() });
  }
}

// ============================================================================
// HELPERS
// ============================================================================
function normalizeToQ(raw) {
  var s = String(raw || '').trim();
  if (!s) return '';
  var mQ = s.toUpperCase().match(/^Q0*(\d+)$/i);
  if (mQ) return 'Q' + ('000' + mQ[1]).slice(-3);
  var mN = s.match(/^0*(\d+)$/);
  if (mN) return 'Q' + ('000' + mN[1]).slice(-3);
  return 'Q' + Utilities.getUuid().slice(0, 6).toUpperCase();
}

function getQuestionType(raw) {
  var l = String(raw || '').toLowerCase();
  var cnt = [l.includes('a.'), l.includes('b.'), l.includes('c.'), l.includes('d.')].filter(Boolean).length;
  return cnt >= 3 ? 'multiple-choice' : cnt >= 1 ? 'partial-choices' : 'identification';
}

function formatQuestion(rawQuestion) {
  var qType = getQuestionType(rawQuestion);
  if (qType === 'identification') return String(rawQuestion || '').trim().replace(/\s+/g, ' ');

  var stem = rawQuestion, options = [];
  var stemEnd = rawQuestion.search(/\?\s*[a-d]\./i);
  if (stemEnd === -1) stemEnd = rawQuestion.search(/\.\s*[a-d]\./i);

  if (stemEnd > 0) {
    stem = rawQuestion.substring(0, stemEnd).trim();
    var optPart = rawQuestion.substring(stemEnd).trim();
    var re = /([a-d])\.\s*(.*?)(?=\s*[a-d]\.|$)/gis;
    var m;
    while ((m = re.exec(optPart)) !== null)
      options.push({ letter: m[1].toLowerCase(), text: m[2].trim() });
  } else {
    var parts = rawQuestion.split(/([a-d]\.)/i);
    stem = parts[0].trim();
    for (var j = 1; j < parts.length; j += 2) {
      if (parts[j] && parts[j+1]) {
        var letter = parts[j].trim().toLowerCase();
        if ('abcd'.includes(letter))
          options.push({ letter: letter, text: parts[j+1].trim() });
      }
    }
  }

  var formatted = stem;
  options.forEach(function(o) { formatted += '<br> ' + o.letter + '. ' + o.text; });
  if (qType === 'partial-choices') formatted += '<br><small>(Partial choices - enter letter or full answer)</small>';
  return formatted.replace(/\s*\n\s*/g, ' ').replace(/<br>\s*<br>/g, '<br>');
}
