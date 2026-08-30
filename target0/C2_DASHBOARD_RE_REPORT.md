# C2 Dashboard Reverse-Engineering Report

**Analyst:** security researcher (defensive: victim scope, data categories, TTPs)
**Target file:** `c2_dashboard_beautified.js` (101,685 B / 2,424 lines)
**Bundle type:** Vite + Vue 3 (`<script setup>`) ES module chunk, Rollup-minified, beautified
**Imports:**
- `./index.BDBJuSBx.js` — Vue runtime + Element Plus components (renamed: `Us`=with-scope-id wrapper, `Is`=watch, `Ps`=onMounted, `d`=openBlock, `r`=createElementBlock, `s`=createElementVNode, `m`=createVNode, `h`=withCtx, `n`=toDisplayString, `a`=normalize, `z`=withModifiers, `w`=normalizeClass, `kt`=createBlock, `O`=Fragment, `Z`=renderList, `W`=withDirectives, `ot`=vModelText, `Tt`=vModelRadio, `zt`=withKeys, `G`=computed, `U`=reactive, `X`=ref, `Tt`=`__name:"index"` setup)
- `./request.CmoIc_Cu.js` → `q` — axios wrapper
- `./user.CvQiIZ4O.js` → `As` — auth/permission composable (likely `useUserStore`)

The "obfuscation" is purely minifier identifier renaming typical of production Vue builds. No string array, no control-flow flattening, no VM packer. Cleartext is everywhere.

---

## 1. What this is

A **Chinese-language Android banking/phone-access trojan admin panel** ("数据采集"/DC = "data collection"). Operator authenticates via `user.*` store and uses this single-page Vue dashboard to enumerate compromised devices and exfiltrate/inspect/delete/forward harvested personal data per device. The UI text and feature set align with widely reported Chinese-language SMS-stealer / "loan-app" / "color Web upload" families (e.g., variants sold as "华夏通讯系统木马" — visible string `华夏通讯系统木马植入` at line ~2215, trojan-injection confirm box).

