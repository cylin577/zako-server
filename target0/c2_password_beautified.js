/*
 * ============================================================================
 * C2 Panel — Password Change Page (c2_password_beautified.js)
 * ============================================================================
 * Purpose:
 *   Admin panel page that lets the currently-logged-in operator change their
 *   own account password. Part of the C2 admin UI (Vue 3 + Element Plus).
 *
 * Original filename (bundled): produced by Vite from src/views/password/index.vue
 *   All single-letter identifiers below are mangled exports of the shared
 *   Vue/Element-Plus runtime bundle "./index.BDBJuSBx.js". They were left as-is
 *   because they are global aliases referenced verbatim across the other panel
 *   files; renaming here without updating index.js would break the import.
 *
 * Import alias map (for the reader):
 *   b / x / y / o / a / w / m         -> Vue runtime: defineComponent / h-block
 *                                        fns / createVNode / renderSlot / etc.
 *   E                                 -> ElCard
 *   h                                 -> ElForm
 *   C                                 -> ElFormItem
 *   k                                 -> ElInput
 *   I                                 -> ElButton
 *   F                                 -> Vue render-list / resolveComponent
 *   N                                 -> ElIcon wrapper for icon (Lock?)
 *   q                                 -> reactive (Composition API)
 *   f                                 -> ref (Composition API)
 *   B                                 -> Vue SFC factory (wraps options obj)
 *   U                                 -> ElMessage (notification helper)
 *   R                                 -> axios instance from request.CmoIc_Cu.js
 *
 * UI structure:
 *   - One ElCard titled "修改密码" (Change Password).
 *   - Inside: ElForm with three password inputs and two buttons.
 *
 * API endpoints used:
 *   POST /manage/auth/password      { old_password, new_password }
 *     - Validates the old password, then sets the new one.
 *     - On success: shows "密码修改成功" toast and resets the form.
 *     - On failure: silently swallowed (catch {}), loading flag reset.
 * ============================================================================
 */

import {
    _ as b,
    b as x,
    g as y,
    d as o,
    w as a,
    ac as E,
    z as h,
    C,
    O as k,
    p as I,
    m,
    f as w,
    k as B,
    u as F,
    an as N,
    I as q,
    s as f,
    N as U
} from "./index.BDBJuSBx.js";
import {
    s as R
} from "./request.CmoIc_Cu.js"; /* empty css                */ /* empty css                     */ /* empty css                  */ /* empty css                 */

