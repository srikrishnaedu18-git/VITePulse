import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

dotenv.config();

const COOKIE_PATH = path.join(process.cwd(), ".session.json");

function isLoginUrl(url = "") {
  const lower = String(url).toLowerCase();
  return lower.includes("/users") || lower.includes("login");
}

// ==================== COOKIE MANAGEMENT ====================
async function loadCookies(page) {
  if (!fs.existsSync(COOKIE_PATH)) return false;
  const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf-8"));
  await page.setCookie(...cookies);
  return true;
}

async function saveCookies(page) {
  const cookies = await page.cookies();
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
}

// ==================== LOGIN ====================
async function login(page) {
  console.log("Navigating to login page...");
  await page.goto(process.env.LOGIN_URL, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  const usernameSel = process.env.USERNAME_SELECTOR || "#emailId";
  const passwordSel = process.env.PASSWORD_SELECTOR || "#password";
  const captchaSel = process.env.CAPTCHA_SELECTOR || "#captchaInput";
  const loginBtnSel = process.env.LOGIN_BUTTON_SELECTOR || "#signIn";
  const captchaTextSel = "#CaptchaDiv";

  await page.waitForSelector(usernameSel);
  await page.evaluate((sel) => {
    document.querySelector(sel).value = "";
  }, usernameSel);
  await page.type(usernameSel, process.env.LOGIN_USER);

  await page.waitForSelector(passwordSel);
  await page.evaluate((sel) => {
    document.querySelector(sel).value = "";
  }, passwordSel);
  await page.type(passwordSel, process.env.LOGIN_PASS);

  await page.waitForSelector(captchaTextSel);
  const captchaText = await page.$eval(captchaTextSel, (el) =>
    el.textContent.trim(),
  );
  console.log("🔐 CAPTCHA extracted:", captchaText);

  await page.waitForSelector(captchaSel);
  await page.evaluate((sel) => {
    document.querySelector(sel).value = "";
  }, captchaSel);
  await page.type(captchaSel, captchaText);

  console.log("Clicking sign in button...");
  await Promise.all([
    page.click(loginBtnSel),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
  ]);

  const currentUrl = page.url();
  if (isLoginUrl(currentUrl)) {
    throw new Error("Login failed: Still on login page. Check credentials.");
  }

  console.log("✅ Login successful!");
  await saveCookies(page);
}

// ==================== DATE PARSER ====================
function parseDateToISO(dateStr) {
  const raw = (dateStr || "").trim();

  // handle header strings like "Start Date" / "End Date"
  if (!raw) return null;
  const looksLikeDate = /^\d{1,2}-\d{1,2}-\d{4}/.test(raw);
  if (!looksLikeDate) return null;

  try {
    const [datePart, timePart] = raw.split(" ");
    const [day, month, year] = datePart.split("-");
    const [hours, minutes] = (timePart || "00:00").split(":");

    const d = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
    );

    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

// ==================== MAIN SCRAPING FUNCTION ====================
export async function scrapeEvents() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    await loadCookies(page);

    console.log("Going to events page...");
    await page.goto(process.env.EVENTS_URL, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // If redirected to login
    if (isLoginUrl(page.url())) {
      console.log("⚠️ Session expired, logging in...");
      await login(page);

      // go back to events page
      await page.goto(process.env.EVENTS_URL, {
        waitUntil: "networkidle2",
        timeout: 60000,
      });
    }

    console.log("✓ On events page, waiting for table...");
    await page.waitForSelector("table tbody tr", { timeout: 30000 });

    console.log("📊 Scraping events from table...");
    const rows = await page.$$eval("table tbody tr", (tableRows) =>
      tableRows.map((row) => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) return null;

        return {
          type: cells[0]?.textContent?.trim() || "",
          school: cells[1]?.textContent?.trim() || "",
          title: cells[2]?.textContent?.trim() || "",
          startDate: cells[3]?.textContent?.trim() || "",
          endDate: cells[4]?.textContent?.trim() || "",
          url: cells[5]?.querySelector("a")?.href || "",
        };
      }),
    );

    // build final events list with parsed dates + skip invalid rows
    const events = rows
      .filter((r) => r && r.title && r.type && r.school)
      .map((r) => {
        const startISO = parseDateToISO(r.startDate);
        const endISO = parseDateToISO(r.endDate);
        if (!startISO || !endISO) return null;

        return {
          ...r,
          startDate: startISO,
          endDate: endISO,
        };
      })
      .filter(Boolean);

    console.log(`✅ Successfully scraped ${events.length} events!`);

    await browser.close();
    return events;
  } catch (error) {
    await browser.close();
    throw error;
  }
}
