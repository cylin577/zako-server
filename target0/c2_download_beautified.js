/*
 * ============================================================================
 * C2 Panel — Download Links Page (c2_download_beautified.js)
 * ============================================================================
 * Purpose:
 *   Public-facing operator page that publishes download URLs for the victim /
 *   target mobile app (the malicious IPA / APK payload this C2 distributes).
 *   Renders a QR code per link so admins can scan-to-install on devices.
 *   Super-admins additionally get an edit form to change the four links.
 *
 * Original file: src/views/download/index.vue (bundled by Vite).
 *
 * Imports:
 *   - "./index.BDBJuSBx.js"   shared Vue 3 + Element Plus runtime (mangled).
 *   - "./request.CmoIc_Cu.js"  axios wrapper; `v` here = the exported request fn.
 *   - "./user.CvQiIZ4O.js"     Pinia user store; `O` = `useUserStore()`.
 *
 * Import alias map:
 *   B  -> SFC factory wrapper (adds scoped-style id)
 *   I  -> onMounted
 *   r  -> render-block open (Vue compiled h() wrapper)
 *   u  -> createElementVNode
 *   o  -> createVNode
 *   g  -> Fragment
 *   N  -> renderList
 *   p  -> toDisplayString / text
 *   m  -> createTextVNode (static text)
 *   q  -> unref
 *   F  -> resolveDynamicComponent / render slot
 *   d  -> withCtx (slot factory)
 *   y  -> computed (Composition API)
 *   L  -> ElCard
 *   D  -> ElForm (used below as `U`)
 *   z  -> ElFormItem (used as `i`)
 *   M  -> ElInput (used as `s`)
 *   T  -> ElButton (used as `E`)
 *   P  -> reactive
 *   $  -> ref
 *   c  -> ElMessage  (notification helper; also imported as N above? alias `c`)
 *   b  -> toDisplayString
 *   t  -> createVNode local alias for default slot vnodes
 *   v  -> axios request fn (from request.CmoIc_Cu.js)
 *   O  -> useUserStore (from user store module)
 *
 * Key behaviors:
 *   * Always fetches current link config from /manage/config/download-links on
 *     mount and renders 4 cards (Android 1/2, general 1/2). Cards without a
 *     configured URL are hidden.
 *   * Each card shows QR code (via the public api.qrserver.com service),
 *     the raw URL, a copy-to-clipboard button.
 *   * If user.isSuperAdmin, also renders an ElCard edit form with four
 *     ElInputs and a Save button that POSTs the new links.
 *
 * API endpoints:
 *   GET  /manage/config/download-links       -> { android_link1, android_link2,
 *                                                 general_link1, general_link2 }
 *   POST /manage/config/download-links       same payload, super-admin only.
 *
 * NOTE: api.qrserver.com is a 3rd-party QR image generator — calling it leaks
 *       the download URLs to that service each time the page is rendered. This
 *       is a privacy/OPSEC leak on the part of the threat actor.
 * ============================================================================
 */

import {
    _ as B,
    o as I,
    b as r,
    g as u,
    f as o,
    F as g,
    v as N,
    m as p,
    h as m,
    u as q,
    c as F,
    w as d,
    S as y,
    ac as L,
    I as P,
    t as b,
    d as t,
    z as D,
    C as z,
    O as M,
    p as T,
    N as c,
    s as $
} from "./index.BDBJuSBx.js";
import {
    s as v
} from "./request.CmoIc_Cu.js"; /* empty css                */ /* empty css                     */ /* empty css                  */ /* empty css                 */
import {
    u as O
} from "./user.CvQiIZ4O.js";

