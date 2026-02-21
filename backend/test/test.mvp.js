// test/test-mvp.js
import mongoose from "mongoose";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

// ==================== DB SETUP ====================
await mongoose.connect(process.env.MONGO_URI);
console.log("✅ Connected to MongoDB");

const eventSchema = new mongoose.Schema({
  type: String,
  school: String,
  title: String,
  startDate: String,
  endDate: String,
  url: String,
}, { timestamps: true });

const Event = mongoose.model("Event", eventSchema);

// ==================== LOGIN ====================
async function login(page) {
  console.log("Navigating to login page...");
  await page.goto(process.env.LOGIN_URL, { waitUntil: "networkidle2", timeout: 60000 });

  const usernameSel = process.env.USERNAME_SELECTOR || "#emailId";
  const passwordSel = process.env.PASSWORD_SELECTOR || "#password";
  const captchaSel  = process.env.CAPTCHA_SELECTOR || "#captchaInput";
  const loginBtnSel = process.env.LOGIN_BUTTON_SELECTOR || "#signIn";
  const captchaTextSel = "#CaptchaDiv";
  const postLoginSel = process.env.POST_LOGIN_SELECTOR || "#events_link"; // optional hint

  // Ensure page is focused
  await page.bringToFront();

  // Fill username
  await page.waitForSelector(usernameSel, { timeout: 15000 });
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.value = ""; }, usernameSel);
  await page.type(usernameSel, process.env.LOGIN_USER, { delay: 50 });

  // Fill password
  await page.waitForSelector(passwordSel, { timeout: 15000 });
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.value = ""; }, passwordSel);
  await page.type(passwordSel, process.env.LOGIN_PASS, { delay: 50 });

  // Extract CAPTCHA text
  await page.waitForSelector(captchaTextSel, { timeout: 15000 });
  const captchaText = await page.$eval(captchaTextSel, el => el.textContent.trim());
  console.log("🔐 CAPTCHA extracted:", captchaText);

  // Fill CAPTCHA
  await page.waitForSelector(captchaSel, { timeout: 15000 });
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.value = ""; }, captchaSel);
  await page.type(captchaSel, captchaText, { delay: 30 });

  // Submit login
  console.log("Clicking sign in button...");
  await Promise.all([
    page.click(loginBtnSel),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
  ]);

  // Verify login
  const currentUrl = page.url();
  if (currentUrl.includes("login")) {
    throw new Error("Login failed: Still on login page");
  }
  if (postLoginSel) {
    try {
      await page.waitForSelector(postLoginSel, { timeout: 10000 });
    } catch {
      console.warn("⚠️ Post-login selector not found—continuing anyway");
    }
  }
  console.log("✅ Login successful!");
}

// ==================== SCRAPE ====================
async function scrapeEvents(page) {
  console.log("Navigating to events page...");
  await page.goto(process.env.EVENTS_URL, { waitUntil: "networkidle2", timeout: 60000 });

  // If redirected to login, perform login and retry
  if (page.url().includes("login")) {
    console.log("⚠️ Redirected to login, performing login...");
    await login(page);
    await page.goto(process.env.EVENTS_URL, { waitUntil: "networkidle2", timeout: 60000 });
  }

  // Wait for table rows—add a fallback wait for the table itself
  console.log("📊 Waiting for events table...");
  try {
    await page.waitForSelector("table tbody tr", { timeout: 30000 });
  } catch {
    // Try waiting for the table element then rows again
    await page.waitForSelector("table", { timeout: 15000 });
    await page.waitForSelector("table tbody tr", { timeout: 15000 });
  }

  // Scrape rows
  console.log("📥 Scraping events...");
  const rows = await page.$$eval("table tbody tr", (tableRows) =>
    tableRows.map((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 5) return null;
      return {
        type: cells[0]?.textContent?.trim() || "",
        school: cells[1]?.textContent?.trim() || "",
        title: cells[2]?.textContent?.trim() || "",
        startDate: cells[3]?.textContent?.trim() || "",
        endDate: cells[4]?.textContent?.trim() || "",
        url: cells[5]?.querySelector("a")?.href || "",
      };
    })
  );

  const events = rows.filter(r => r && r.title && r.type && r.school);
  console.log(`✅ Scraped ${events.length} events`);
  return events;
}

// ==================== MAIN TEST ====================
async function runMVP() {
  const browser = await puppeteer.launch({ headless: false, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  try {
    // Always login first to avoid timing issues
    await login(page);

    const events = await scrapeEvents(page);

    if (events.length > 0) {
      await Event.insertMany(events);
      console.log(`💾 Saved ${events.length} events to MongoDB`);
    } else {
      console.warn("⚠️ No events scraped—nothing saved");
    }

    const savedEvents = await Event.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log("📊 Sample events from DB:", savedEvents);

  } catch (err) {
    console.error("❌ MVP pipeline failed:", err.message);
    // Optional: capture a screenshot for debugging
    try {
      await page.screenshot({ path: "mvp-error.png", fullPage: true });
      console.log("📸 Saved error screenshot: mvp-error.png");
    } catch {}
  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

runMVP();
