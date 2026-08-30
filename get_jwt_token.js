#!/usr/bin/env node
/*  get_jwt_token.js
 *
 *  Usage:
 *    node get_jwt_token.js [invite_code] [phone]
 *
 *  Defaults:
 *    invite_code = "7865"
 *    phone       = random Chinese‑style number (86138 + 7 random digits)
 *
 *  The script runs `torsocks curl …` so the registration request goes out
 *  through the Tor network, avoiding the IP‑blacklist.  It prints only the
 *  JWT (or exits with an error message).
 */

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

// ---------- CLI ---------------------------------------------------------
const [, , inviteCode = '7865', phoneArg] = process.argv;

// ---------- helpers ------------------------------------------------------
function randomPhone() {
  // 86138 + 7 random digits
  const suffix = randomBytes(4).toString('hex').slice(0, 7);
  return `86138${suffix}`;
}
const phone = phoneArg || randomPhone();

const registerUrl = 'http://163.223.146.152/s/qb16jb/l1jrxodp/htxzq8o846';
const payload = JSON.stringify({ phone, invite_code: inviteCode });

// ---------- run torsocks curl -------------------------------------------
const curl = spawnSync(
  'torsocks',
  [
    'curl',
    '-sS',
    '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-d', payload,
    registerUrl
  ],
  { encoding: 'utf8', timeout: 30_000 }
);

if (curl.error) {
  console.error('❌ torsocks/curl failed:', curl.error.message);
  process.exit(1);
}
if (curl.status !== 0) {
  console.error('❌ curl exited with code', curl.status);
  console.error('stderr:', curl.stderr);
  process.exit(1);
}

// ---------- parse JSON ---------------------------------------------------
let json;
try {
  json = JSON.parse(curl.stdout.trim());
} catch (e) {
  console.error('❌ Unexpected response (not JSON):', curl.stdout);
  process.exit(1);
}

// ---------- output -------------------------------------------------------
if (json.code === 0 && json.data?.token) {
  // only the raw JWT – handy for piping into the dashboard script
  console.log(json.data.token);
} else {
  console.error('❌ Registration failed:', json);
  process.exit(1);
}