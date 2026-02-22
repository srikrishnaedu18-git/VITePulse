# VITePulse (VIT Events Extension + Digest Backend)

VITePulse is a Chrome extension + Node.js backend that helps users discover VIT events faster.

It does two things:
- Highlights relevant events directly on the VIT events portal based on user-selected tags/schools
- Scrapes events and sends personalized weekly digest emails to opted-in users

## Features

- Chrome extension popup for:
  - saving VIT student email
  - selecting schools + custom tags
  - choosing highlight color
  - dark mode + theme variant (Copilot-style / GPT-style)
- In-page event row highlighting on `events.vit.ac.in`
- Backend scraper (Puppeteer) with login + session cookie reuse
- MongoDB persistence for users, events, and digests
- Scheduled digest pipeline (startup run + cron)
- Manual admin trigger endpoint for pipeline runs
- Email unsubscribe + re-subscribe flow
- Email change verification flow (tokenized link)

## Repo Structure

- `backend/` - Express API, scraper, scheduler, Mongo models, email pipeline
- `web-extension/` - React-based Chrome extension popup + content script

## Architecture Overview

1. User opens extension popup and saves:
- email
- school tags (schools are treated as tags too)
- custom tags

2. Extension stores settings in `chrome.storage.sync` and updates backend user record.

3. Backend scheduler runs pipeline:
- purges old `events` + `digests`
- scrapes fresh events from VIT events portal
- syncs events to MongoDB
- builds per-user digest (deduplicated matches)
- sends digest emails

4. Unsubscribe link in digest email updates `optIn=false`.

5. Saving email/preferences again automatically re-enables email (`optIn=true`).

## Digest Matching Logic (Current)

User-selected schools and custom tags are treated as tags.

For each event, a tag matches if it appears in either:
- event title
- event school name (including school code support like `SCORE`)

If any tag matches, the event is included in the user digest.

If the same event matches multiple tags, it is added only once per user digest (deduplicated).

## Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Create `.env`

Create `backend/.env` with values like the following:

```env
# Server / DB
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/vit-events
APP_URL=http://127.0.0.1:4000

# Admin manual trigger (optional but recommended)
ADMIN_TRIGGER_TOKEN=your_admin_trigger_token

# VIT portal scraping
LOGIN_URL=https://events.vit.ac.in/Users
EVENTS_URL=https://events.vit.ac.in/Home/index
LOGIN_USER=your_vit_login_id
LOGIN_PASS=your_vit_password
USERNAME_SELECTOR=#emailId
PASSWORD_SELECTOR=#password
CAPTCHA_SELECTOR=#captchaInput
LOGIN_BUTTON_SELECTOR=#signIn

# Email (SMTP / SES)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
MAIL_USER=your_smtp_username
MAIL_PASS=your_smtp_password
ADMIN_EMAIL=your_verified_sender@example.com
```

Notes:
- `APP_URL` is used in unsubscribe and verification email links.
- A session cookie cache file (`.session.json`) is created in `backend/` after login succeeds.

### 3. Run backend server

```bash
cd backend
node api/server.js
```

What happens on startup:
- API starts on `PORT` (default `4000`)
- scheduler loads
- pipeline runs once shortly after boot
- cron then runs every 10 minutes (`Asia/Kolkata` timezone)

## Manual Pipeline Trigger (Admin)

Endpoint:
- `POST /api/admin/run-pipeline`

Example:

```bash
curl -X POST http://localhost:4000/api/admin/run-pipeline \
  -H "x-admin-token: your_admin_trigger_token"
```

If `ADMIN_TRIGGER_TOKEN` is not set, the endpoint is open (local/dev use).

Response behavior:
- `200` success
- `409` pipeline already running
- `401` invalid token (when configured)
- `500` pipeline failure

## Backend API Endpoints

### User

- `POST /api/user/register`
  - Upserts user and enables `optIn`
  - Also clears `unsubscribedAt`

