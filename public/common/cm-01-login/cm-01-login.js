// @ts-check
/**
 * CM-01 – Login. Email + password, then a one-time code or PIN (CM-P01) unless this device is remembered.
 * Forgot password (CM-P02) resets with a one-time code. After sign-in the person goes to the page they asked for, or to their home page.
 */
import { $ } from "/js/core/dom.js";
import { applyPrefs } from "/js/core/prefs.js";
import { currentUser, clearSession } from "/js/core/auth.js";
import { screenUrl } from "/js/core/screens.js";
import { passwordProblems } from "/js/domain/password.js";
import { initDeclarativeDialogs } from "/js/components/dialog.js";
import { auth } from "/js/services/index.js";
import { h } from "/js/core/dom.js";

applyPrefs();
initDeclarativeDialogs();

/* ── helpers ── */
const form = /** @type {HTMLFormElement} */ ($("#login-form"));
const emailEl = /** @type {HTMLInputElement} */ ($("#email"));
const passEl = /** @type {HTMLInputElement} */ ($("#password"));
const errorBox = $("#login-error");
const submitBtn = /** @type {HTMLButtonElement} */ ($("#submit"));

/** @param {HTMLElement} input @param {string} id @param {string} message */
function fieldError(input, id, message) {
  const el = $(`#${id}`);
  el.textContent = message;
  el.hidden = !message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

/** @param {HTMLButtonElement} btn @param {boolean} on */
function busy(btn, on) {
  btn.disabled = on;
  btn.setAttribute("aria-busy", String(on));
  btn.classList.toggle("is-loading", on);
  btn.querySelector(".spinner")?.remove();
  if (on) btn.prepend(h("span", { class: "spinner", attrs: { "aria-hidden": "true" } }));
}

/** Only same-site paths are allowed as the "next" page (no open redirects). @param {string | null} next */
function safeNext(next) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/common/cm-01-login/") ? next : null;
}
const next = safeNext(new URLSearchParams(location.search).get("next"));

/** @param {string | undefined} roleId */
const home = (roleId) => next ?? screenUrl("CM-06"); // the welcome page; the start page is a hotel-setup option (RSS-02)

function showError(/** @type {string} */ message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  errorBox.classList.remove("is-shaking");
  void errorBox.offsetWidth; // restart the animation
  errorBox.classList.add("is-shaking");
}

/* ── already signed in ── */
const existing = currentUser();
if (existing) {
  $("#signed-in").hidden = false;
  $("#signed-in-name").textContent = `${existing.name} (${existing.role})`;
  /** @type {HTMLAnchorElement} */ ($("#continue")).href = home(existing.roleId);
  $("#switch-user").addEventListener("click", async () => {
    await auth.signOut();
    $("#signed-in").hidden = true;
    emailEl.focus();
  });
}

/* ── caps lock warning and show / hide password ── */
for (const ev of ["keydown", "keyup"]) passEl.addEventListener(ev, (e) => { $("#caps-warning").hidden = !(/** @type {KeyboardEvent} */ (e).getModifierState?.("CapsLock")); });
passEl.addEventListener("blur", () => { $("#caps-warning").hidden = true; });
$("#toggle-password").addEventListener("click", (ev) => {
  const btn = /** @type {HTMLElement} */ (ev.currentTarget);
  const show = passEl.type === "password";
  passEl.type = show ? "text" : "password";
  btn.setAttribute("aria-pressed", String(show));
  btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

/* ── step 1: email + password ── */
/** @type {{ userId: string, method: "otp" | "pin", sentTo: string } | null} */
let pending = null;

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  errorBox.hidden = true;
  fieldError(emailEl, "email-err", "");
  fieldError(passEl, "password-err", "");
  if (!emailEl.value.trim()) { fieldError(emailEl, "email-err", "Enter your email."); emailEl.focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailEl.value.trim())) { fieldError(emailEl, "email-err", "Enter a full email address, for example name@avivkochi.example."); emailEl.focus(); return; }
  if (!passEl.value) { fieldError(passEl, "password-err", "Enter your password."); passEl.focus(); return; }
  busy(submitBtn, true);
  try {
    const r = await auth.login({ email: emailEl.value, password: passEl.value });
    if (r.status === "signed-in") return finish(r.userId);
    pending = { userId: r.userId, method: r.method, sentTo: r.sentTo };
    openSecondStep();
  } catch (err) {
    const e = /** @type {any} */ (err);
    showError(e.message ?? "We could not sign you in. Please try again.");
    if (e.code === "INVALID_CREDENTIALS") { passEl.value = ""; passEl.focus(); }
  } finally {
    busy(submitBtn, false);
  }
});

