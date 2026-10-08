# Research / Publications Admin — Setup Guide
## One-time setup — takes ~10 minutes

This powers the new **Research tab** in `admin.html` and the dynamic **Publications**
section on `index.html`. The Admin Panel is the single source of truth: every
publication you add, edit, delete, reorder, feature, or hide updates the public
website automatically and instantly — no code edits, no redeploy.

It's built on **Firebase** (Google's app backend platform): **Firestore** is the
database, and **Firebase Authentication** protects writes so only you can edit data.
Both have a generous free tier that comfortably covers a personal portfolio site.

---

## STEP 1 — Create a Firebase project

1. Go to **console.firebase.google.com** → **Add project**
2. Name it anything, e.g. `mdhasibuzzaman-research`
3. You can disable Google Analytics for this project (not needed) → **Create project**

---

## STEP 2 — Enable Firestore

1. In the left sidebar: **Build → Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Pick a region close to your visitors/you (e.g. `asia-east1`) → **Enable**

---

## STEP 3 — Enable Authentication & create your admin login

1. **Build → Authentication** → **Get started**
2. Under **Sign-in method**, enable **Email/Password** → **Save**
3. Go to the **Users** tab → **Add user**
4. Enter the email and password you want to use to log into the Research tab
   (this can be the same or different from your existing Appointments admin password —
   they are independent)
5. Click the new user row and copy the **User UID** (a long string like `aB3xY...`) —
   you'll need it in Step 5

---

## STEP 4 — Register a Web App & get your config

1. Click the **gear icon** (top left) → **Project settings**
2. Scroll to **Your apps** → click the **Web icon** (`</>`)
3. Give it a nickname (e.g. `website`) → **Register app** (you do NOT need Firebase Hosting)
4. Copy the `firebaseConfig` object shown — it looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "mdhasibuzzaman-research.firebaseapp.com",
     projectId: "mdhasibuzzaman-research",
     storageBucket: "mdhasibuzzaman-research.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. This config is safe to publish on your public website — it is not a secret.
   Real protection comes from the security rules in Step 5, not from hiding this object.

**Paste it into BOTH files**, replacing the `RESEARCH_FIREBASE_CONFIG` placeholder:
- `index.html` (search for `RESEARCH_FIREBASE_CONFIG`)
- `admin.html` (search for `RESEARCH_FIREBASE_CONFIG`)

---

## STEP 5 — Set Firestore security rules

1. In Firebase Console: **Build → Firestore Database → Rules** tab
2. Replace the contents with the rules from `firestore.rules` in your website folder
3. Replace **both** occurrences of `ADMIN_UID` with the User UID you copied in Step 3
4. Click **Publish**

These rules mean: anyone can read publications you haven't hidden, but only you
(signed in with that exact account) can create, edit, delete, or reorder them.

---

## STEP 6 — Log in and start adding publications

