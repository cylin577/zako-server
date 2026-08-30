/*
 * ============================================================================
 * C2 Panel — Admin/User Management Page (c2_admin_beautified.js)
 * ============================================================================
 * Purpose:
 *   Super-admin only page that lets the primary operator manage OTHER panel
 *   operators. From here the threat actor who deployed this C2 can:
 *
 *     - List all operator accounts (paginated, searchable by username/nickname)
 *     - Create new operators with role "admin" or "user"
 *     - Edit existing operators (nickname/role/status)
 *     - Reset another operator's password
 *     - Toggle an operator's enabled/disabled status inline
 *     - Delete an operator (except super_admins, which are protected)
 *
 *   Role model (from this file + the form definitions below):
 *
 *     super_admin  ("超级管理员")  — full control; cannot be edited or deleted
 *                                    from this UI. Only a super_admin sees the
 *                                    "新增管理员" (Add Admin) button.
 *     admin        ("普通管理")    — can view ALL collected victim data
 *                                    ("可查看所有数据")
 *     user         ("普通账号")    — can only search/query victim data
 *                                    (limited operator, e.g. a sub-tenant)
 *
 *   NOTE: the create-form's role select only offers "admin" and "user"
 *   (`普通管理` / `普通账号`) — you cannot promote to super_admin from the
 *   UI; that role is bootstrap-only.
 *
 * Original file: src/views/admin/index.vue (bundled by Vite).
 *
 * Imports:
 *   - "./index.BDBJuSBx.js"   Vue 3 + Element Plus runtime (mangled).
 *   - "./request.CmoIc_Cu.js"  axios wrapper; `b` here = request fn.
 *   - "./user.CvQiIZ4O.js"    Pinia user store; `ze` = useUserStore().
 *
 * Import alias map (notable):
 *   ibe  -> SFC factory wrapper
 *   re   -> onMounted
 *   g    -> createVNode block-open
 *   T    -> createElementVNode
 *   c    -> createVNode (raw DOM)
 *   a    -> createVNode (Element Plus component)
 *   de   -> withKeys (Enter key filter)
 *   _    -> unref / resolveDynamicComponent (icons)
 *   N    -> Element Plus "Search" icon (a0)
 *   ue   -> Element Plus "Plus"  icon (a1)
 *   me   -> Element Plus "Refresh" icon (a2)
 *   pe   -> vLoading directive
 *   fe   -> vLoading target register ("L" / `oe` here)
 *   ve   -> ElInput  (search box, dialog inputs)
 *   ge   -> ElButton  (alias `u`)
 *   ce   -> ElTable  (alias `se`)
 *   E    -> reactive (Composition API)
 *   ve   -> ElPagination (alias `ne`)
 *   be   -> ElDialog  (alias `S`)
 *   ye   -> ElTableColumn (alias `f`)
 *   we   -> ElTag (alias `le`)
 *   Ue   -> ElFormItem (alias `m`)
 *   Ee   -> ElForm (alias `R`)
 *   $e   -> ElSelect (alias `L`)
 *   Fe   -> ElOption (alias `w`)
 *   Ce   -> Element Plus "Key"/reset icon (a6 — used on 重置密码 button)
 *   ke   -> Element Plus "Edit" icon (a5 — used on 编辑 button)
 *   xe   -> Element Plus "Delete" icon (a7 — used on 删除 button)
 *   Ve   -> ElSwitch (alias `B`) — inline enable/disable per row
 *   v    -> ref
 *   k    -> ElMessage
 *   he   -> ElMessageBox.confirm (used by destructive delete)
 *
 * API endpoints:
 *   GET    /manage/admin/list?page&limit&keyword   -> { list:[...], total:N }
 *   POST   /manage/admin/create       { form...}   -> create new operator
 *   PUT    /manage/admin/:id          { form...}   -> update profile/role/status
 *   PUT    /manage/admin/:id          { password } -> reset another op's pwd
 *   DELETE /manage/admin/:id                        -> delete operator (cascade?)
 *
 * State shape:
 *   Three reactive dialog-state objects: `r` (create), `n` (edit), `i`
 *   (reset password). Each one carries: { visible, submitting, form, ... }
 *   plus an editId/adminId where relevant. Three form refs (z/D/P) call
 *   Element Plus validate()/resetFields() on the corresponding forms.
 *
 * Per-row "status" toggle behavior:
 *   On switch flip, the row's _statusLoading flag is set true, a PUT
 *   /manage/admin/:id { status } is fired, success toast is shown. On
 *   failure the local status is reverted (XOR 1) so the switch visually
 *   snaps back — this is the only error-recoverable mutation in the file.
 *
 * Confirmation UX:
 *   Status toggle: instant switch, no confirm dialog (optimistic).
 *   Reset password: opens a dialog with new+confirm password fields.
 *   Delete: ElMessageBox.confirm warning with custom confirm/cancel text.
 *   Create/Edit: dialog with form validation, "确定"/"取消" footer.
 *
 * Threat-actor observation:
 *   The admin page lets the threat actor partition access among multiple
 *   operators — e.g. resellers of the C2 service can be given a "user" role
 *   that only sees their own victims' data, while "admin" sees everyone's.
 *   The role_type field thus doubles as a multi-tenant isolation primitive.
 * ============================================================================
 */

