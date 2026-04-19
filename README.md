# VITePulse — VIT Events Mail Digest + Chrome Extension

## Project Summary

`VITePulse` is a full-stack JavaScript project combining a Chrome extension and a Node.js backend to help VIT students discover and track campus events.

It delivers two core experiences:
- Browser-based event highlighting on the VIT events portal
- Personalized weekly email digests built from scraped event data and user preferences

This repo demonstrates end-to-end integration of browser extension UI, backend API services, scheduled scraping, email automation, and MongoDB persistence.

## Why this project matters

- Makes event discovery faster for VIT students by filtering and highlighting relevant event rows in-page
- Converts raw event portal data into weekly digest emails personalized by school and keyword preferences
- Supports unsubscribe flow and email change verification, improving real-world user lifecycle handling
- Demonstrates automation with Puppeteer for authenticated web scraping and session reuse

## Tech Stack

- JavaScript (ES Modules)
- React (Chrome extension popup UI)
- Chrome Extension Manifest V3
- Node.js + Express
- MongoDB + Mongoose
- Puppeteer for browser automation and scraping
- Node Cron for scheduled pipeline execution
- Nodemailer for transactional email and digest delivery
- dotenv for configuration management

## Resume-Ready Skills Demonstrated

- Full-stack JavaScript development with React frontend and Express/Mongo backend
- Chrome extension architecture using `chrome.storage`, content scripts, messaging, and Manifest V3
- Authenticated web scraping using Puppeteer, including login flows, CAPTCHA extraction, and cookie reuse
- Scheduled background jobs with `node-cron` and safe pipeline concurrency control
- Email automation and transactional email design, including unsubscribe links and email verification flows
- Data normalization, deduplication, and preference-driven matching for personalized digest generation
- API design with secure admin trigger endpoints and user preference management
- Production-oriented engineering practices such as error alerting, retry-aware pipelines, and environment-based configuration

## Repository Structure

- `backend/`
  - `api/server.js` — Express server entrypoint
  - `api/routes/` — API routes for user registration, preferences, admin triggers, and unsubscribe flow
  - `jobs/scheduler.js` — cron-driven pipeline orchestration and concurrency protection
  - `jobs/weekly.pipeline.js` — weekly event scrape / sync / digest / email flow
  - `scraper/scrape.js` — Puppeteer scraper for VIT event portal with session cookie reuse
  - `services/` — event sync and digest construction logic
  - `lib/` — tagging and email utilities
  - `models/` — Mongoose schemas for `User`, `Event`, and `Digest`
  - `test/` — manual test helpers for email and cron pipeline sanity checks

- `web-extension/`
  - `public/manifest.json` — Chrome extension manifest
  - `src/popup/Popup.js` — React popup UI with email registration, preferences, highlighting, and theme controls
  - `build/` — compiled extension assets ready for Chrome loading

## Key Features

- Chrome popup UI for:
  - VIT student email registration
  - school selection and custom keyword tagging
  - highlight color picker
  - light/dark mode with Copilot/GPT theme variant
- Page highlighting on the VIT event portal based on saved `keywords`
- Backend scraper that logs in to the VIT portal, extracts event rows, and caches cookies for session persistence
- MongoDB-backed event storage with upsert and field-based deduplication
- Weekly digest generation for opted-in users with event grouping by type
- Unsubscribe link and opt-out persistence for email delivery compliance
- Email change request workflow with tokenized verification link
- Admin API endpoint to manually trigger the pipeline when needed

## Architecture Overview

1. The Chrome extension collects user preferences and saves them locally using `chrome.storage.sync`.
2. User email and keywords are sent to the backend API to create/update the user profile.
3. The backend scheduler runs every 10 minutes and on startup:
   - clears old `Event` and `Digest` records
   - scrapes the VIT event portal
   - syncs scraped events into MongoDB
   - builds personalized digests for each opted-in user
   - sends email digests via SMTP