Page title strings visible in render:
- `用户总数 / 通讯录总数 / 短信总数 / 相册总数` ("total users / contacts / SMS / photos")
- `短信轰炸` / `电话轰炸` ("SMS bombing" / "call bombing") toolbar buttons
- `启动木马` / `清除木马` ("launch trojan" / "remove trojan")
- `一键群发` ("one-click bulk MMS send" to victim's own contacts)
- `扫描群码` / `锁定二维码` / `微信群扫码工具` ("WeChat group QR forced-scan")
- `视频上传到各大色网` ("upload video to adult sites")
- `亲友关系` ("relatives / relationships")
- `文件管理` → `cloneUser` endpoint (full data clone of a victim)

---

## 2. Backend API surface (all under `/manage/*`, base path = same origin as panel)

| # | Endpoint | Method | Caller (`file:line`) | Purpose / data flow |
|---|----------|--------|----------------------|---------------------|
| 1 | `/manage/device/list` | GET | `R()` ~L830 | Paginated victim list; params `page,limit,keywords,invite_code`; returns `{count, data:[{id,model,phone,ip,ip_region,login_time,invite_code,sim_number,stats:{contactCount,smsCount,callCount,photoCount,appCount}}]}` |
| 2 | `/manage/device/stats` | GET | `mt()` ~L860 | Global counters `{userCount, contactCount, smsCount, imageCount}` |
| 3 | `/manage/device/show` | POST | `Ot()` L874, `et()` L1235, `rs()` ~L1180 | Per-device data of `type` ∈ {`apps`, `contacts`}. Apps used for finance-app fingerprinting (see §4). |
| 4 | `/manage/device/relatives/{id}` | GET | `Qt()` L892 | Per-victim "relatives" graph: `{count, data:[{id,name,phone}]}`. (Likely derived from contacts→co-occurrence or operator-labeled.) |
| 5 | `/manage/device/remark` | POST | `Gt()` L925 | Operator private note: `{user_id, remark}` |
| 6 | `/manage/device/deleteUser` | POST | `Kt()` L934 | Hard-delete victim + all harvested artifacts |
| 7 | `/manage/device/cloneUser` | POST | `Cs()` ~L1390 | Clone full victim dataset to another (synthetic?) account |
| 8 | `/manage/device/clear` | POST | `dt()` L1080 | Wipe per-category records: `{user_id, type}` type∈{contacts,sms,calls,images} |
| 9 | `/manage/ip-blacklist/list` | GET | `Zt()` L946 / `$s()` L1386 | List blocked IPs |
| 10 | `/manage/ip-blacklist/add` | POST | `Zt()` L974 | Block a victim IP from further uploads |
| 11 | `/manage/ip-blacklist/{id}` | DELETE | `Zt()` L963 | Unblock IP |

Additional detail-route used by sibling "data" view (referenced via `#/data?type=…&id=…&name=…` in `it()` L1002 — opens new tab): `contacts / sms / calls / photos` detail pages live in another chunk (`./index.BDBJuSBx.js` or sibling). Not in this file.

**Geo enrichment (client-side, not exfil):** `ht()` L1011 calls `http://ip-api.com/json/{ip}?lang=zh-CN&fields=…` — note **plaintext HTTP**. Geolocation lookup only. Not C2.

**External "services" the panel links to / opens:**
- `https://n103.top:84/smsboom/index.php` — SMS bomber (`Bt()` L826). **IOC.**
- `https://www.tut2020.com` — call bomber (`At()` L830). **IOC.**
- `http://ip-api.com` — IP geolocation (legitimate, but called over HTTP)
- `https://api.map.baidu.com/marker?…` — Baidu Maps deep link
- `https://uri.amap.com/marker?…` — Amap (Gaode)
- `https://www.google.com/maps?q=lat,lng`
- `https://www.maxmind.com/en/geoip-demo?ip=…`
- "WeChat group forced scan" wizard (`P.step` 1→3) — pure UI; no fetch. Phishing/social-engineering prop, displays fake progress ("正在使用【系统自带微信】强制扫描【客户微信群组】"). Likely defrauds resellers, not victim-side.
- "Upload to adult sites" dialog (`_.visible`) — also pure UI, no fetch. Status dots reference 优酷/腾讯/芒果/抖音/快手/TikTok/Facebook — fake UI to convince resellers the service works.

---

## 3. Victim data categories harvested (answers Q1)

Per-device categories the panel can read/preview/delete/export:

1. **Identity / device fingerprint** — `model` (saved as `clientid`), `phone`, `sim_number`, `invite_code` (recruitment/referral tracking — key for Q2 attribution: invites scale victim count), `login_time`, `ip`, `ip_region`
2. **Contacts** (`通讯录`) — name+phone, full dump via `/manage/device/show?type=contacts`; default rendered top 50 in the mass-MMS picker; "relatives" subset surfaced separately
3. **SMS** (`短信`) — date, phone/address, body, type (in/out)
4. **Call logs** (`通话`) — start_time, phone/number, type {1:来电,2:去电,3:未接,4:拒接}, duration, contact name
5. **Photos & videos** (`相册`) — `path` URLs (loaded into `el-image` preview list), `is_video` flag; bulk select / delete / albums
6. **Installed apps** (`已安装APP`) — name+package name; **finance-app fingerprint** (`Ot()` L874): matches app names against keyword list and tags them `is_bank=1`. Keyword list (Chinese banking/fintech): `银行, 贷款, 理财, 基金, 股票, 证券, 保险, 支付宝, 微信支付, 云闪付, 银联, 信用卡, 借贷, 投资, 钱包, 金条, 花呗, 借呗, 网商银行` — used to prioritise victims for further attack
7. **GPS location** (`位置定位`) — `latitude`, `longitude`. Rendered on Leaflet (`L`/OSM tile source, `vt="osm"` default). Marker viewable via Baidu/Amap/Google deep links. Devices without GPS or with 0,0 are flagged "未打开GPS"
8. **Relatives** (`亲友关系`) — name+phone; surfaced separately from raw contacts, treated as high-value social graph for follow-on social engineering
9. **Operator remark** — free-text per-victim note (`remark`)

Render "eye" toggles (`_eyeContact/_eyeSms/_eyeCall/_eyePhoto`) and global stat-card eye toggles (`I.user/contact/sms/photo`) simply mask numeric column — they do **not** gate server data; this is per-operator view obfuscation, not access control.

**Trojan-injection confirm box (line ~2214) lists what the planted payload harvests from the compromised device:**
> 1: 短信实时同步 (real-time SMS sync)
> 2: 支付密码获取 (payment-password capture)
> 3: 通话记录录音 (call recording)
> 4: 同步导出微信聊天记录 (WeChat chat-history export)
> 5: 同步导出QQ聊天记录 (QQ chat-history export)
> 6: 以上资料获取将自动上传服务器后台 (all above auto-uploaded to backend)

i.e., the panel is also a **payload dispatcher** — clicking `确认注入` (`bs()` L1227, fake 100-step `启动木马(Loading: N%)` progress + Matrix-rain canvas) tells the server side to push the trojan to that device. (No fetch in this view — the actual command is queued server-side and "在设备下次联网时自动执行" per the dialog copy. So the implant endpoint is *not* in this chunk; likely a sibling admin command module.)

**Notably NOT present in this file:**
- Login/auth flow (in `./user.CvQiIZ4O.js` / `./index.BDBJuSBx.js`)
- Image/file binary download endpoints (referenced only via `e.path` URL strings — host elsewhere)
- The actual C2 push channel to device (sibling chunk)
- Any ransom/encryption logic — this dashboard is **collection/management**, not the ransomware itself. If victims reported ransom, the ransom flow runs elsewhere (separate module or post-process). This panel can still be mined to enumerate every victim and why count & reach.

---

## 4. How the model works (answers Q3)

**Victim acquisition / scaling — operates via an `invite_code` system.**
Every victim record carries `invite_code`. The toolbar's `邀请码` search field + `/manage/device/list` `invite_code` param means victims are partitioned by which affiliate/reseller recruited them. This is **franchise/affiliate C2 architecture** — multiple operators each get an invite code; the affiliate's victim pool is filterable. To answer Q2 ("how many more without knowing"):

1. Hit `/manage/device/stats` → `userCount` (total infected devices), `contactCount × smsCount × imageCount` give data-volume scale.
2. Hit `/manage/device/list?page=1&limit=N` paginated → enumerate every victim `id`/`phone`/`invite_code`/`login_time`. `login_time` distribution = infection timeline.
3. Group by `invite_code` → identify each affiliate's victims. Affiliates whose `invite_code` is publicly resold in chat groups map back to specific clusters of unsuspecting victims.

**Finance-app prioritization** (`Ot()` L874): when a new device appears, panel auto-POSTs `/manage/device/show?type=apps`, filters installed packages against the 19-keyword finance keyword list, surfaces top 5 banking/fintech apps as "is_bank=1" chips in the device row. Operator uses this to pick which victims to trojan-inject for payment-password capture (point 2 of injection list).

**Mass-MMS phishing pivot (`f` reactive state, `et(e,"video")` → `/manage/device/show?type=contacts`):** operator picks a victim, pulls up to 50 of that victim's own contacts, composes an MMS or link-format SMS with attacker-chosen image/video + text + countdown, and "一键发送" (one-click send). Sends to victim's own contacts → social-trust abuse → malware payload link or payment-trick landing page. Note: actual send uses backend queue (no fetch in this chunk for the send call — `vs()` only shows a toast `正在发送...`; the `vs()` confirm dialog says "发送后不可撤销"). Likely sibling module.

**Forced WeChat group QR scan (`P.*` state, `xs()`):** 3-step phone-frame mock UI that pretends to forcibly scan a victim's WeChat group QR codes "20 min 完成". This is the **group-hijack / group-flood pivot** — used to dump group QR URLs which are then sold/abused for further mass-MMS or adult-site redirect distribution. No backend call in this file; pretends to use victim's device-installed WeChat. Pair with the "启动木马" real-time WeChat-history export (point 4) — once planted, group QR list is exfiltrated then abused here.

**Video → adult sites (`_.visible`, label `视频上传到各大色网`):** social-engineering toward *resellers'* belief that exfiltrated videos are being monetized on adult sites. Status dots claim 优酷/腾讯/芒果/抖音/快手/TikTok/Facebook publishing. Almost certainly **fake**: no upload endpoint in code; the buttons only fire `g.success("已设置上传成功！")`. This says the panel itself is partly theatre to defraud lower-tier operators — important if you're trying to gauge true scale of secondary harm vs. empty boasts.

**Trojan injection (`x.*` state + `bs()` + `gs()` Matrix canvas):** "确认注入" → fake progress to `华夏通讯系统木马植入` 100%. No fetch here. Server queues implant command; device pulls/executes next online. Per the confirm-box text, the trojan does real-time SMS sync, payment-password capture, call recording, WeChat & QQ history export. **This is the actual stalkerware/banker payload.**

**IP-blacklist toggle (`Zt()` L946):** operator can block a victim's IP from uploading. Used to suppress specific victims who notice / report. Detects who realised they're compromised — useful for your "victims not knowing" count: anyone *blacklisted* is a discovered victim, anyone *not blacklisted* is still being silently drained.

---

## 5. Indicators of Compromise (IOCs)

**Network IOCs (URLs / hostnames)**
- `n103.top:84` path `/smsboom/index.php` — SMS bomber gate
- `www.tut2020.com` — call bomber gate
- `http://ip-api.com/json/<ip>?lang=zh-CN&fields=…` — geo lookup (plaintext)
- `https://api.map.baidu.com/marker` — map deep link
- `https://uri.amap.com/marker` — map deep link
- `https://www.google.com/maps?q=…`
- API base (panel server): unlabelled, relative `/manage/*`

**API path IOCs to detect/hunt (relative paths)**
```
/manage/device/list
/manage/device/stats
/manage/device/show            # type=apps|contacts
/manage/device/relatives/<id>
/manage/device/remark
/manage/device/deleteUser
/manage/device/cloneUser
/manage/device/clear
/manage/ip-blacklist/list
/manage/ip-blacklist/add
/manage/ip-blacklist/<id>      # DELETE
```

**Static string IOCs (unique to this panel, useful for IDS / artifact triage)**
```
华夏通讯系统木马植入
启动木马(Loading: %)
短信轰炸 / 电话轰炸
一键群发 / 视频群发通讯录
扫描群码 / 锁定二维码 / 微信群扫码工具
视频上传到各大色网
正在使用【系统自带微信】强制扫描【客户微信群组】
亲友关系
银行 贷款 理财 基金 股票 证券 保险 支付宝 微信支付 云闪付 银联 信用卡 借贷 投资 钱包 金条 花呗 借呗 网商银行
奖邀请码
dc-stat-card purple/orange/blue/green
dc-trojan-confirm-box / trojan-canvas / trojan-progress-bar / trojan-fullscreen
wxqr-phone-frame / wxqr-step-box
data-v-130d8f02            # Vue scoped style hash for this chunk
```

**Bundle/asset fingerprints** (Vite chunk hashes — useful to grep other artifacts / CDNs)
```
./index.BDBJuSBx.js
./request.CmoIc_Cu.js
./user.CvQiIZ4O.js
```

---

## 6. Recommended next steps for the IR / disruption effort

1. **Pull & preserve** the two sibling chunks (`index.BDBJuSBx.js`, `request.CmoIc_Cu.js`, `user.CvQiIZ4O.js`) — they contain the auth/side-detail/routes and axios baseURL. The baseURL reveals the real C2 host. The axios wrapper `q` may also attach the operator token — clone + reuse to enumerate live victim count safely from a quarantined analyst VM (do **not** send destructive calls).
2. **Don't authenticate fresh** through the real panel unless you've coordinated with victim-side authorities — every panel login is itself an audit trail the actor may notice. Prefer reading whatever DB snapshot / backend you can acquire via legal process.
3. **Bulk-victim enumeration (Q2)** via `/manage/device/stats` + paginated `/manage/device/list` (server-side `count` is the trustworthy total). Cross-reference `invite_code` distribution and `login_time` histogram to estimate unseen victims.
4. **Finance-app keyword list** is a precision YARA-like rule — any Android sample that, when triaged, ships a similar list AND hits these `/manage/device/show?type=apps`-shaped endpoints is the same family. Add to Android-side detections.
5. **Victim notification list** = every `phone` in `/manage/device/list` plus every `phone` inside `contacts` of victims (those are *secondary* victims who received mass-MMS — they may also be infected via clicked links). See if MMS send records / queue exist in sibling chunk or DB.
6. **Report IOCs** to upstream abuse contacts: `n103.top`, `tut2020.com` registrars; `ip-api.com` is innocent. If panel host known, hosting provider / registrar / TLS issuer.
7. **Annotated + lightly-deobfuscated companion file:** `c2_dashboard_annotated.js` (same directory) — minified identifiers renamed to descriptive names, all function/route roles documented inline. Safe to grep/diff but still operational Vue (won't actually run standalone without the indices — so safe to keep for analysis).