/** @param {string} userId */
function finish(userId) {
  void userId;
  const s = currentUser();
  location.replace(home(s?.roleId));
}

/* ── step 2: CM-P01 one-time code / PIN ── */
const otpDlg = /** @type {HTMLDialogElement} */ ($("dialog[data-code='CM-P01']"));
const otpForm = /** @type {HTMLFormElement} */ ($("#otp-form"));
const otpInput = /** @type {HTMLInputElement} */ ($("#otp-code"));
let resendTimer = 0;

function openSecondStep() {
  if (!pending) return;
  const pin = pending.method === "pin";
  $("#otp-title").textContent = pin ? "Enter your PIN" : "Enter your code";
  $("#otp-desc").textContent = pin ? "Type your 4-digit PIN." : `We sent a 6-digit code to ${pending.sentTo}.`;
  $("#otp-label").textContent = pin ? "PIN" : "One-time code";
  otpInput.maxLength = pin ? 4 : 6;
  otpInput.placeholder = pin ? "••••" : "••••••";
  otpInput.type = pin ? "password" : "text";
  otpInput.value = "";
  fieldError(otpInput, "otp-err", "");
  /** @type {HTMLElement} */ ($("#otp-resend")).hidden = pin;
  otpDlg.showModal();
  otpInput.focus();
}

otpInput.addEventListener("input", () => { otpInput.value = otpInput.value.replace(/\D/g, ""); });
otpForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (!pending) return;
  const btn = /** @type {HTMLButtonElement} */ ($("#otp-submit"));
  fieldError(otpInput, "otp-err", "");
  busy(btn, true);
  try {
    const r = await auth.verifySecondStep({ userId: pending.userId, code: otpInput.value, rememberDevice: /** @type {HTMLInputElement} */ ($("#otp-remember")).checked });
    finish(r.userId);
  } catch (err) {
    const e = /** @type {any} */ (err);
    if (e.code === "RESTART") {
      otpDlg.close();
      pending = null;
      passEl.value = "";
      showError(e.message);
      passEl.focus();
    } else {
      fieldError(otpInput, "otp-err", e.message ?? "That code is not right.");
      otpInput.select();
    }
  } finally {
    busy(btn, false);
  }
});

$("#otp-resend").addEventListener("click", async (ev) => {
  if (!pending) return;
  const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
  const r = await auth.resendCode({ userId: pending.userId });
  btn.disabled = true;
  let left = 30;
  const note = $("#otp-resend-note");
  note.textContent = `A new code was sent to ${r.sentTo}. You can ask again in ${left} s.`;
  clearInterval(resendTimer);
  resendTimer = window.setInterval(() => {
    left--;
    note.textContent = left > 0 ? `A new code was sent to ${r.sentTo}. You can ask again in ${left} s.` : "";
    if (left <= 0) { clearInterval(resendTimer); btn.disabled = false; }
  }, 1000);
});

/* ── CM-P02 forgot password ── */
const fpDlg = /** @type {HTMLDialogElement} */ ($("dialog[data-code='CM-P02']"));
const fpForm = /** @type {HTMLFormElement} */ ($("#fp-form"));
const fpEmail = /** @type {HTMLInputElement} */ ($("#fp-email"));
const fpCode = /** @type {HTMLInputElement} */ ($("#fp-code"));
const fpNew = /** @type {HTMLInputElement} */ ($("#fp-new"));
let fpStep = 1;

