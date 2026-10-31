/**
 * Last Meal → Google Sheet endpoint.
 *
 * Deploy this as a Web App (bound to your spreadsheet) and paste the resulting
 * /exec URL into the Last Meal app's settings. Two kinds of POST are handled:
 *
 *   • Meal time   {date, time, iso}          → upserts one row/day in "Meals"
 *   • Progress pic {type:"photo", date,
 *                   image(base64), mime,
 *                   caption}                 → saves to Drive, appends to "Photos"
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type === "photo") return handlePhoto(data);
    return handleMeal(data);
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput("Last Meal endpoint is live. POST meal times or photos here.");
}

// --- meals: one row per day, updated in place ------------------------------

function handleMeal(data) {
  var date = String(data.date || "");
  var time = String(data.time || "");
  if (!date) throw new Error("missing date");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = ss.getSpreadsheetTimeZone();
  var sh = ss.getSheetByName("Meals");
  if (!sh) {
    sh = ss.insertSheet("Meals");
    sh.appendRow(["Date", "Last meal", "Updated"]);
  }
  // Keep the Date column as plain text so a posted "2026-10-31" is matched
  // exactly next time instead of being auto-coerced to a Date value.
  sh.getRange("A2:A").setNumberFormat("@");

  var last = sh.getLastRow();
  var rowIdx = -1;
  if (last > 1) {
    var col = sh.getRange(2, 1, last - 1, 1).getValues(); // skip header
    for (var i = 0; i < col.length; i++) {
      if (keyDate(col[i][0], tz) === date) { rowIdx = i + 2; break; }
    }
  }

  if (rowIdx === -1) {
    sh.appendRow([date, time, new Date()]);
  } else {
    sh.getRange(rowIdx, 2, 1, 2).setValues([[time, new Date()]]);
  }
  return json({ ok: true, kind: "meal", date: date, time: time });
}

// --- progress photos: occasional milestones, one row each ------------------

function handlePhoto(data) {
  var date = String(data.date || "");
  var b64 = String(data.image || "");
  if (!date) throw new Error("missing date");
  if (!b64) throw new Error("missing image");

  var mime = String(data.mime || "image/jpeg");
  var caption = String(data.caption || "");
  var ext = mime.indexOf("png") >= 0 ? "png" : "jpg";

  var bytes = Utilities.base64Decode(b64);
  var blob = Utilities.newBlob(bytes, mime, "progress-" + date + "-" + Date.now() + "." + ext);

  var folder = getPhotoFolder_();
  var file = folder.createFile(blob);
  // Public read so the website can display it. Viewing stays link-only.
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    // Some accounts restrict link sharing; keep the file and surface the note.
  }
  var id = file.getId();
  var url = "https://drive.google.com/thumbnail?id=" + id + "&sz=w1600";

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName("Photos");
  if (!sh) {
    sh = ss.insertSheet("Photos");
    sh.appendRow(["Date", "ImageURL", "FileId", "Caption", "Uploaded"]);
  }
  sh.getRange("A2:A").setNumberFormat("@");
  sh.appendRow([date, url, id, caption, new Date()]);

  return json({ ok: true, kind: "photo", date: date, url: url });
}

function getPhotoFolder_() {
  var name = "Last Meal Photos";
  var it = DriveApp.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(name);
}

// --- helpers ---------------------------------------------------------------

// A Date column may read back as a Date (locale-dependent); normalize both
// sides to yyyy-MM-dd in the SPREADSHEET's timezone so matching is reliable.
function keyDate(v, tz) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, tz, "yyyy-MM-dd");
  }
  return String(v).trim();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
