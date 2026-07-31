"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const services = [
  { id: "dinein", title: "Makan di Tempat", icon: "dinein", desc: "Pilih meja yang tersedia secara real-time." },
  { id: "acara", title: "Reservasi Meja", icon: "calendar", desc: "Hubungi kami minimal H-1 sebelum kedatangan." },
  { id: "takeaway", title: "Take-Away", icon: "bag", desc: "Pesan cepat, ambil saat hidangan siap." },
  { id: "antar", title: "Pesan Antar", icon: "delivery", desc: "Makanan hangat diantar ke alamat Anda." }
];

export default function HomePage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  useEffect(() => { setNama(sessionStorage.getItem("user_nama") || ""); setWa(sessionStorage.getItem("user_wa") || ""); }, []);
  const saveName = (value: string) => { setNama(value); sessionStorage.setItem("user_nama", value); };
  const saveWa = (value: string) => { setWa(value); sessionStorage.setItem("user_wa", value); };
  const selectService = (id: string) => {
    if (!nama.trim() || !wa.trim()) return;
    if (id === "acara") { window.open("https://wa.me/6281246178877?text=Halo%20SeaOrder%2C%20saya%20ingin%20reservasi%20meja.", "_blank", "noopener,noreferrer"); return; }
    sessionStorage.setItem("selected_opsi", id); router.push("/form-detail");
  };
  const isValid = Boolean(nama.trim() && wa.trim());
  return <div className="min-h-screen bg-[#f7f9fb] pb-20 font-sans text-[#001e3c]">
    <header className="bg-[#002b5b] px-5 py-5 text-white shadow-sm"><div className="mx-auto flex max-w-6xl items-center justify-between"><div className="flex items-center gap-3"><Logo /><div><h1 className="text-xl font-bold tracking-tight">SeaOrder</h1><p className="text-xs text-blue-100">Lamongan Jaya Asli</p></div></div><div className="flex items-center gap-3"><a href="https://wa.me/6281246178877" target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-lg bg-[#1db954] px-3 py-2 text-xs font-bold sm:flex"><WhatsAppIcon /> WhatsApp</a><button onClick={() => router.push("/login")} aria-label="Login stakeholder" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"><UserIcon /></button></div></div></header>
    <main className="mx-auto max-w-6xl px-5 py-10"><div className="mb-8 max-w-xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#1db954]">Pesan dengan mudah</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Pilih layanan Anda</h2><p className="mt-2 text-sm leading-6 text-slate-500">Seafood dan lalapan segar, disiapkan sesuai kebutuhan Anda.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map((item) => <div key={item.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#002b5b] hover:shadow-md"><ServiceIcon type={item.icon} /><h3 className="mt-5 font-bold">{item.title}</h3><p className="mt-2 flex-1 text-xs leading-5 text-slate-500">{item.desc}</p><button onClick={() => selectService(item.id)} disabled={!isValid} className={`mt-5 w-full rounded-lg py-2.5 text-sm font-bold transition ${isValid ? "bg-[#002b5b] text-white hover:bg-[#001e3c]" : "bg-slate-100 text-slate-400"}`}>{item.id === "acara" ? "Hubungi Kami" : "Pilih Layanan"}</button></div>)}</div>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-sm font-bold">Informasi Pemesan</h3><p className="mt-1 text-xs text-slate-500">Isi data berikut untuk melanjutkan pesanan.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><input placeholder="Nama lengkap" className="rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#002b5b]" value={nama} onChange={(e) => saveName(e.target.value)} /><input placeholder="Nomor WhatsApp" className="rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-[#002b5b]" value={wa} onChange={(e) => saveWa(e.target.value)} /></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500"><span>Alamat: Warung Seafood & Lalapan Lamongan Jaya Asli</span><a className="font-bold text-[#1db954]" href="https://wa.me/6281246178877">0812-4617-8877</a></div></section>
    </main><nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-5 py-3 shadow-[0_-2px_10px_rgba(0,30,60,.05)] sm:hidden"><div className="mx-auto flex max-w-sm justify-around text-xs font-bold"><span className="text-[#002b5b]">Layanan</span><button onClick={() => router.push("/riwayat")} className="text-slate-500">Riwayat</button><a href="https://wa.me/6281246178877" className="text-[#1db954]">WhatsApp</a></div></nav>
  </div>;
}
function Logo() { return <svg viewBox="0 0 32 32" className="h-9 w-9" fill="none"><path d="M5 19c4.4 0 4.4-4 8.8-4s4.4 4 8.8 4 4.4-4 4.4-4M5 25c4.4 0 4.4-4 8.8-4s4.4 4 8.8 4 4.4-4 4.4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round"/></svg>; }
function WhatsAppIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/></svg>; }
function UserIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.7-4 3.2-6 7.5-6s6.8 2 7.5 6"/></svg>; }
function ServiceIcon({ type }: { type: string }) { const paths: Record<string, string> = { dinein: "M4 4v7M8 4v7M4 8h4M6 11v9M15 4v16M15 4c3 0 5 2 5 5s-2 5-5 5", calendar: "M5 5h14v14H5zM8 3v4M16 3v4M5 9h14", bag: "M5 8h14l-1 12H6L5 8ZM9 9V6a3 3 0 0 1 6 0v3", delivery: "M3 6h11v10H3zM14 10h3l3 3v3h-6M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4" }; return <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-[#002b5b]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d={paths[type]} /></svg></div>; }