1. Open `admin.html` → sign in using the **email and password from Step 3**
   (type the email in the username field — it's detected automatically)
2. Click the **Research** tab
3. Click **+ Add Publication** and fill in the details, or use **Import from BibTeX**

---

## SEARCHING & IMPORTING ONLINE (Research tab → "🔍 Search Online & Import")

This searches Semantic Scholar's live academic graph in real time as you type — by your
name (to discover your own publications) or by title/keywords. Nothing goes live
automatically: every imported result lands in **Pending Review**, where you can edit it,
**Approve & Publish** it (goes live on the website instantly), or **Reject** it (deleted).

Two things we confirmed while testing this against the real API, worth knowing upfront:

- **Common names match many unrelated researchers.** Searching "Md Hasibuzzaman" by author
  returns over a dozen distinct people on Semantic Scholar (different fields entirely —
  microplastics research, medicine, etc.), not just you. Each candidate shows a few sample
  paper titles — check those before clicking "View Papers," rather than relying on the name
  or citation count alone. If author search stays noisy, switch to **By Title/Keywords** and
  search for one of your actual paper titles instead — it's far more precise.
- **The API is rate-limited when used without a key**, and that limit is shared across
  everyone hitting it from the same network at the same time, so you may occasionally see a
  search fail even though nothing is wrong on your end — just wait a minute and retry. If
  this happens often, Semantic Scholar offers a free API key for higher limits
  (https://www.semanticscholar.org/product/api#api-key-form); if you get one, it can be added
  as an `x-api-key` header on the `fetch()` calls in the Research tab's search functions.

## IMPORTING YOUR EXISTING PUBLICATIONS

Google Scholar does not offer a public API, and automated scraping of Scholar
pages violates Google's Terms of Service and gets blocked quickly — so this
system does not scrape Scholar directly. Instead, two legitimate options are built in:

**Option A — BibTeX paste (recommended, from your own Scholar profile)**
1. Go to your Google Scholar profile → open a publication → click the quotation-mark
   "Cite" icon → **BibTeX**
2. Copy the text (you can paste multiple entries at once) into the **Import from BibTeX**
   box in the Research tab → **Parse & Add**
3. Imported entries are added as hidden drafts so you can review/edit each one before
   publishing it live (toggle **Show** once it looks right)

**Option B — Citation sync via Semantic Scholar (automatic, ongoing)**
- Semantic Scholar provides a free, public, CORS-enabled API with no key required for
  this volume of use — fully legal to call directly from the Admin Panel.
- Once a publication has a **DOI**, click **⟳ Sync** on its row (or **⟳ Sync Citations**
  to refresh all of them at once) to pull in the latest citation count, and fill in
  venue/abstract if they were left blank.
- Click this periodically (e.g. whenever you check your Scholar profile) to keep
  citation counts current — it is not automatic/scheduled, since that would need a
  server backend this static site doesn't have.

---

## HOW THE FULL FLOW WORKS

```
You add/edit/delete/reorder/feature/hide a publication in Admin Panel
      ↓
Written directly to Firestore (your database)
      ↓
Public website (index.html) is listening live to that same data
      ↓
Research page + homepage "Selected Publications" update instantly
for every visitor currently on the site — no refresh, no redeploy
```

---

## TROUBLESHOOTING

**Research tab shows "Research Tab Not Connected":**
- `RESEARCH_FIREBASE_CONFIG` still has placeholder values in `admin.html`/`index.html`, or
- You're signed in with the legacy Appointments username instead of the Firebase email

**"Missing or insufficient permissions" error in the browser console:**
- The `ADMIN_UID` in your Firestore rules doesn't match your signed-in account's UID —
  double check Step 5

**Public page shows "Unable to load publications":**
- Check the Firestore rules are published (Step 5) and the config matches in `index.html`

**Semantic Scholar sync says "Not found":**
- That DOI isn't indexed by Semantic Scholar yet (common for very new or preprint DOIs) —
  edit the publication manually instead

---

## SITE CONTENT SETUP — makes the "Site Content" admin tab work

This is a **second, separate feature** built on the exact same Firebase project you
already set up above — it lets you edit Hero, About/Bio, Contact Info, Education,
Experience, Awards, Skills, and Certificates from the Admin Panel, the same way
Research/Publications already works. The **Experiments** pages are intentionally left
out — they stay as hand-built interactive demos, not admin-editable content.

It needs two things added to the Firebase project you already created. If you skip
these, the "Site Content" tab will show permission errors in the browser console and
nothing will save.

### 1 — Update your Firestore rules

Your current rules only cover `publications`. Replace them with the updated version
from `firestore.rules` in your website folder (it now also covers a `site` collection):

1. Firebase Console → **Firestore Database → Rules**
2. Replace the contents with what's in `firestore.rules`
3. Click **Publish**

### 2 — Enable Firebase Storage (for certificate images)

Certificates are the one section with image uploads, which needs Firebase's file
storage product turned on:

1. Firebase Console → **Build → Storage** → **Get started**
2. Choose **Start in production mode** → pick the same region you used for Firestore → **Done**
3. Go to the **Rules** tab (next to "Files") → replace the contents with what's in
   `storage.rules` in your website folder → **Publish**

That's it — no new login, no new config needed. The same Firebase email/password you
already use for the Research tab also unlocks Site Content.

### How it works

Every section starts pre-filled with your actual current website content (nothing
blank to fill in from scratch). Editing and saving a section writes it to Firestore,
and the public website picks it up instantly — same real-time behavior as Publications.
If you never touch a section, the site keeps showing its original static content
exactly as it is today; nothing changes until you explicitly save something there.