- `POST /api/user/request-email-change`
  - Sends verification link to the new email

- `GET /api/user/confirm-email-change?token=...`
  - Confirms and updates email after token verification

### Preferences

- `POST /api/preferences/update`
  - Updates preferences (`preferences`, `schools`, `buzzwords`)
  - Re-enables `optIn`

### Unsubscribe

- `GET /api/unsubscribe?email=...`
  - Sets `optIn=false`
  - Shows a confirmation page with re-subscribe instructions

## Extension Setup (Chrome)

### 1. Install dependencies

```bash
cd web-extension
npm install
```

### 2. Build extension

```bash
npm run build
```

### 3. Load unpacked extension in Chrome

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `web-extension/build`

### 4. Use the extension

- Open the VIT events site
- Open the extension popup
- Save email (VIT student email)
- Add schools/tags
- Save preferences
- Choose highlight color
- Toggle dark mode + theme variant (Copilot/GPT)

## Chrome Storage Keys Used

The extension persists user settings in `chrome.storage.sync`:

- `keywords` - schools + custom tags
- `email` - user email
- `highlightColor` - row highlight color
- `darkMode` - light/dark mode flag
- `gptDarkTheme` - dark-theme variant (false = Copilot, true = GPT)

## Data Models (MongoDB)

### `User`
- `email`
- `preferences`
- `schools`
- `buzzwords`
- `optIn`
- `unsubscribedAt`
- `pendingEmail`
- `emailChangeToken`
- `emailChangeTokenExpiresAt`

### `Event`
- `id` (hash-based stable identifier)
- `type`
- `school`
- `title`
- `startDate`
- `endDate`
- `url`
- `tags`

### `Digest`
- `userId`
- `weekStart`, `weekEnd`
- `eventIds`
- `text`, `html`

## Scraper Notes

- Uses Puppeteer with headless mode
- Reuses session cookies via `backend/.session.json`
- Auto-handles login if redirected to VIT login page
- Parses events from the portal table (`table tbody tr`)

If scraping times out (`Navigation timeout of 60000 ms exceeded`), common causes are:
- slow site / hanging network requests
- login redirect page not finishing load
- temporary VIT portal issues

## Troubleshooting

### 1. Backend runs but no digest email received

Check:
- `optIn` is `true` for your user
- SMTP settings are valid
- `ADMIN_EMAIL` is a valid sender
- digest logs in backend console (match count per user)

### 2. Digest generated but no events in it

Check:
- your saved tags/schools in Mongo `users` collection
- current-week events actually match your tags/schools
- backend logs for digest match count (`[digest] user matched X/Y events`)

### 3. Unsubscribe link opens but doesn’t work

Ensure:
- `APP_URL` is correct and reachable from email client/browser
- backend server is running

### 4. Theme changes in popup but not website

- Reload extension in `chrome://extensions`
- Refresh the VIT events page so updated content script runs

## Development Notes

- Backend has no `npm scripts` yet; run files directly with `node`.
- Extension is CRA-based (`react-scripts`).
- Some test/utility scripts are under `backend/test/` for local experiments.

## Example Local Workflow

```bash
# Terminal 1: backend
cd backend
npm install
node api/server.js

# Terminal 2: extension build (when UI changes)
cd web-extension
npm install
npm run build
```

Then reload the unpacked extension in Chrome.

## Security / Limitations (Current)

- User identity is email-based (no full auth/session system yet)
- Email change flow uses token verification for the new email address
- Admin trigger endpoint should be protected using `ADMIN_TRIGGER_TOKEN`
- Scraper depends on VIT portal DOM structure (selectors may need updates if site changes)

## Future Improvements

- Add authentication (OTP/session/JWT) for stronger account ownership
- Add dedicated backend scripts (`npm run dev`, `npm run start`)
- Add retry/backoff in scraper navigation
- Add event detail-page scraping (e.g., descriptions)
- Add structured logs + monitoring for pipeline runs