import {
    _ as ie,
    o as re,
    b as g,
    g as T,
    f as c,
    d as a,
    y as de,
    u as _,
    a0 as N,
    w as s,
    c as x,
    a1 as ue,
    h as I,
    a2 as me,
    D as pe,
    L as fe,
    s as v,
    O as _e,
    p as ge,
    P as ce,
    I as E,
    Q as ve,
    T as be,
    m as d,
    Y as ye,
    a3 as we,
    t as U,
    a4 as Ve,
    a5 as ke,
    a6 as Ce,
    a7 as xe,
    z as Ee,
    C as Ue,
    a8 as $e,
    a9 as Fe,
    N as k,
    R as he
} from "./index.BDBJuSBx.js";
import {
    s as b
} from "./request.CmoIc_Cu.js"; /* empty css                        */ /* empty css                  */ /* empty css                     */ /* empty css                   */ /* empty css                      */ /* empty css                 */ /* empty css                  */
import {
    u as ze
} from "./user.CvQiIZ4O.js";

// ---- Static class-name attribute objects used by template ----
const De = {
        class: "admin-page"                // root wrapper
    },
    Re = {
        class: "admin-toolbar"             // top toolbar (search + actions)
    },
    Se = {
        class: "admin-toolbar-left"        // left side: search input + 搜索 btn
    },
    Te = {
        class: "admin-toolbar-right"       // right side: 新增 + 刷新 btns
    },
    Ie = {
        key: 0,
        class: "invite-code"               // invite-code span (shown if set)
    },
    Pe = {
        key: 1,
        class: "text-muted"                // muted dash placeholder
    },
    qe = {
        class: "admin-pagination"          // pagination wrapper div
    },
    // ---- SFC options object ----
    // __name:"index"  -> original file was views/admin/index.vue
    Be = {
        __name: "index",
        setup(Le) {
            // ----- Pinia user store — used to gate the "新增管理员" button -----
            const M = ze(),
                // ----- Reactive state -----
                $ = v(!1),    // table loading
                F = v(""),    // search keyword (server-side filter)
                C = v([]),    // admin/operator rows on the current page
                h = v(0),     // total row count
                y = E({       // pagination params (page/limit)
                    page: 1,
                    limit: 10
                }),
                z = v(null),   // create-form el ref  (validate/resetFields)
                D = v(null),   // edit-form  el ref
                P = v(null),   // reset-pwd  el ref
                // ----- `r` = CREATE dialog state -----
                r = E({
                    visible: !1,
                    submitting: !1,
                    form: {
                        username: "",
                        password: "",
                        nickname: "",
                        role_type: "admin",         // default role for new op
                        invite_code: "",
                        assigned_invites: "",
                        can_delete_user: 0,
                        can_export_data: 0,
                        view_all_invites: 0
                    }
                }),
                // Validation rules for the CREATE form.
                K = {
                    username: [{
                        required: !0,
                        message: "请输入用户名",     // "Please enter username"
                        trigger: "blur"
                    }],
                    password: [{
                        required: !0,
                        message: "请输入密码",       // "Please enter password"
                        trigger: "blur"
                    }, {
                        min: 6,
                        message: "密码最少6位",      // "Password at least 6 chars"
                        trigger: "blur"
                    }],
                    nickname: [{
                        required: !0,
                        message: "请输入昵称",       // "Please enter nickname"
                        trigger: "blur"
                    }],
                    role_type: [{
                        required: !0,
                        message: "请选择角色",       // "Please select a role"
                        trigger: "change"
                    }]
                },
                // ----- `n` = EDIT dialog state -----
                n = E({
                    visible: !1,
                    submitting: !1,
                    editId: null,                   // admin id being edited
                    form: {
                        username: "",
                        nickname: "",
                        role_type: "user",
                        invite_code: "",
                        assigned_invites: "",
                        can_delete_user: 0,
                        can_export_data: 0,
                        view_all_invites: 0,
                        status: 1                    // 1=enabled, 0=disabled
                    }
                }),
                // Validation rules for the EDIT form (no password rules).
                A = {
                    nickname: [{
                        required: !0,
                        message: "请输入昵称",
                        trigger: "blur"
                    }],
                    role_type: [{
                        required: !0,
                        message: "请选择角色",
                        trigger: "change"
                    }]
                },
                // ----- `i` = RESET PASSWORD dialog state -----
                i = E({
                    visible: !1,
                    submitting: !1,
                    adminId: null,                  // admin whose pwd will reset
                    username: "",                   // display-only field
                    form: {
                        new_password: "",
                        confirm_password: ""
                    }
                }),
                // Validation rules for reset-pwd form.
                O = {
                    new_password: [{
                        required: !0,
                        message: "请输入新密码",      // "Please enter new password"
                        trigger: "blur"
                    }, {
                        min: 6,
                        message: "密码最少6位",
                        trigger: "blur"
                    }],
                    confirm_password: [{
                        required: !0,
                        message: "请再次输入新密码",  // "Please re-enter password"
                        trigger: "blur"
                    }, {
                        // Custom validator: confirm must match new_password.
                        validator: (l, e, o) => {
                            e !== i.form.new_password ? o(new Error("两次密码输入不一致")) : o()
                            // ^ "The two passwords do not match"
                        },
                        trigger: "blur"
                    }]
                };

            /**
             * fetchList() — load paginated admin/operator rows.
             *
             *   GET /manage/admin/list with params {page, limit, keyword}
             *   Server response shape: { data: { list:[...], total:N } }
             *   Each row gets a private _statusLoading flag appended for the
             *   per-row status ElSwitch spinner.
             * On failure: clear the list + zero the total.
             */
            async function p() {
                $.value = !0;
                try {
                    const e = (await b({
                        url: "/manage/admin/list",
                        method: "get",
                        params: {
                            ...y,
                            keyword: F.value || void 0
                        }
                    })).data || {};
                    C.value = (e.list || e || []).map(o => ({
                        ...o,
                        _statusLoading: !1
                    })), h.value = e.total || C.value.length
                } catch {
                    C.value = [], h.value = 0
                }
                $.value = !1
            }

            /**
             * openCreateDialog() — reset the create form to defaults and
             * show the dialog.
             */
            function Y() {
                r.form = {
                    username: "",
                    password: "",
                    nickname: "",
                    role_type: "admin",
                    invite_code: "",
                    assigned_invites: "",
                    can_delete_user: 0,
                    can_export_data: 0,
                    view_all_invites: 0
                }, r.visible = !0
            }

            /**
             * resetCreateForm() — bound to dialog's @closed event; clears any
             * Element Plus validation error states once the dialog finishes
             * its close animation (so next open is visually clean).
             */
            function j() {
                var l;
                (l = z.value) == null || l.resetFields()
            }

            /**
             * submitCreate() — validate the create form, then POST the form
             * to /manage/admin/create. On success: success toast, close
             * dialog, refresh list. Errors swallowed (network layer shows
             * failure toasts elsewhere); submitting flag always cleared.
             */
            async function H() {
                var e;
                if (await ((e = z.value) == null ? void 0 : e.validate().catch(() => !1))) {
                    r.submitting = !0;
                    try {
                        await b({
                            url: "/manage/admin/create",
                            method: "post",
                            data: r.form
                        }), k.success("创建成功"), r.visible = !1, p()
                    } catch {}
                    r.submitting = !1
                }
            }

            /**
             * openEditDialog(row) — pre-fill the edit form from the row's
             * existing fields and show the dialog. `.invite_code` and
             * `.assigned_invites` and permission flags carried over (blank
             * if absent). `status ?? 1` defaults to enabled.
             */
            function Q(l) {
                n.editId = l.id, n.form = {
                    username: l.username,
                    nickname: l.nickname || "",
                    role_type: l.role_type || "user",
                    invite_code: l.invite_code || "",
                    assigned_invites: l.assigned_invites || "",
                    can_delete_user: l.can_delete_user || 0,
                    can_export_data: l.can_export_data || 0,
                    view_all_invites: l.view_all_invites || 0,
                    status: l.status ?? 1
                }, n.visible = !0
            }

            /**
             * resetEditForm() — analog of resetCreateForm for the edit dialog.
             */
            function G() {
                var l;
                (l = D.value) == null || l.resetFields()
            }

            /**
             * submitEdit() — validate + PUT /manage/admin/:editId with the
             * edited form. Refresh the list on success.
             */
            async function J() {
                var e;
                if (await ((e = D.value) == null ? void 0 : e.validate().catch(() => !1))) {
                    n.submitting = !0;
                    try {
                        await b({
                            url: `/manage/admin/${n.editId}`,
                            method: "put",
                            data: n.form
                        }), k.success("更新成功"), n.visible = !1, p()
                    } catch {}
                    n.submitting = !1
                }
            }

            /**
             * openResetPwdDialog(row) — show the reset-password dialog for
             * a specific operator. Records the adminId + username (display
             * only) and clears new/confirm fields.
             */
            function W(l) {
                i.adminId = l.id, i.username = l.username, i.form = {
                    new_password: "",
                    confirm_password: ""
                }, i.visible = !0
            }

            /**
             * submitResetPwd() — validate + PUT /manage/admin/:adminId with
             * { password } only (server expects the field name `password`,
             * NOT `new_password`, hence the field rename on the wire).
             */
            async function X() {
                var e;
                if (await ((e = P.value) == null ? void 0 : e.validate().catch(() => !1))) {
                    i.submitting = !0;
                    try {
                        await b({
                            url: `/manage/admin/${i.adminId}`,
                            method: "put",
                            data: {
                                password: i.form.new_password
                                // ^ NOTE the field-name rename: local field
                                //   is new_password, wire field is password.
                            }
                        }), k.success("密码重置成功"), i.visible = !1
                    } catch {}
                    i.submitting = !1
                }
            }

            /**
             * toggleStatus(row) — inline enable/disable handler bound to the
             * per-row ElSwitch. Optimistic: spinner spins while the PUT is
             * in flight; on failure the local status is flipped back so the
             * switch visually undoes. The only mutation in this file that
             * rolls back on error.
             */
            async function Z(l) {
                l._statusLoading = !0;
                try {
                    await b({
                        url: `/manage/admin/${l.id}`,
                        method: "put",
                        data: {
                            status: l.status
                        }
                    }), k.success(l.status === 1 ? "已启用" : "已禁用")
                    // ^ "Enabled" / "Disabled"
                } catch {
                    l.status = l.status === 1 ? 0 : 1
                }
                l._statusLoading = !1
            }

            /**
             * confirmDelete(row) — ElMessageBox.confirm prompt to delete an
             * operator (role-super_admin not pre-reachable since the table
             * hides the button for super_admins). On confirm: DELETE
             * /manage/admin/:id; on success refresh the list. Catch absorbs
             * both network failure AND user-cancel.
             */
            async function ee(l) {
                try {
                    await he.confirm(`确认删除管理员「${l.username}」？此操作不可恢复！`, "删除确认", {
                        type: "warning",
                        confirmButtonText: "确认删除",
                        cancelButtonText: "取消"
                    }), await b({
                        url: `/manage/admin/${l.id}`,
                        method: "delete"
                    }), k.success("删除成功"), p()
                } catch {}
            }

            /**
             * roleLabel(role) — pretty-print role enum into Chinese:
             *   super_admin -> "超级管理员"
             *   admin       -> "普通管理"
             *   user        -> "普通账号"
             */
            function ae(l) {
                return {
                    super_admin: "超级管理员",
                    admin: "普通管理",
                    user: "普通账号"
                } [l] || l || "-"
            }

            /**
             * roleTagType(role) — Element Plus tag type for color coding:
             *   super_admin -> danger  (red)
             *   admin       -> warning (orange)
             *   user        -> ""      (default / blue)
             */
            function te(l) {
                return {
                    super_admin: "danger",
                    admin: "warning",
                    user: ""
                } [l] || ""
            }

            /**
             * formatTime(ts) — format either a Unix-seconds timestamp or an
             * ISO-string into "YYYY-MM-DD HH:MM:SS". Returns "-" for falsy
            *  or unparsable inputs (defensive against bad server data).
             */
            function q(l) {
                if (!l) return "-";
                const e = typeof l == "number" ? new Date(l * 1e3) : new Date(l);
                if (isNaN(e.getTime())) return "-";
                const o = u => String(u).padStart(2, "0");
                return `${e.getFullYear()}-${o(e.getMonth()+1)}-${o(e.getDate())} ${o(e.getHours())}:${o(e.getMinutes())}:${o(e.getSeconds())}`
            }

            // ---- onMounted: kick off initial fetch ----
            return re(() => {
                p()
            }), (l, e) => {
                // ---- Render-time local component aliases (Element Plus) ----
                const o = _e,    // ElInput       (search box + dialog inputs)
                    u = ge,       // ElButton      (all the buttons in this file)
                    f = ye,       // ElTableColumn (column factory)
                    le = we,      // ElTag         (used for role badge)
                    B = Ve,       // ElSwitch      (per-row enable/disable)
                    se = ce,      // ElTable
                    ne = ve,      // ElPagination
                    m = Ue,       // ElFormItem
                    w = Fe,       // ElOption      (inside ElSelect)
                    L = $e,       // ElSelect      (role dropdown in dialogs)
                    R = Ee,       // ElForm
                    S = be,       // ElDialog
                    oe = fe;      // vLoading directive helper (alias `pe`)
                return g(), T("div", De, [
                    // ============== Toolbar ==============
                    T("div", Re, [
                        // ----- LEFT: search input + 搜索 (Search) button -----
                        T("div", Se, [
                            // Search box: Enter key triggers fetchList, clear
                            // also refetches. Prefix-icon = Search icon (N).
                            a(o, {
                                modelValue: F.value,
                                "onUpdate:modelValue": e[0] || (e[0] = t => F.value = t),
                                placeholder: "搜索用户名 / 昵称",
                                // ^ "Search username / nickname"
                                "prefix-icon": _(N),
                                clearable: "",
                                style: {
                                    width: "260px"
                                },
                                onKeyup: de(p, ["enter"]),
                                onClear: p
                            }, null, 8, ["modelValue", "prefix-icon"]),
                            a(u, {
                                type: "primary",
                                icon: _(N),                // Search icon
                                onClick: p                   // -> fetchList
                            }, {
                                default: s(() => [...e[19] || (e[19] = [d("搜索", -1)])]),
                                // ^ "Search"
                                _: 1
                            }, 8, ["icon"])
                        ]),
                        // ----- RIGHT: 新增管理员 + 刷新 (only super-admins see the add btn) -----
                        T("div", Te, [
                            _(M).isSuperAdmin ? (g(), x(u, {
                                key: 0,
                                type: "success",
                                icon: _(ue),               // Plus icon
                                onClick: Y                   // -> openCreateDialog
                            }, {
                                default: s(() => [...e[20] || (e[20] = [d("新增管理员", -1)])]),
                                // ^ "Add New Admin"
                                _: 1
                            }, 8, ["icon"])) : I("", !0),
                            // 刷新 (Refresh) button — always visible
                            a(u, {
                                icon: _(me),                // Refresh icon
                                onClick: p
                            }, {
                                default: s(() => [...e[21] || (e[21] = [d("刷新", -1)])]),
                                // ^ "Refresh"
                                _: 1
                            }, 8, ["icon"])
                        ])
                    ]),

                    // ============== Data table ==============
                    // Wrapped with v-loading directive while `$.value` is true.
                    pe((g(), x(se, {
                        data: C.value,
                        stripe: "",
                        border: "",
                        size: "small",
                        class: "admin-table"
                    }, {
                        default: s(() => [
                            // ----- Column: ID -----
                            a(f, {
                                prop: "id",
                                label: "ID",
                                width: "60",
                                align: "center"
                            }),
                            // ----- Column: 用户名 (username) -----
                            a(f, {
                                prop: "username",
                                label: "用户名",
                                width: "120"
                            }),
                            // ----- Column: 昵称 (nickname) -----
                            a(f, {
                                prop: "nickname",
                                label: "昵称",
                                width: "120"
                            }),
                            // ----- Column: 角色 (role) — colored ElTag -----
                            a(f, {
                                label: "角色",
                                width: "110",
                                align: "center"
                            }, {
                                default: s(({
                                    row: t
                                }) => [a(le, {
                                    type: te(t.role_type),
                                    size: "small",
                                    effect: "dark"
                                }, {
                                    default: s(() => [d(U(ae(t.role_type)), 1)]),
                                    _: 2
                                }, 1032, ["type"])]),
                                _: 1
                            }),
                            // ----- Column: 邀请码 (invite code) — fallback dash -----
                            // Invite codes are operator-tenant primitives; analysts
                            // investigating multi-tenant malware-as-a-service setups
                            // should map these codes to other panels/operators.
                            a(f, {
                                prop: "invite_code",
                                label: "邀请码",
                                width: "110"
                            }, {
                                default: s(({
                                    row: t
                                }) => [t.invite_code ? (g(), T("span", Ie, U(t.invite_code), 1)) : (g(), T("span", Pe, "-"))]),
                                _: 1
                            }),
                            // ----- Column: 状态 (status) — inline ElSwitch -----
                            a(f, {
                                label: "状态",
                                width: "80",
                                align: "center"
                            }, {
                                default: s(({
                                    row: t
                                }) => [a(B, {
                                    modelValue: t.status,
                                    "onUpdate:modelValue": V => t.status = V,
                                    "active-value": 1,
                                    "inactive-value": 0,
                                    loading: t._statusLoading,
                                    onChange: V => Z(t)              // -> toggleStatus
                                }, null, 8, ["modelValue", "onUpdate:modelValue", "loading", "onChange"])]),
                                _: 1
                            }),
                            // ----- Column: 最后登录时间 (last login) -----
                            a(f, {
                                label: "最后登录时间",
                                width: "160"
                            }, {
                                default: s(({
                                    row: t
                                }) => [d(U(q(t.last_login_time)), 1)]),
                                _: 1
                            }),
                            // ----- Column: 创建时间 (created at) -----
                            a(f, {
                                label: "创建时间",
                                width: "160"
                            }, {
                                default: s(({
                                    row: t
                                }) => [d(U(q(t.created_at)), 1)]),
                                _: 1
                            }),
                            // ----- Column: 操作 (action) — edit / reset pwd / delete -----
                            a(f, {
                                label: "操作",
                                "min-width": "240",
                                fixed: "right"
                            }, {
                                default: s(({
                                    row: t
                                }) => [
                                    // 编辑 (Edit) — pencil icon link-button
                                    a(u, {
                                        type: "primary",
                                        link: "",
                                        size: "small",
                                        icon: _(ke),               // Edit icon
                                        onClick: V => Q(t)            // -> openEditDialog
                                    }, {
                                        default: s(() => [...e[22] || (e[22] = [d("编辑", -1)])]),
                                        // ^ "Edit"
                                        _: 1
                                    }, 8, ["icon", "onClick"]),
                                    // 重置密码 (Reset Password) — key icon link-button
                                    a(u, {
                                        type: "warning",
                                        link: "",
                                        size: "small",
                                        icon: _(Ce),               // Key icon
                                        onClick: V => W(t)            // -> openResetPwdDialog
                                    }, {
                                        default: s(() => [...e[23] || (e[23] = [d("重置密码", -1)])]),
                                        // ^ "Reset Password"
                                        _: 1
                                    }, 8, ["icon", "onClick"]),
                                    // 删除 (Delete) — hidden for super_admin role Type
                                    // (cannot remove the bootstrap account).
                                    t.role_type !== "super_admin" ? (g(), x(u, {
                                        key: 0,
                                        type: "danger",
                                        link: "",
                                        size: "small",
                                        icon: _(xe),               // Delete icon
                                        onClick: V => ee(t)           // -> confirmDelete
                                    }, {
                                        default: s(() => [...e[24] || (e[24] = [d("删除", -1)])]),
                                        // ^ "Delete"
                                        _: 1
                                    }, 8, ["icon", "onClick"])) : I("", !0)
                                ]),
                                _: 1
                            })]),
                        _: 1
                    }, 8, ["data"])), [
                        [oe, $.value]                                       // v-loading
                    ]),

                    // ============== Pagination ==============
                    T("div", qe, [a(ne, {
                        "current-page": y.page,
                        "onUpdate:currentPage": e[1] || (e[1] = t => y.page = t),
                        "page-size": y.limit,
                        "onUpdate:pageSize": e[2] || (e[2] = t => y.limit = t),
                        total: h.value,
                        "page-sizes": [10, 20, 50, 100],
                        layout: "total, sizes, prev, pager, next, jumper",
                        background: "",
                        onSizeChange: p,                  // refetch on page-size change
                        onCurrentChange: p                 // refetch on page change
                    }, null, 8, ["current-page", "page-size", "total"])]),

                    // ============== Dialog: 新增管理员 (Create Admin) ==============
                    a(S, {
                        modelValue: r.visible,
                        "onUpdate:modelValue": e[8] || (e[8] = t => r.visible = t),
                        title: "新增管理员",
                        width: "560px",
                        "destroy-on-close": "",
                        onClosed: j                     // reset form validation
                    }, {
                        // Footer slot: cancel + confirm buttons
                        footer: s(() => [
                            a(u, {
                                onClick: e[7] || (e[7] = t => r.visible = !1)
                            }, {
                                default: s(() => [...e[26] || (e[26] = [d("取消", -1)])]),
                                // ^ "Cancel"
                                _: 1
                            }),
                            a(u, {
                                type: "primary",
                                loading: r.submitting,
                                onClick: H                       // -> submitCreate
                            }, {
                                default: s(() => [...e[27] || (e[27] = [d("确定", -1)])]),
                                // ^ "OK"
                                _: 1
                            }, 8, ["loading"])
                        ]),
                        // Default slot: the create form
                        default: s(() => [a(R, {
                            ref_key: "createFormRef",
                            ref: z,
                            model: r.form,
                            rules: K,
                            "label-width": "100px"
                        }, {
                            default: s(() => [
                                // -- 用户名 (username) --
                                a(m, {
                                    label: "用户名",
                                    prop: "username"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: r.form.username,
                                        "onUpdate:modelValue": e[3] || (e[3] = t => r.form.username = t),
                                        placeholder: "请输入用户名"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 密码 (password) --
                                a(m, {
                                    label: "密码",
                                    prop: "password"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: r.form.password,
                                        "onUpdate:modelValue": e[4] || (e[4] = t => r.form.password = t),
                                        type: "password",
                                        "show-password": "",
                                        placeholder: "请输入密码"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 昵称 (nickname) --
                                a(m, {
                                    label: "昵称",
                                    prop: "nickname"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: r.form.nickname,
                                        "onUpdate:modelValue": e[5] || (e[5] = t => r.form.nickname = t),
                                        placeholder: "请输入昵称"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 角色 (role) -- ElSelect dropdown
                                a(m, {
                                    label: "角色",
                                    prop: "role_type"
                                }, {
                                    default: s(() => [a(L, {
                                        modelValue: r.form.role_type,
                                        "onUpdate:modelValue": e[6] || (e[6] = t => r.form.role_type = t),
                                        placeholder: "请选择角色",
                                        style: {
                                            width: "100%"
                                        }
                                    }, {
                                        // Only admin/user selectable; super_admin is
                                        // NOT in the list — must be bootstrapped.
                                        default: s(() => [
                                            a(w, {
                                                label: "普通管理",
                                                value: "admin"
                                            }),
                                            a(w, {
                                                label: "普通账号",
                                                value: "user"
                                            })
                                        ]),
                                        _: 1
                                    }, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // Static role-explanation helper text — cached
                                // at render-slot idx 25.
                                e[25] || (e[25] = c("div", {
                                    class: "role-desc"
                                }, [
                                    c("p", null, "1. 普通管理可查看所有数据！"),
                                    // ^ "1. Regular admins can view all data!"
                                    c("p", null, "2. 普通账号只能搜索查询数据！")
                                    // ^ "2. Regular accounts can only search/query data!"
                                ], -1))
                            ]),
                            _: 1
                        }, 8, ["model"])]),
                        _: 1
                    }, 8, ["modelValue"]),

                    // ============== Dialog: 编辑管理员 (Edit Admin) ==============
                    a(S, {
                        modelValue: n.visible,
                        "onUpdate:modelValue": e[14] || (e[14] = t => n.visible = t),
                        title: "编辑管理员",
                        width: "560px",
                        "destroy-on-close": "",
                        onClosed: G                     // reset form validation
                    }, {
                        footer: s(() => [
                            a(u, {
                                onClick: e[13] || (e[13] = t => n.visible = !1)
                            }, {
                                default: s(() => [...e[28] || (e[28] = [d("取消", -1)])]),
                                _: 1
                            }),
                            a(u, {
                                type: "primary",
                                loading: n.submitting,
                                onClick: J                       // -> submitEdit
                            }, {
                                default: s(() => [...e[29] || (e[29] = [d("确定", -1)])]),
                                _: 1
                            }, 8, ["loading"])
                        ]),
                        default: s(() => [a(R, {
                            ref_key: "editFormRef",
                            ref: D,
                            model: n.form,
                            rules: A,
                            "label-width": "100px"
                        }, {
                            default: s(() => [
                                // -- 用户名 -- disabled unless editing a super_admin
                                // (i.e. only a super_admin editing themselves can
                                // change their own username through this form, due
                                // to the disabled binding below).
                                a(m, {
                                    label: "用户名",
                                    prop: "username"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: n.form.username,
                                        "onUpdate:modelValue": e[9] || (e[9] = t => n.form.username = t),
                                        disabled: n.form.role_type !== "super_admin",
                                        placeholder: "请输入用户名"
                                    }, null, 8, ["modelValue", "disabled"])]),
                                    _: 1
                                }),
                                // -- 昵称 --
                                a(m, {
                                    label: "昵称",
                                    prop: "nickname"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: n.form.nickname,
                                        "onUpdate:modelValue": e[10] || (e[10] = t => n.form.nickname = t),
                                        placeholder: "请输入昵称"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 角色 -- disabled entirely for super_admin
                                // (you cannot demote yourself from super_admin).
                                a(m, {
                                    label: "角色",
                                    prop: "role_type"
                                }, {
                                    default: s(() => [a(L, {
                                        modelValue: n.form.role_type,
                                        "onUpdate:modelValue": e[11] || (e[11] = t => n.form.role_type = t),
                                        placeholder: "请选择角色",
                                        style: {
                                            width: "100%"
                                        },
                                        disabled: n.form.role_type === "super_admin"
                                    }, {
                                        default: s(() => [
                                            // Conditional option: only show the
                                            // super_admin option IF the row is
                                            // already a super_admin (so the
                                            // dropdown isn't empty for them).
                                            n.form.role_type === "super_admin" ? (g(), x(w, {
                                                key: 0,
                                                label: "超级管理员",
                                                value: "super_admin"
                                            })) : I("", !0),
                                            a(w, {
                                                label: "普通管理",
                                                value: "admin"
                                            }),
                                            a(w, {
                                                label: "普通账号",
                                                value: "user"
                                            })
                                        ]),
                                        _: 1
                                    }, 8, ["modelValue", "disabled"])]),
                                    _: 1
                                }),
                                // -- 状态 (status) -- ElSwitch with 启用/禁用 text
                                a(m, {
                                    label: "状态"
                                }, {
                                    default: s(() => [a(B, {
                                        modelValue: n.form.status,
                                        "onUpdate:modelValue": e[12] || (e[12] = t => n.form.status = t),
                                        "active-value": 1,
                                        "inactive-value": 0,
                                        "active-text": "启用",      // "Enabled"
                                        "inactive-text": "禁用"      // "Disabled"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                })
                            ]),
                            _: 1
                        }, 8, ["model"])]),
                        _: 1
                    }, 8, ["modelValue"]),

                    // ============== Dialog: 重置密码 (Reset Password) ==============
                    a(S, {
                        modelValue: i.visible,
                        "onUpdate:modelValue": e[18] || (e[18] = t => i.visible = t),
                        title: "重置密码",
                        width: "460px",
                        "destroy-on-close": ""
                        // No onClosed handler here — manual reset on submit
                        // (since destroy-on-close unmounts the form anyway).
                    }, {
                        footer: s(() => [
                            a(u, {
                                onClick: e[17] || (e[17] = t => i.visible = !1)
                            }, {
                                default: s(() => [...e[30] || (e[30] = [d("取消", -1)])]),
                                _: 1
                            }),
                            a(u, {
                                type: "warning",
                                loading: i.submitting,
                                onClick: X                       // -> submitResetPwd
                            }, {
                                default: s(() => [...e[31] || (e[31] = [d("确认重置", -1)])]),
                                // ^ "Confirm Reset"
                                _: 1
                            }, 8, ["loading"])
                        ]),
                        default: s(() => [a(R, {
                            ref_key: "resetPwdFormRef",
                            ref: P,
                            model: i.form,
                            rules: O,
                            "label-width": "100px"
                        }, {
                            default: s(() => [
                                // -- 管理员 (admin username, display-only) --
                                a(m, {
                                    label: "管理员"
                                }, {
                                    default: s(() => [a(o, {
                                        "model-value": i.username,
                                        disabled: ""                  // read-only input
                                    }, null, 8, ["model-value"])]),
                                    _: 1
                                }),
                                // -- 新密码 (new password) --
                                a(m, {
                                    label: "新密码",
                                    prop: "new_password"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: i.form.new_password,
                                        "onUpdate:modelValue": e[15] || (e[15] = t => i.form.new_password = t),
                                        type: "password",
                                        "show-password": "",
                                        placeholder: "请输入新密码"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                }),
                                // -- 确认密码 (confirm password) --
                                a(m, {
                                    label: "确认密码",
                                    prop: "confirm_password"
                                }, {
                                    default: s(() => [a(o, {
                                        modelValue: i.form.confirm_password,
                                        "onUpdate:modelValue": e[16] || (e[16] = t => i.form.confirm_password = t),
                                        type: "password",
                                        "show-password": "",
                                        placeholder: "请再次输入新密码"
                                        // ^ "Please re-enter the new password"
                                    }, null, 8, ["modelValue"])]),
                                    _: 1
                                })
                            ]),
                            _: 1
                        }, 8, ["model"])]),
                        _: 1
                    }, 8, ["modelValue"])
                ])
            }
        }
    },
    // ---- SFC factory wrap: scoped-style id data-v-c7655ed5 ----
    We = ie(Be, [
        ["__scopeId", "data-v-c7655ed5"]
    ]);
export {
    We as
    default
};