// ---- Render-time static attribute objects (class names used by template) ----
const z = {
        // root wrapper div class
        class: "password-page"
    },
    M = {
        // card header slot wrapper class
        class: "card-header"
    },
    // ---- Vue SFC options object (the actual component definition) ----
    // __name: "index"  -> original single-file component was views/password/index.vue
    O = {
        __name: "index",
        setup(T) {
            // Form element ref (used to call validate() / resetFields()).
            const n = f(null),
                // Submit-in-flight flag (drives button loading spinner).
                p = f(!1),
                // Reactive form model. Three fields bound to ElInputs.
                s = q({
                    old_password: "",      // current password, sent to server
                    new_password: "",      // desired new password
                    confirm_password: ""   // client-side only; not sent
                }),
                // Validation rules (Element Plus form rules).
                c = {
                    old_password: [{
                        required: !0,
                        message: "请输入当前密码",   // "Please enter current password"
                        trigger: "blur"
                    }],
                    new_password: [{
                        required: !0,
                        message: "请输入新密码",   // "Please enter new password"
                        trigger: "blur"
                    }, {
                        min: 6,
                        message: "密码至少6位",   // "Password must be ≥ 6 chars"
                        trigger: "blur"
                    }],
                    confirm_password: [{
                        required: !0,
                        message: "请确认密码",   // "Please confirm password"
                        trigger: "blur"
                    }, {
                        // Custom validator: confirm must equal new_password.
                        validator: (r, e, t) => {
                            e !== s.new_password ? t(new Error("两次输入密码不一致")) : t()
                            // ^ "The two entered passwords do not match"
                        },
                        trigger: "blur"
                    }]
                };

            /**
             * Submit handler — runs client validation, then POSTs to server.
             * Flow:
             *   1. await form.validate() (silent catch -> returns false on fail).
             *   2. If valid, set loading=true and POST old/new password.
             *   3. On success: success toast + reset form fields.
             *   4. Always resets loading=false (finally-style).
             */
            async function g() {
                if (await n.value.validate().catch(() => !1)) {
                    p.value = !0;
                    try {
                        await R({
                            url: "/manage/auth/password",
                            method: "post",
                            data: {
                                old_password: s.old_password,
                                new_password: s.new_password
                            }
                        }), U.success("密码修改成功"), _()
                        // ^ success toast "Password changed successfully" + reset
                    } catch {}
                    p.value = !1
                }
            }

            /**
             * Reset form: clears model fields and calls Element Plus' resetFields()
             * to remove validation states. The ?. guard handles the case where
             * the form ref hasn't been mounted yet.
             */
            function _() {
                var r;
                s.old_password = "", s.new_password = "", s.confirm_password = "", (r = n.value) == null || r.resetFields()
            }

            // ---- Render function (compiled template output) ----
            // Returns a vnode tree: <div class="password-page"> <ElCard> ... </ElCard> </div>
            return (r, e) => {
                // Local aliases for Element Plus components resolved at render.
                // These come from the index.BDBJuSBx.js bundle via dynamic resolution.
                const t = B,    // ElIcon (used inside header for the lock icon)
                    u = k,      // ElInput
                    d = C,      // ElFormItem
                    i = I,      // ElButton
                    v = h,      // ElForm
                    V = E;      // ElCard
                return x(), y("div", z, [o(V, {
                    shadow: "never",
                    style: {
                        "max-width": "500px"
                    }
                }, {
                    // ---- Card header slot: lock icon + title text ----
                    header: a(() => [w("div", M, [o(t, null, {
                        default: a(() => [o(F(N))]), // <ElIcon><component :is="N"/></ElIcon>
                        _: 1
                    }), e[3] || (e[3] = w("span", null, "修改密码", -1))])]),
                    // ---- Card default slot: the password form ----
                    default: a(() => [o(v, {
                        ref_key: "formRef",
                        ref: n,                  // bind form element ref
                        model: s,                // form model
                        rules: c,                // validation rules
                        "label-width": "100px"
                    }, {
                        default: a(() => [
                            // ----- Field: 当前密码 (current password) -----
                            o(d, {
                                label: "当前密码",
                                prop: "old_password"
                            }, {
                                default: a(() => [o(u, {
                                    modelValue: s.old_password,
                                    "onUpdate:modelValue": e[0] || (e[0] = l => s.old_password = l),
                                    type: "password",
                                    "show-password": "",
                                    placeholder: "请输入当前密码"
                                }, null, 8, ["modelValue"])]),
                                _: 1
                            }),
                            // ----- Field: 新密码 (new password) -----
                            o(d, {
                                label: "新密码",
                                prop: "new_password"
                            }, {
                                default: a(() => [o(u, {
                                    modelValue: s.new_password,
                                    "onUpdate:modelValue": e[1] || (e[1] = l => s.new_password = l),
                                    type: "password",
                                    "show-password": "",
                                    placeholder: "请输入新密码(至少6位)"
                                }, null, 8, ["modelValue"])]),
                                _: 1
                            }),
                            // ----- Field: 确认密码 (confirm password) -----
                            o(d, {
                                label: "确认密码",
                                prop: "confirm_password"
                            }, {
                                default: a(() => [o(u, {
                                    modelValue: s.confirm_password,
                                    "onUpdate:modelValue": e[2] || (e[2] = l => s.confirm_password = l),
                                    type: "password",
                                    "show-password": "",
                                    placeholder: "请再次输入新密码"
                                }, null, 8, ["modelValue"])]),
                                _: 1
                            }),
                            // ----- Action row: submit + reset buttons -----
                            o(d, null, {
                                default: a(() => [o(i, {
                                    type: "primary",
                                    onClick: g,            // submit handler
                                    loading: p.value       // spinner while in flight
                                }, {
                                    default: a(() => [...e[4] || (e[4] = [m("确认修改", -1)])]),
                                    // ^ static text node "Confirm Change", cached at idx 4
                                    _: 1
                                }, 8, ["loading"]), o(i, {
                                    onClick: _             // reset handler
                                }, {
                                    default: a(() => [...e[5] || (e[5] = [m("重置", -1)])]),
                                    // ^ static text node "Reset", cached at idx 5
                                    _: 1
                                })]),
                                _: 1
                            })]),
                        _: 1
                    }, 8, ["model"])]),
                    _: 1
                })])
            }
        }
    },
    // ---- SFC factory wrap: adds scoped CSS id (data-v-235a11ef) ----
    // The B(...) helper normalizes options + injects the scope id used by
    // the corresponding <style scoped> block in the original .vue file.
    L = b(O, [
        ["__scopeId", "data-v-235a11ef"]
    ]);
export {
    L as
    default
};