const resetForgot = () => {
  fpStep = 1;
  $("#fp-step2").hidden = true;
  $("#fp-info").hidden = true;
  fpEmail.readOnly = false;
  fpEmail.value = emailEl.value;
  fpCode.value = "";
  fpNew.value = "";
  $("#fp-submit .btn__label").textContent = "Send code";
  $("#fp-desc").textContent = "Enter your email and we will send a 6-digit code to your phone.";
  for (const id of ["fp-email-err", "fp-code-err", "fp-new-err"]) { $(`#${id}`).hidden = true; }
};
fpDlg.addEventListener("close", resetForgot);
document.addEventListener("click", (ev) => { if (/** @type {HTMLElement} */ (ev.target).closest?.('[data-opens="CM-P02"]')) setTimeout(() => { resetForgot(); fpEmail.focus(); }, 0); });

const rules = $("#fp-new-hint");
const RULES = ["Use at least 10 characters.", "Add a lowercase letter.", "Add a capital letter.", "Add a number.", "Add a symbol such as @ or #."];
function paintRules() {
  const bad = new Set(passwordProblems(fpNew.value, { email: fpEmail.value }));
  rules.textContent = "";
  for (const r of RULES) rules.append(h("li", { class: bad.has(r) ? "" : "is-ok" }, r.replace("Use at least", "At least").replace("Add a", "A").replace(/\.$/, "")));
}
fpNew.addEventListener("input", paintRules);
paintRules();

fpForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const btn = /** @type {HTMLButtonElement} */ ($("#fp-submit"));
  for (const [el, id] of /** @type {Array<[HTMLElement, string]>} */ ([[fpEmail, "fp-email-err"], [fpCode, "fp-code-err"], [fpNew, "fp-new-err"]])) fieldError(el, id, "");
  busy(btn, true);
  try {
    if (fpStep === 1) {
      const r = await auth.requestPasswordReset({ email: fpEmail.value });
      const info = $("#fp-info");
      info.textContent = r.message;
      info.hidden = false;
      $("#fp-step2").hidden = false;
      fpEmail.readOnly = true;
      fpStep = 2;
      $("#fp-submit .btn__label").textContent = "Set new password";
      $("#fp-desc").textContent = "Enter the code and choose a new password.";
      fpCode.focus();
    } else {
      await auth.resetPassword({ email: fpEmail.value, code: fpCode.value, newPassword: fpNew.value });
      fpDlg.close();
      emailEl.value = fpEmail.value;
      passEl.value = "";
      const info = $("#login-error");
      info.hidden = true;
      showInfo("Your password was changed. Sign in with the new password.");
      passEl.focus();
    }
  } catch (err) {
    const e = /** @type {any} */ (err);
    if (e.fields?.email) fieldError(fpEmail, "fp-email-err", e.fields.email);
    else if (e.fields?.code) fieldError(fpCode, "fp-code-err", e.message);
    else if (e.fields?.newPassword) fieldError(fpNew, "fp-new-err", e.fields.newPassword);
    else fieldError(fpEmail, "fp-email-err", e.message ?? "Something went wrong. Please try again.");
  } finally {
    busy(btn, false);
  }
});

/** @param {string} text */
function showInfo(text) {
  let box = document.getElementById("login-info");
  if (!box) {
    box = h("p", { class: "login__info", id: "login-info", attrs: { role: "status" } });
    form.before(box);
  }
  box.textContent = text;
}

/* ── demo accounts helper ── */
void auth.listDemoAccounts().then((list) => {
  const ul = $("#demo-list");
  for (const a of list) {
    ul.append(h("li", {}, h("button", {
      type: "button", onclick: () => {
        emailEl.value = a.email;
        passEl.value = auth.demoCredentials().password;
        errorBox.hidden = true;
        passEl.focus();
      },
    }, h("span", {}, `${a.name} · ${a.role}`), h("span", {}, a.method === "pin" ? "PIN" : "OTP"))));
  }
});

void clearSession; // sign-out helpers live in the auth service
document.body.dataset.ready = "1";