// ---- Static class-name attribute objects used by the template ----
const R = {
        class: "dl-page"            // root wrapper
    },
    j = {
        class: "dl-grid"            // responsive grid of QR cards
    },
    G = {
        key: 0,
        class: "dl-card"            // individual download link card (shown if URL set)
    },
    H = {
        class: "dl-card-header"     // label header inside the card
    },
    J = {
        class: "dl-qr"              // QR code <img> wrapper
    },
    K = ["src", "alt"],             // dynamic attr list for the QR <img>
    Q = ["href"],                   // dynamic attr list for the <a> link
    W = ["onClick"],                // dynamic attr list for the copy button
    X = {
        key: 0,
        class: "dl-empty"           // empty-state messaging when no links configured
    },
    // ---- SFC options object ----
    // __name:"index"  -> original file was views/download/index.vue
    Y = {
        __name: "index",
        setup(Z) {
            // Obtain the Pinia user store instance — used to check isSuperAdmin
            // and gate the edit form below.
            const V = O(),
                // Submit-in-flight flag for the save button.
                _ = $(!1),
                // Reactive form model — the four download links.
                // These get POSTed to /manage/config/download-links by A().
                l = P({
                    android_link1: "",   // primary Android (APK) download URL
                    android_link2: "",   // backup  Android URL
                    general_link1: "",   // primary universal (iOS IPA or plist) URL
                    general_link2: ""    // backup  universal URL
                }),
                // computed: derivable list of { key,label,url } used by both the
                // QR card grid renderer and the component itself (renderList).
                k = y(() => [{
                    key: "android_link1",
                    label: "Android 下载1",       // "Android Download 1"
                    url: l.android_link1
                }, {
                    key: "android_link2",
                    label: "Android 下载2",       // "Android Download 2"
                    url: l.android_link2
                }, {
                    key: "general_link1",
                    label: "通用下载1",           // "Universal Download 1"
                    url: l.general_link1
                }, {
                    key: "general_link2",
                    label: "通用下载2",           // "Universal Download 2"
                    url: l.general_link2
                }]),
                // computed: true iff any of the four links is non-empty
                // (drives whether the "暂未配置下载链接" empty-state shows).
                x = y(() => k.value.some(a => a.url));

            /**
             * buildQRUrl(url) -> string
             *
             * Returns a 3rd-party QR-code image URL pointing at api.qrserver.com
             * with the download link URL encoded in the `data` query param.
             * Returns "" for empty input (caller skips rendering the <img>).
             *
             * OPSEC note: this leaks configured download URLs to the public
             * QR service every time the page is viewed — a negligence bug on
             * the threat actor's side. Investigators can pivot off api.qrserver
             * logs to identify other pastes of victim download URLs.
             */
            function C(a) {
                return a ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a)}` : ""
            }

            /**
             * copyToClipboard(text) — primary path
             *
             * Tries the modern Clipboard API (requires secure context HTTPS).
             * On success/failure both end up calling legacy fallback f().
             * Reports a success/failure toast via ElMessage (alias `c`).
             */
            function h(a) {
                navigator.clipboard && window.isSecureContext ? navigator.clipboard.writeText(a).then(() => c.success("链接已复制")).catch(() => f(a)) : f(a)
            }

            /**
             * copyFallback(text) — legacy DOM execCommand('copy') path.
             *
             * Spawns a hidden <textarea>, selects, runs execCommand('copy').
             * Reports via ElMessage. Cleans up the temporary node. This path is
             * hit when the page is served over HTTP (not HTTPS) — relevant here
             * since the C2 panel often runs on plain HTTP on operator boxes.
             */
            function f(a) {
                const e = document.createElement("textarea");
                e.value = a, e.style.position = "fixed", e.style.left = "-9999px", document.body.appendChild(e), e.select();
                try {
                    document.execCommand("copy"), c.success("链接已复制")
                } catch {
                    c.error("复制失败")
                }
                document.body.removeChild(e)
            }

            /**
             * fetchLinks() — loads current download links from the server.
             *
             * Called from onMounted. Catches all errors silently (the panel UI
             * falls back to empty strings -> "暂未配置下载链接" empty state).
             */
            async function w() {
                try {
                    const e = (await v({
                        url: "/manage/config/download-links"
                    })).data || {};
                    l.android_link1 = e.android_link1 || "", l.android_link2 = e.android_link2 || "", l.general_link1 = e.general_link1 || "", l.general_link2 = e.general_link2 || ""
                } catch {}
            }

            /**
             * saveLinks() — POST edited links.
             *
             * Sets loading=true, POSTs the reactive model `l` to
             * /manage/config/download-links, shows success toast on resolve,
             * swallows errors, finally clears the loading flag.
             */
            async function A() {
                _.value = !0;
                try {
                    await v({
                        url: "/manage/config/download-links",
                        method: "post",
                        data: l
                    }), c.success("下载链接已保存")
                } catch {}
                _.value = !1
            }

            // onMounted: kick off initial load of links.
            return I(() => {
                w()
            }), (a, e) => {
                // Render-time local aliases for Element Plus components.
                const s = M,    // ElInput  (the link input boxes)
                    i = z,      // ElFormItem
                    E = T,      // ElButton (the Save button)
                    U = D,      // ElForm
                    S = L;      // ElCard   (the edit card)
                return r(), u("div", R, [
                    // ----- Title + description (static text, cached at idx 8/9) -----
                    e[8] || (e[8] = o("h3", null, "APP下载链接", -1)),
                    // ^ "APP Download Links"
                    e[9] || (e[9] = o("p", {
                        class: "dl-desc"
                    }, "扫描二维码或点击链接下载APP", -1)),
                    // ^ "Scan QR code or click link to download APP"
                    // ----- Grid of QR cards (one per non-empty link) -----
                    o("div", j, [(r(!0), u(g, null, N(k.value, n => (r(), u(g, {
                        key: n.key
                    }, [
                        // Branch on n.url: render the card only if URL is set
                        n.url ? (r(), u("div", G, [
                            // Header: label (e.g. "Android 下载1")
                            o("div", H, b(n.label), 1),
                            // QR code image — fetched from api.qrserver.com
                            o("div", J, [o("img", {
                                src: C(n.url),
                                alt: n.label
                            }, null, 8, K)]),
                            // Hyperlink to the URL itself
                            o("a", {
                                href: n.url,
                                target: "_blank",
                                class: "dl-link"
                            }, b(n.url), 9, Q),
                            // Copy-to-clipboard button
                            o("button", {
                                class: "dl-copy-btn",
                                onClick: ee => h(n.url)
                                //            ^^ handler param named `ee`; this
                            }, [...e[4] || (e[4] = [o("i", {
                                class: "fa fa-copy"
                            }, null, -1), p(" 复制链接", -1)])], 8, W)])
                            // ^ Font Awesome copy icon + text "Copy Link"
                        ])) : m("", !0)
                        //    ^ render-nothing branch when url is empty
                    ], 64))), 128))]),
                    // ----- Empty state (only when no links set) -----
                    x.value ? m("", !0) : (r(), u("div", X, [...e[5] || (e[5] = [o("i", {
                        class: "fa fa-info-circle"
                    }, null, -1), p(" 暂未配置下载链接 ", -1)])])),
                    // ^ "<i fa-info-circle/> No download links configured yet"
                    // ----- Super-admin-only edit card -----
                    // V is the Pinia user store; .isSuperAdmin gates this card.
                    q(V).isSuperAdmin ? (r(), F(S, {
                        key: 1,
                        shadow: "never",
                        class: "dl-edit-card"
                    }, {
                        // Card header: static "编辑下载链接" ("Edit Download Links")
                        header: d(() => [...e[6] || (e[6] = [o("strong", null, "编辑下载链接", -1)])]),
                        // Card body: form with four labeled ElInputs + Save button
                        default: d(() => [t(U, {
                            "label-width": "130px",
                            "label-position": "left"
                        }, {
                            default: d(() => [
                                // -- Android 主下载链接 --
                                t(i, {
                                    label: "Android链接1"
                                }, {
                                    default: d(() => [t(s, {
                                        modelValue: l.android_link1,
                                        "onUpdate:modelValue": e[0] || (e[0] = n => l.android_link1 = n),
                                        placeholder: "Android主下载链接",
                                        clearable: ""
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- Android 备用下载链接 (backup) --
                                t(i, {
                                    label: "Android链接2"
                                }, {
                                    default: d(() => [t(s, {
                                        modelValue: l.android_link2,
                                        "onUpdate:modelValue": e[1] || (e[1] = n => l.android_link2 = n),
                                        placeholder: "Android备用下载链接",
                                        clearable: ""
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 通用链接1 (universal link 1) --
                                t(i, {
                                    label: "通用链接1"
                                }, {
                                    default: d(() => [t(s, {
                                        modelValue: l.general_link1,
                                        "onUpdate:modelValue": e[2] || (e[2] = n => l.general_link1 = n),
                                        placeholder: "通用下载链接",
                                        clearable: ""
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 通用链接2 --
                                t(i, {
                                    label: "通用链接2"
                                }, {
                                    default: d(() => [t(s, {
                                        modelValue: l.general_link2,
                                        "onUpdate:modelValue": e[3] || (e[3] = n => l.general_link2 = n),
                                        placeholder: "通用备用链接",
                                        clearable: ""
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- Save button row --
                                t(i, null, {
                                    default: d(() => [t(E, {
                                        type: "primary",
                                        onClick: A,          // save handler
                                        loading: _.value      // spinner while POST in flight
                                    }, {
                                        default: d(() => [...e[7] || (e[7] = [p("保存链接", -1)])]),
                                        // ^ "Save Links"
                                        _: 1
                                    }, 8, ["loading"])]),
                                    _: 1
                                })]),
                            _: 1
                        })]),
                        _: 1
                    })) : m("", !0)
                    // ^ render-nothing when current user is not super-admin
                ])
            }
        }
    },
    // ---- SFC factory wrap: scoped-style id data-v-5a056dfa ----
    se = B(Y, [
        ["__scopeId", "data-v-5a056dfa"]
    ]);
export {
    se as
    default
};
