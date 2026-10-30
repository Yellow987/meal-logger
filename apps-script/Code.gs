/**
 * Last Meal → Google Sheet endpoint.
 *
 * Deploy this as a Web App (bound to your spreadsheet) and paste the resulting
 * /exec URL into the Last Meal app's settings. The app POSTs {date,time,iso};
 * this upserts one row per day in a "Meals" tab.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var data = JSON.parse(e.postData.contents);
    var date = String(data.date || "");
    var time = String(data.time || "");
    if (!date) throw new Error("missing date");

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName("Meals");
    if (!sh) {
      sh = ss.insertSheet("Meals");
      sh.appendRow(["Date", "Last meal", "Updated"]);
    }

    var last = sh.getLastRow();
    var rowIdx = -1;
    if (last > 1) {
      var col = sh.getRange(2, 1, last - 1, 1).getValues(); // skip header
      for (var i = 0; i < col.length; i++) {
        if (normDate(col[i][0]) === date) { rowIdx = i + 2; break; }
      }
    }

    if (rowIdx === -1) {
      sh.appendRow([date, time, new Date()]);
    } else {
      sh.getRange(rowIdx, 2, 1, 2).setValues([[time, new Date()]]);
    }

    return json({ ok: true, date: date, time: time });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Last Meal endpoint is live. POST meal times here.");
}

// A date cell may read back as a string or a Date depending on locale; normalize.
function normDate(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(v);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
