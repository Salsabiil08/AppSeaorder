"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authenticateStaff, getStaffSession, STAFF_SESSION_KEY } from "@/lib/staffAuth";

export default function StaffLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStaffSession();
    if (session) router.replace(session.role === "admin" ? "/admin" : "/kitchen");
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const staff = authenticateStaff(username, password);

    if (!staff) {
      setError("Username atau password tidak sesuai.");
      return;
    }

    sessionStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(staff));
    router.replace(staff.role === "admin" ? "/admin" : "/kitchen");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 px-4 py-10 flex items-center justify-center text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-md sm:p-9">
        <div className="mb-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/15 text-3xl">🔐</span>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">SeaOrder</p>
          <h1 className="mt-2 text-2xl font-black">Login Stakeholder</h1>
          <p className="mt-2 text-sm text-slate-400">Satu pintu untuk Admin dan Kitchen.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-slate-200">Username</label>
            <input id="username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" placeholder="Masukkan username" required />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-200">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20" placeholder="Masukkan password" required />
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <button type="submit" className="w-full rounded-xl bg-cyan-400 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 active:scale-[0.98]">Masuk</button>
        </form>

        <div className="mt-6 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-slate-300">
          <p className="font-bold text-cyan-300">Akun demo</p>
          <p className="mt-1">Admin: <strong>admin</strong> / <strong>admin123</strong></p>
          <p>Kitchen: <strong>kitchen</strong> / <strong>kitchen123</strong></p>
        </div>

        <Link href="/" className="mt-6 block text-center text-xs font-semibold text-slate-400 underline underline-offset-4 hover:text-white">Kembali ke halaman pemesanan</Link>
      </section>
    </main>
  );
}
