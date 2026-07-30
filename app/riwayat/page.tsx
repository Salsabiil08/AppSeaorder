"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { dbService, OrderDetail } from "@/lib/dbService";

export default function RiwayatPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const searchOrders = async (event: FormEvent) => {
    event.preventDefault();
    if (!phoneNumber.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      setOrders(await dbService.getOrdersByWhatsApp(phoneNumber.trim()));
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === "Sedang Dimasak") return "bg-blue-100 text-blue-700";
    if (status === "Makanan Sudah Siap") return "bg-emerald-100 text-emerald-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-lg">
        <Link href="/" className="text-sm font-bold text-blue-600 hover:text-blue-800">← Kembali</Link>
        <section className="mt-5 rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/60">
          <h1 className="text-2xl font-black text-slate-900">Cek Riwayat Pesanan</h1>
          <p className="mt-2 text-sm text-slate-500">Masukkan nomor WhatsApp yang digunakan saat memesan.</p>

          <form onSubmit={searchOrders} className="mt-5 flex gap-2">
            <input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="Contoh: 08123456789"
              inputMode="tel"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
            <button disabled={loading} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {loading ? "Mencari..." : "Cari"}
            </button>
          </form>
        </section>

        {searched && !loading && (
          <section className="mt-5 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
                Belum ada pesanan dengan nomor WhatsApp tersebut.
              </div>
            ) : orders.map((order) => (
              <Link key={order.id_pemesanan} href={`/tracking/${order.id_pemesanan}`} className="block rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-slate-500">#{order.id_pemesanan}</p>
                    <p className="mt-1 font-bold text-slate-900">{order.opsi_layanan}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString("id-ID")}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(order.status_order)}`}>{order.status_order}</span>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700">Total pesanan: Rp {order.total_bayar.toLocaleString("id-ID")}</p>
                <p className="mt-2 text-xs font-bold text-blue-600">Lihat detail & status →</p>
              </Link>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