4. Digests include unsubscribe links that mark the user as `optIn: false`.
5. Saving preferences again re-enables email delivery and refreshes highlights.

## Important Implementation Details

- `backend/scraper/scrape.js`
  - uses Puppeteer with headless Chrome and `--no-sandbox`
  - extracts login captcha text from the portal and submits it automatically
  - caches cookies to `.session.json` for reuse across pipeline runs
- `backend/services/sync.service.js`
  - produces stable SHA-256 event IDs to avoid duplicate events
  - normalizes scraped rows into a consistent Mongo schema
  - generates searchable tags from school code, event type, title, and buzzwords
- `backend/services/digest.service.js`
  - filters events by user preferences, school names, and derived school codes
  - deduplicates matching events per user digest
  - renders both plain text and HTML email bodies
- `backend/lib/email.js`
  - sends digest and verification emails via Nodemailer
  - appends unsubscribe links automatically when missing
- `backend/jobs/scheduler.js`
  - prevents overlapping pipeline runs using an `isRunning` guard
  - supports manual admin trigger with optional `ADMIN_TRIGGER_TOKEN`

## Setup and Run Instructions

### Backend

```bash
cd backend
npm install
# create backend/.env using the section below
node api/server.js
```

### Chrome Extension

```bash
cd web-extension
npm install
npm run build
```

Then load `web-extension/build` in Chrome as an unpacked extension.

## Environment Variables

Add these values to `backend/.env`:

```env
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/vit-events
APP_URL=http://127.0.0.1:4000
ADMIN_TRIGGER_TOKEN=your_admin_token
LOGIN_URL=https://events.vit.ac.in/Users
EVENTS_URL=https://events.vit.ac.in/Home/index
LOGIN_USER=your_vit_login_id
LOGIN_PASS=your_vit_password
USERNAME_SELECTOR=#emailId
PASSWORD_SELECTOR=#password
CAPTCHA_SELECTOR=#captchaInput
LOGIN_BUTTON_SELECTOR=#signIn
SMTP_HOST=your_smtp_host
SMTP_PORT=587
MAIL_USER=your_smtp_username
MAIL_PASS=your_smtp_password
ADMIN_EMAIL=your_verified_sender@example.com
```

## API Endpoints

### User

- `POST /api/user/register` — register or update a user
- `POST /api/user/request-email-change` — request email update with verification
- `GET /api/user/confirm-email-change?token=...` — confirm email change

### Preferences

- `POST /api/preferences/update` — update saved preferences and re-enable opt-in

### Admin

- `POST /api/admin/run-pipeline` — manually trigger the weekly pipeline

### Unsubscribe

- `GET /api/unsubscribe?email=...` — unsubscribe from digest emails

## Developer Notes

- The backend is built with ES modules and modern Node.js patterns.
- The extension uses React for popup UI and Chrome messaging to refresh page highlights.
- The pipeline is intentionally designed to purge stale events before re-scraping, keeping digest content fresh.
- Session cookies are stored in `backend/.session.json` after login for reuse across pipeline runs.
- The current repo includes manual test scripts under `backend/test/` but does not include a CI test suite.

## Next Improvements

- Add unit/integration tests for backend and extension logic
- Add Docker support for local full-stack development
- Add retry and failure handling for scraper/email pipeline
- Improve extension UI for tag management and saved preferences
- Add support for multiple user sessions and user login isolation

---

### Recommended Resume Bullet Points

- Built a Chrome extension with React and Manifest V3 to provide live event highlighting and personalized filtering on a campus portal
- Implemented a Node.js/Express backend with MongoDB for user management, event syncing, and email digest generation
- Automated authenticated scraping with Puppeteer, including login, CAPTCHA extraction, and cookie reuse
- Designed a scheduled pipeline with `node-cron`, concurrency protection, and manual admin triggers
- Engineered email workflows with unsubscribe handling and secure email change verification
- Developed event normalization, tagging, and deduplication logic for personalized digests
