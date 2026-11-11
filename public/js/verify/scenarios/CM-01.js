// @ts-check
/**
 * Scenario for CM-01 Login (+ CM-P01 OTP / PIN, CM-P02 Forgot password): validation, wrong password, second step,
 * session and audit afterwards. (Password reset and account locking are covered by the unit tests on an isolated database.)
 */
import { currentUser } from "../../core/auth.js";

/** @param {import("../harness.js").Ctx} ctx */
export default async function scenario(ctx) {
  const $ = (/** @type {string} */ s) => /** @type {HTMLElement | null} */ (ctx.doc.querySelector(s));
  const visible = (/** @type {HTMLElement | null} */ el) => !!el && !el.hidden;

  ctx.check("nobody is signed in when the page opens", currentUser() === null);
  ctx.check("sign-in form has labelled email and password fields", !!$("label[for=email]") && !!$("label[for=password]"));

  // 1 – empty submit shows plain-English messages and does not sign in
  ctx.click("#submit");
  await ctx.waitFor(() => visible($("#email-err")));
  ctx.check("empty form: asks for the email", $("#email-err")?.textContent === "Enter your email.", $("#email-err")?.textContent ?? "");
  ctx.fill("#email", "anita.mohan@avivkochi.example");
  ctx.click("#submit");
  await ctx.waitFor(() => visible($("#password-err")));
  ctx.check("email filled, no password: asks for the password", $("#password-err")?.textContent === "Enter your password.");

  // 2 – wrong password
  ctx.fill("#password", "wrong-password");
  ctx.click("#submit");
  await ctx.waitFor(() => visible($("#login-error")), 4000);
  ctx.check("wrong password: friendly error, still signed out", /not right/.test($("#login-error")?.textContent ?? "") && currentUser() === null, $("#login-error")?.textContent ?? "");
  ctx.check("the error is announced (role=alert)", $("#login-error")?.getAttribute("role") === "alert");

  // 3 – correct password → CM-P01
  ctx.fill("#password", "Aviv@2026");
  ctx.click("#submit");
  const dlg = /** @type {HTMLDialogElement | null} */ (ctx.doc.querySelector('dialog[data-code="CM-P01"]'));
  const opened = await ctx.waitFor(() => !!dlg?.open, 4000);
  ctx.check("popup CM-P01 “OTP / PIN Verification” opens after the password", opened);
  ctx.check("the second step says where the code was sent", /6-digit code to \+91/.test($("#otp-desc")?.textContent ?? ""), $("#otp-desc")?.textContent ?? "");
  ctx.check("still signed out until the code is right", currentUser() === null);

  // 4 – wrong then right code
  ctx.fill("#otp-code", "000000");
  ctx.click("#otp-submit");
  await ctx.waitFor(() => visible($("#otp-err")), 4000);
  ctx.check("wrong code: inline error with tries left", /2 more tries/.test($("#otp-err")?.textContent ?? ""), $("#otp-err")?.textContent ?? "");
  ctx.fill("#otp-code", "123456");
  ctx.click("#otp-submit");
  const signedIn = await ctx.waitFor(() => currentUser() !== null, 4000);
  ctx.check("right code signs in: session holds name, role and permissions", signedIn && currentUser()?.name === "Anita Mohan" && currentUser()?.role === "Reservation Manager" && (currentUser()?.permissions?.length ?? 0) > 0, JSON.stringify(currentUser()));
  ctx.check("the session does not contain a password", !JSON.stringify(currentUser()).toLowerCase().includes("aviv@2026"));

  // 5 – data flow: audit entry and last login
  await ctx.wait(300);
  const audit = await ctx.services.audit.listAudit({ entity: "users", entityId: "u-anita", action: "login", limit: 1 });
  ctx.check("sign-in is written to the audit log", audit.items[0]?.note === "Signed in" && audit.items[0]?.userId === "u-anita", JSON.stringify(audit.items[0]));
}
