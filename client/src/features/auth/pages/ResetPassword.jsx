import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { resetPassword } from "@/features/auth/services/auth.api.js";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get("token") || "");

  // Strip the token from the URL once captured so it is not left in history.
  useEffect(() => {
    if (searchParams.get("token")) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dots opacity-40" />
      <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-brand-600/25 blur-[120px]" />
      <div className="absolute -bottom-40 -right-40 h-[480px] w-[480px] rounded-full bg-brand-400/15 blur-[120px]" />
      <div className="absolute top-1/3 right-1/4 h-64 w-64 rotate-12 rounded-3xl bg-brand-500/10 blur-2xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-2.5">
            <div className="grid grid-cols-2 gap-1 p-1.5 rounded-xl bg-white/10 ring-1 ring-white/15">
              <div className="h-5 w-5 rounded-md bg-brand-500" />
              <div className="h-5 w-5 rounded-md bg-brand-300/70" />
              <div className="h-5 w-5 rounded-md bg-brand-300/70" />
              <div className="h-5 w-5 rounded-md bg-white/20" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Tile<span className="text-brand-400">Visualizer</span>
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Digital tile catalogue &amp; visualizer dashboard
          </p>
        </div>

        <div className="rounded-2xl bg-white p-7 shadow-2xl shadow-black/40 ring-1 ring-white/10">
          {done ? (
            <div className="animate-fade-in">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <h1 className="mt-4 text-xl font-bold text-slate-900">Password updated</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Your password has been reset. You can now sign in with your
                  new password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.99]"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <ShieldCheck size={12} /> Reset Password
                </div>
                <h1 className="mt-3 text-xl font-bold text-slate-900">Choose a new password</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Use at least 8 characters. The reset link is single-use and
                  expires after 60 minutes.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    New password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      className="input-field pl-10 pr-10"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPw ? "text" : "password"}
                      className="input-field pl-10"
                      placeholder="Re-enter new password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {error && (
                  <div className="animate-fade-in rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.99] disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Updating…
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Update Password
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Internal tool · Access limited to authorized administrators
        </p>
      </div>
    </div>
  );
}
