"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dbService, OrderDetail } from "@/lib/dbService";
import { getStaffSession } from "@/lib/staffAuth";

export default function KitchenKDS() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [todayHistory, setTodayHistory] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Time tracking for ticket elapsed duration
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const session = getStaffSession();
    if (session?.role !== "kitchen") {
      router.replace("/login");
      return;
    }

    fetchActiveOrders();
    fetchTodayHistory();

    const timeInterval = setInterval(() => {
      setNowTime(Date.now());
    }, 10000); // Update elapsed time calculations every 10 seconds

    // Listener for new incoming orders
    const unsubscribeNew = dbService.listenToNewOrders((newOrder) => {
      console.log("Kitchen: New cooking ticket received!", newOrder);
      playChime();
      fetchActiveOrders();
      fetchTodayHistory();
    });

    // Listener for updates on active orders
    const unsubscribeUpdates = dbService.listenToOrderUpdates("*", () => {
      fetchActiveOrders();
      fetchTodayHistory();
    });

    return () => {
      clearInterval(timeInterval);
      unsubscribeNew();
      unsubscribeUpdates();
    };
  }, [router]);

  const fetchActiveOrders = async () => {
    try {
      const active = await dbService.getActiveOrders();
      // Makanan yang sudah siap tetap tersimpan di riwayat, bukan antrean dapur.
      const cookingQueue = active.filter(
        (o) => o.status_order === "Menunggu" || o.status_order === "Sedang Dimasak"
      );
      setOrders(cookingQueue);
    } catch (e) {
      console.error("Error fetching kitchen queue", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayHistory = async () => {
    const history = await dbService.getOrderHistory();
    const today = new Date().toDateString();
    setTodayHistory(history.filter((order) => new Date(order.created_at).toDateString() === today));
  };

  const playChime = () => {
    if (!audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.24); // G5

      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Kitchen chime blocked", e);
    }
  };

  const handleMulaiMasak = async (id: string) => {
    await dbService.updateOrderStatus(id, "Sedang Dimasak");
    playActionSound(440); // Standard A4 beep
    fetchActiveOrders();
    fetchTodayHistory();
  };

  const handleSiapSaji = async (id: string) => {
    await dbService.updateOrderStatus(id, "Makanan Sudah Siap");
    playActionSound(880); // High confirmation beep
    fetchActiveOrders();
    fetchTodayHistory();
  };

  const playActionSound = (frequency: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.15);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) { }
  };

  const calculateMinutesElapsed = (createdAtStr: string) => {
    const created = new Date(createdAtStr).getTime();
    const diffMs = nowTime - created;
    const minutes = Math.floor(diffMs / 60000);
    return minutes;
  };

  const getElapsedTimeColor = (minutes: number) => {
    if (minutes >= 15) return "bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse";
    if (minutes >= 8) return "bg-amber-500/20 text-amber-300 border-amber-500/50";
    return "bg-slate-900/60 text-slate-400 border-white/5";
  };

  const getOpsiBadgeColor = (opsi: string) => {
    switch (opsi) {
      case "acara": return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "dinein": return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "takeaway": return "bg-teal-500/20 text-teal-300 border-teal-500/30";
      case "antar": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default: return "bg-slate-500/20 text-slate-300";
    }
  };

  const getOpsiLabel = (opsi: string) => {
    switch (opsi) {
      case "acara": return "Acara";
      case "dinein": return "Dine-in";
      case "takeaway": return "Take-Away";
      case "antar": return "Delivery";
      default: return opsi;
    }
  };

  const incomingOrders = orders.filter((o) => o.status_order === "Menunggu");
  const cookingOrders = orders.filter((o) => o.status_order === "Sedang Dimasak");

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400 font-sans font-bold">
        Memuat Kitchen Display System (KDS)...
      </div>
    );
  }

  return (
    <div className="oceanic-shell min-h-screen bg-slate-950 text-slate-100 font-sans p-6 space-y-6">

      {/* Sound System Activator */}
      {!audioEnabled && (
        <div className="bg-gradient-to-r from-rose-600 to-red-500 text-slate-950 px-4 py-3 font-extrabold text-xs text-center flex items-center justify-center gap-3 shadow-lg rounded-2xl">
          Aktifkan notifikasi suara untuk pesanan baru di dapur.
          <button
            onClick={() => {
              setAudioEnabled(true);
              playActionSound(659.25);
            }}
            className="bg-slate-950 text-rose-400 hover:bg-slate-900 transition-colors px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider font-bold"
          >
            Aktifkan Chime Dapur
          </button>
        </div>
      )}

      {/* KDS Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#002b5b]">KDS</span>
            <h1 className="text-2xl font-black bg-clip-text bg-gradient-to-r from-rose-400 via-orange-300 to-amber-200">
              Kitchen Display System (KDS)
            </h1>
          </div>
          <p className="text-xs text-slate-450 mt-1">Dapur Warung Seafood & Lalapan Lamongan Jaya Asli</p>
        </div>

        <div className="text-right text-xs bg-slate-950/60 border border-white/5 px-4 py-2 rounded-xl">
          <p className="text-slate-450">Antrean Dapur Aktif</p>
          <p className="text-sm font-black text-rose-400 mt-0.5">{orders.length} Tiket Hidangan</p>
        </div>
      </header>

      <section className="bg-slate-900/60 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-extrabold text-sm text-cyan-300">Riwayat Pesanan Hari Ini</h2>
            <p className="text-[10px] text-slate-450 mt-1">{todayHistory.length} pesanan tercatat hari ini.</p>
          </div>
          <span className="text-xs font-black text-emerald-300">{todayHistory.filter((o) => o.status_order === "Makanan Sudah Siap").length} makanan sudah siap</span>
        </div>
        <div className="max-h-36 overflow-y-auto space-y-2">
          {todayHistory.length === 0 ? <p className="text-xs text-slate-500">Belum ada pesanan hari ini.</p> : todayHistory.map((order) => (
            <div key={order.id_pemesanan} className="flex justify-between gap-3 text-xs bg-slate-950/40 rounded-lg px-3 py-2">
              <span className="font-mono text-slate-300">#{order.id_pemesanan} · {order.user_nama}</span>
              <span className="text-cyan-300 font-bold">{order.status_order}</span>
            </div>
          ))}
        </div>
      </section>

      {/* KDS Display Split Columns */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* COLUMN 1: INCOMING TICKETS (Menunggu) */}
        <section className="space-y-4">
          <div className="bg-slate-900/60 border border-white/10 p-4.5 rounded-2xl flex justify-between items-center backdrop-blur-md">
            <h2 className="font-extrabold text-slate-100 flex items-center gap-2.5">
              <span className="h-3 w-3 bg-amber-500 rounded-full animate-ping"></span>
              ANTREAN MASUK
            </h2>
            <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">
              {incomingOrders.length} Tiket
            </span>
          </div>

          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 scrollbar-thin">
            {incomingOrders.length === 0 ? (
              <div className="bg-slate-900/10 border border-white/5 border-dashed p-16 text-center rounded-2xl">
                <span className="text-sm font-bold text-slate-500">Tidak ada antrean</span>
                <p className="text-xs text-slate-500 mt-3">Tidak ada antrean masakan baru.</p>
              </div>
            ) : (
              incomingOrders.map((order) => {
                const elapsed = calculateMinutesElapsed(order.created_at);
                return (
                  <div
                    key={order.id_pemesanan}
                    className="bg-slate-900 border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg hover:border-amber-500/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-white/5">
                            #{order.id_pemesanan}
                          </span>
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded ${getOpsiBadgeColor(order.opsi_layanan)}`}>
                            {getOpsiLabel(order.opsi_layanan)}
                          </span>
                          {order.opsi_layanan === "dinein" && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-black uppercase">
                              Meja {order.extension?.id_meja}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-100 mt-1">
                          Nama: {order.user_nama}
                        </h4>
                      </div>

                      {/* Timer */}
                      <span className={`text-[10px] font-bold px-2.5 py-1.5 border rounded-lg ${getElapsedTimeColor(elapsed)}`}>
                        ⏱️ {elapsed} m
                      </span>
                    </div>

                    {/* Order items detail */}
                    <div className="bg-slate-950/60 rounded-xl p-3.5 border border-white/5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Item Dipesan:</p>
                      <ul className="divide-y divide-white/5 text-xs font-bold space-y-2">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="pt-2 first:pt-0 flex flex-col gap-0.5">
                            <div className="flex justify-between text-slate-100">
                              <span>• {item.nama_menu}</span>
                              <span className="text-rose-400 font-extrabold text-sm">x{item.quantity}</span>
                            </div>
                            {item.catatan && (
                              <p className="text-[10px] text-amber-300 italic font-semibold ml-3 bg-amber-500/5 p-1.5 rounded border border-amber-500/10">
                                Catatan: "{item.catatan}"
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => handleMulaiMasak(order.id_pemesanan)}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      MULAI MASAK
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* COLUMN 2: COOKING TICKETS (Sedang Dimasak) */}
        <section className="space-y-4">
          <div className="bg-slate-900/60 border border-white/10 p-4.5 rounded-2xl flex justify-between items-center backdrop-blur-md">
            <h2 className="font-extrabold text-slate-100 flex items-center gap-2.5">
              <span className="h-3 w-3 bg-blue-500 rounded-full animate-pulse"></span>
              SEDANG DIMASAK
            </h2>
            <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
              {cookingOrders.length} Tiket
            </span>
          </div>

          <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1 scrollbar-thin">
            {cookingOrders.length === 0 ? (
              <div className="bg-slate-900/10 border border-white/5 border-dashed p-16 text-center rounded-2xl">
                <span className="text-sm font-bold text-slate-500">Belum ada pesanan diproses</span>
                <p className="text-xs text-slate-500 mt-3">Tidak ada hidangan yang sedang dimasak saat ini.</p>
              </div>
            ) : (
              cookingOrders.map((order) => {
                const elapsed = calculateMinutesElapsed(order.created_at);
                return (
                  <div
                    key={order.id_pemesanan}
                    className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-lg hover:border-blue-400/40 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="text-xs font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-white/5">
                            #{order.id_pemesanan}
                          </span>
                          <span className={`text-[10px] font-bold border px-2 py-0.5 rounded ${getOpsiBadgeColor(order.opsi_layanan)}`}>
                            {getOpsiLabel(order.opsi_layanan)}
                          </span>
                          {order.opsi_layanan === "dinein" && (
                            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded font-black uppercase">
                              Meja {order.extension?.id_meja}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-100 mt-1">
                          Nama: {order.user_nama}
                        </h4>
                      </div>

                      {/* Timer */}
                      <span className={`text-[10px] font-bold px-2.5 py-1.5 border rounded-lg ${getElapsedTimeColor(elapsed)}`}>
                        ⏱️ {elapsed} m
                      </span>
                    </div>

                    {/* Order items detail */}
                    <div className="bg-slate-950/60 rounded-xl p-3.5 border border-white/5 space-y-2">
                      <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Item Dipesan:</p>
                      <ul className="divide-y divide-white/5 text-xs font-bold space-y-2">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="pt-2 first:pt-0 flex flex-col gap-0.5">
                            <div className="flex justify-between text-slate-100">
                              <span>• {item.nama_menu}</span>
                              <span className="text-rose-400 font-extrabold text-sm">x{item.quantity}</span>
                            </div>
                            {item.catatan && (
                              <p className="text-[10px] text-amber-300 italic font-semibold ml-3 bg-amber-500/5 p-1.5 rounded border border-amber-500/10">
                                Catatan: "{item.catatan}"
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => handleSiapSaji(order.id_pemesanan)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl text-xs transition-all shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      MAKANAN SUDAH SIAP
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
