# Appointment System Setup Guide
## One-time setup — takes ~10 minutes

---

## STEP 1 — Create a Google Spreadsheet

1. Go to **sheets.google.com** → click **Blank**
2. Name it: `Hasibuzzaman Appointments`
3. Copy the URL — you'll need it in Step 2
   (looks like: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`)

---

## STEP 2 — Set up the Google Apps Script

1. Go to **script.google.com** → click **New Project**
2. Name the project: `Appointment Backend`
3. Delete all the default code in the editor
4. Open the file `appointment-backend.gs` (in your website folder)
5. Copy ALL the code and paste it into the Apps Script editor
6. Click **Save** (the floppy disk icon)

---

## STEP 3 — Enable Google Calendar Advanced Service

1. In Apps Script, click **Services** (+ icon on the left sidebar)
2. Find **Google Calendar API** → click **Add**
3. Click **Save**

---

## STEP 4 — Link it to your Spreadsheet

1. In Apps Script, click **Resources → Advanced Google Services** (or the gear icon)
2. Click on your project name at the top → **Project Settings**
3. Go back to the editor, click the **spreadsheet icon** in the toolbar
4. OR: In your script, the `getOrCreateSheet()` function uses `SpreadsheetApp.getActiveSpreadsheet()`
   — so you need to **bind the script to your spreadsheet**:
   - Go to your Google Sheet → click **Extensions → Apps Script**
   - This opens a NEW Apps Script bound to your sheet
   - Paste the `appointment-backend.gs` code here instead ✅ (this is the correct way)
   - Delete the separate Apps Script project from Step 2

**CORRECT WAY (do this):**
- Open your Google Sheet → **Extensions → Apps Script** → paste the code → Save

---

## STEP 5 — Deploy as Web App

1. In the Apps Script editor (opened from your Sheet), click **Deploy → New Deployment**
2. Click the gear icon next to "Type" → select **Web app**
3. Fill in:
   - **Description:** `Appointment Backend v1`
   - **Execute as:** `Me (hsbuzzaman@gmail.com)`
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. Click **Authorize access** → choose your Google account → Allow
6. **COPY the Web App URL** — it looks like:
   `https://script.google.com/macros/s/AKfycbXXXXXXXXXXXXXXXX/exec`

---

## STEP 6 — Paste the URL into your website

Open `index.html` and find this line (around line 12326):

```javascript
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';
```

Replace `YOUR_APPS_SCRIPT_URL` with your actual URL:

```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbXXXXX/exec';
```

Save `index.html` and upload it to your hosting.

---

## STEP 7 — Test it

1. Open your website → Contact → Appointment tab
2. Fill in the form with a test email and submit
3. You should immediately receive **2 emails**:
   - One at `hsbuzzaman@gmail.com` (the admin notification with Approve/Decline buttons)
   - One at the requester's email (confirmation receipt)
4. Click **Approve & Create Meet Link** in your admin panel (or click the Approve button in the email)
5. A Google Meet event is auto-created in your Google Calendar
6. Both you and the requester get emailed the Meet link automatically

---

## HOW THE FULL FLOW WORKS

```
Visitor fills form
      ↓
Apps Script saves to Google Sheet
      ↓
You get email: "[Name] wants an appointment" + Approve/Decline buttons
Requester gets email: "Request received, awaiting review"
      ↓
You click "✓ Approve & Send Meet" in admin panel
      ↓
Apps Script creates Google Calendar event WITH Meet link
      ↓
You get email: "Approved — here's the Meet link"
Requester gets email: "Approved! Join here: meet.google.com/xxx"
```

---

## TROUBLESHOOTING

**"Connection error" on form submit:**
- The Apps Script URL is wrong or not deployed as "Anyone" access
- Re-deploy: Deploy → Manage Deployments → Edit → set "Who has access" = Anyone

**No emails received:**
- Check your Gmail spam folder
- Make sure you authorized the script in Step 5

**Meet link not created:**
- Make sure Google Calendar API is enabled (Step 3)
- Check Apps Script logs: View → Logs

**After any code change in Apps Script:**
- You MUST create a NEW deployment (not edit the old one)
- Copy the new URL and update `index.html` again
