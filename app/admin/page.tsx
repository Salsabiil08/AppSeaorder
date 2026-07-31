"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dbService, OrderDetail, Meja, Menu, checkOperationalStatus } from "@/lib/dbService";
import { getStaffSession } from "@/lib/staffAuth";

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [mejas, setMejas] = useState<Meja[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuPrice, setNewMenuPrice] = useState("");
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("Semua");
  const [serviceFilter, setServiceFilter] = useState("Semua");

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  // Audio system state
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<OrderDetail | null>(null);
  const knownOrderIds = useRef<Set<string>>(new Set());

  // Stats
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [operationalInfo, setOperationalInfo] = useState({ isOpen: true, currentHourWib: 0 });

  useEffect(() => {
    const session = getStaffSession();
    if (session?.role !== "admin") {
      router.replace("/login");
      return;
    }

    fetchInitialData();

    // Listen to operational status
    setOperationalInfo(checkOperationalStatus());
    const interval = setInterval(() => {
      setOperationalInfo(checkOperationalStatus());
    }, 60000);

    // Listen to new orders
    const unsubscribeNew = dbService.listenToNewOrders((newOrder) => {
      console.log("Admin: New order detected!", newOrder);
      // Play alarm
      triggerNewOrderAlarm(newOrder);
      // Refresh list
      refreshOrdersOnly();
    });

    // Listen to updates on existing orders (so if kitchen cooks, admin updates too)
    const unsubscribeUpdates = dbService.listenToOrderUpdates("*", () => {
      refreshOrdersOnly();
      refreshMejasOnly();
    });

    // Fallback for devices where realtime websocket events are delayed/blocked.
    const polling = setInterval(async () => {
      const latest = await dbService.getOrderHistory();
      const newOrders = latest.filter((order) => !knownOrderIds.current.has(order.id_pemesanan));
      if (newOrders.length) {
        newOrders.forEach((order) => knownOrderIds.current.add(order.id_pemesanan));
        triggerNewOrderAlarm(newOrders[0]);
      }
      setOrders(latest);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearInterval(polling);
      unsubscribeNew();
      unsubscribeUpdates();
    };
  }, [router]);

  // Recalculate stats when orders update
  useEffect(() => {
    // Nilai pesanan hari ini; pembayaran tetap ditangani kasir secara manual.
    if (typeof window !== "undefined") {
      const allOrdersStr = localStorage.getItem("seaorder_orders");
      if (allOrdersStr) {
        try {
          const allOrders = JSON.parse(allOrdersStr) as OrderDetail[];
          const today = new Date().toDateString();
          const completedSum = allOrders
            .filter((o) => new Date(o.created_at).toDateString() === today)
            .reduce((sum, o) => sum + o.total_bayar, 0);
          setTotalEarnings(completedSum);
        } catch (e) {}
      }
    }
  }, [orders]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const orderHistory = await dbService.getOrderHistory();
      setOrders(orderHistory);
      knownOrderIds.current = new Set(orderHistory.map((order) => order.id_pemesanan));
      const mejaList = await dbService.getMejaList();
      setMejas(mejaList);
      setMenus(await dbService.getMenuList());
    } catch (e) {
      console.error("Error fetching initial admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const refreshOrdersOnly = async () => {
    try {
      const orderHistory = await dbService.getOrderHistory();
      setOrders(orderHistory);
      orderHistory.forEach((order) => knownOrderIds.current.add(order.id_pemesanan));
    } catch (e) {}
  };

  const refreshMejasOnly = async () => {
    try {
      const mejaList = await dbService.getMejaList();
      setMejas(mejaList);
    } catch (e) {}
  };

  const enableAudio = () => {
    setAudioEnabled(true);
    playBeep(440, 0.1); // Quick feedback beep
  };

  const playBeep = (frequency = 440, duration = 0.3) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Sound blocked", e);
    }
  };

  const triggerNewOrderAlarm = (order: OrderDetail) => {
    setNewOrderAlert(order);
    playNewOrderSoundLoop();
  };

  const playNewOrderSoundLoop = () => {
    // Play sound pattern: High-low chime repeated
    if (typeof window === "undefined") return;
    
    let repeats = 4;
    const playNext = () => {
      if (repeats <= 0) return;
      playBeep(659.25, 0.15); // E5
      setTimeout(() => {
        playBeep(523.25, 0.25); // C5
        repeats--;
        if (repeats > 0) setTimeout(playNext, 1000);
      }, 200);
    };
    
    playNext();
  };

  const dismissAlert = () => {
    setNewOrderAlert(null);
  };

  const handleToggleMeja = async (mejaId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "kosong" ? "terisi" : "kosong";
    await dbService.updateMejaStatus(mejaId, nextStatus);
    playBeep(493.88, 0.1); // Toggle sound
    refreshMejasOnly();
  };

  const handleMenuUpdate = async (menu: Menu, changes: Partial<Menu>) => {
    const updated = { ...menu, ...changes };
    await dbService.updateMenu(updated);
    setMenus((all) => all.map((item) => item.id_menu === updated.id_menu ? updated : item));
  };

  const downloadDailyReport = () => window.print();
  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim() || !Number(newMenuPrice)) return;
    const added = await dbService.addMenu({ nama_menu: newMenuName.trim(), harga: Number(newMenuPrice), kategori: "Makanan", stok_status: "tersedia", image: "/favicon.ico" });
    setMenus((all) => [...all, added]); setNewMenuName(""); setNewMenuPrice("");
  };

  // Filters
  const filteredOrders = orders.filter((o) => {
    const matchStatus = statusFilter === "Semua" || o.status_order === statusFilter;
    const matchService = serviceFilter === "Semua" || o.opsi_layanan === serviceFilter;
    return matchStatus && matchService;
  });

  const getOpsiLabel = (opsi: string) => {
    switch (opsi) {
      case "acara": return "📅 Acara";
      case "dinein": return "🍽️ Dine-In";
      case "takeaway": return "🛍️ Take-Away";
      case "antar": return "🛵 Delivery";
      default: return opsi;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Menunggu": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "Sedang Dimasak": return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "Makanan Sudah Siap": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      default: return "bg-slate-500/20 text-slate-300";
    }
  };

  const getMejaColor = (status: string) => {
    return status === "kosong" 
      ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-400 text-emerald-400"
      : "bg-rose-500/10 border-rose-500/30 hover:border-rose-400 text-rose-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400 font-sans font-bold">
        Memuat Dashboard Administrator SeaOrder...
      </div>
    );
  }

  const occupiedMejasCount = mejas.filter((m) => m.status_meja === "terisi").length;
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString());
  const guestCount = todayOrders.reduce((sum, o) => sum + (o.opsi_layanan === "dinein" ? 1 : 1), 0);
  const ratedOrders = orders.filter((o) => o.rating);
  const averageRating = ratedOrders.length ? ratedOrders.reduce((sum, o) => sum + (o.rating || 0), 0) / ratedOrders.length : 0;
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(); day.setDate(day.getDate() - (6 - index));
    const total = orders.filter((o) => new Date(o.created_at).toDateString() === day.toDateString()).reduce((sum, o) => sum + o.total_bayar, 0);
    return { label: day.toLocaleDateString("id-ID", { weekday: "short" }), total };
  });
  const maxTrend = Math.max(...dailyTrend.map((d) => d.total), 1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      
      {/* Sound System Activator */}
      {!audioEnabled && (
        <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-slate-950 px-4 py-3 font-extrabold text-xs text-center flex items-center justify-center gap-3 shadow-lg">
          🔔 Browser membutuhkan izin untuk memainkan alarm pesanan baru.
          <button 
            onClick={enableAudio} 
            className="bg-slate-950 text-cyan-400 hover:bg-slate-900 transition-colors px-4 py-1.5 rounded-lg text-[10px] uppercase tracking-wider"
          >
            Aktifkan Alarm Suara
          </button>
        </div>
      )}

      {/* New Order Alert Modal (Suara + UI) */}
      {newOrderAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border-2 border-cyan-400 rounded-3xl p-6 shadow-2xl text-center space-y-4 animate-bounce">
            <span className="text-5xl animate-pulse inline-block">🛎️</span>
            <h2 className="text-xl font-black text-cyan-300 tracking-tight">PESANAN BARU MASUK!</h2>
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 text-xs text-left space-y-2">
              <p><span className="text-slate-450">ID Pesanan:</span> <strong className="text-slate-100">#{newOrderAlert.id_pemesanan}</strong></p>
              <p><span className="text-slate-450">Pelanggan:</span> <strong className="text-slate-100">{newOrderAlert.user_nama}</strong></p>
              <p><span className="text-slate-450">Layanan:</span> <strong className="text-cyan-300">{getOpsiLabel(newOrderAlert.opsi_layanan)}</strong></p>
              <p><span className="text-slate-450">Total Bayar:</span> <strong className="text-slate-150">Rp {newOrderAlert.total_bayar.toLocaleString("id-ID")}</strong></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedOrder(newOrderAlert);
                  dismissAlert();
                }}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all"
              >
                Lihat Detail Pesanan
              </button>
              <button
                onClick={dismissAlert}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-xs transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Header */}
      <header className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 py-8 px-6 border-b border-white/10 shadow-xl">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">🔑</span>
              <h1 className="text-2xl font-black bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-200">
                SeaOrder Admin Dashboard
              </h1>
            </div>
            <p className="text-xs text-slate-450 mt-1">Warung Seafood & Lalapan "Lamongan Jaya Asli" - Portal Kasir & Owner</p>
          </div>

          {/* Operational Hours Indicator */}
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${operationalInfo.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></span>
            <div className="text-xs">
              <p className="font-bold text-slate-200">{operationalInfo.isOpen ? "Warung BUKA (Jam Operasional)" : "Warung TUTUP"}</p>
              <p className="text-[10px] text-slate-450">Jam WIB Sekarang: {operationalInfo.currentHourWib.toString().padStart(2, "0")}.00 (Buka: 17.00 - 04.00)</p>
            </div>
          </div>
          <button onClick={downloadDailyReport} className="rounded-xl bg-cyan-400 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-300">Unduh Laporan Harian (PDF)</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Statistics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
            <p className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-1">Pendapatan Hari Ini</p>
            <h3 className="text-2xl font-black text-emerald-400">Rp {totalEarnings.toLocaleString("id-ID")}</h3>
            <p className="text-[10px] text-slate-500 mt-2">Total pesanan hari ini, tidak termasuk proses pembayaran.</p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
            <p className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-1">Pesanan Hari Ini</p>
            <h3 className="text-2xl font-black text-cyan-400">{todayOrders.length} Pesanan</h3>
            <p className="text-[10px] text-slate-500 mt-2">Daftar status pesanan yang telah dibuat hari ini.</p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
            <p className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-1">Tamu Hari Ini</p>
            <h3 className="text-2xl font-black text-amber-400">{guestCount} Tamu</h3>
            <p className="text-[10px] text-slate-500 mt-2">{occupiedMejasCount} / {mejas.length} meja sedang terisi.</p>
          </div>
          <div className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
            <p className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-1">Rating Layanan</p>
            <h3 className="text-2xl font-black text-yellow-400">{averageRating ? averageRating.toFixed(1) : "—"} ★</h3>
            <p className="text-[10px] text-slate-500 mt-2">Dari {ratedOrders.length} penilaian pelanggan.</p>
          </div>
        </section>

        <section className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl">
          <h2 className="text-sm font-extrabold text-cyan-300">Tren Pendapatan Harian</h2>
          <div className="mt-5 flex h-36 items-end gap-3">{dailyTrend.map((day) => <div key={day.label} className="flex flex-1 flex-col items-center gap-2"><span className="text-[10px] text-emerald-300">{day.total ? `${Math.round(day.total / 1000)}k` : ""}</span><div className="w-full rounded-t-lg bg-cyan-500/80" style={{ height: `${Math.max((day.total / maxTrend) * 100, day.total ? 8 : 2)}%` }}></div><span className="text-[10px] text-slate-400">{day.label}</span></div>)}</div>
        </section>

        <section className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl">
          <h2 className="text-sm font-extrabold text-cyan-300">Menu: Foto, Katalog, Harga & Ketersediaan</h2>
          <form onSubmit={handleAddMenu} className="mt-3 flex flex-wrap gap-2"><input value={newMenuName} onChange={(e) => setNewMenuName(e.target.value)} placeholder="Nama menu baru" className="rounded-xl bg-slate-800 px-3 py-2 text-xs text-white" /><input value={newMenuPrice} onChange={(e) => setNewMenuPrice(e.target.value)} type="number" placeholder="Harga" className="w-28 rounded-xl bg-slate-800 px-3 py-2 text-xs text-white" /><button className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950">+ Tambah Menu</button></form>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{menus.map((menu) => <div key={menu.id_menu} className="flex items-center gap-3 rounded-2xl bg-slate-950/50 p-3"><img src={menu.image || "/favicon.ico"} alt="" className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0 flex-1"><input value={menu.nama_menu} onChange={(e) => handleMenuUpdate(menu, { nama_menu: e.target.value })} className="w-full bg-transparent text-xs font-bold text-white outline-none" /><input type="number" value={menu.harga} onChange={(e) => handleMenuUpdate(menu, { harga: Number(e.target.value) })} className="mt-1 w-28 bg-slate-800 p-1 text-xs text-cyan-200" /></div><button onClick={() => handleMenuUpdate(menu, { stok_status: menu.stok_status === "tersedia" ? "habis" : "tersedia" })} className={`rounded-lg px-2 py-1 text-[10px] font-bold ${menu.stok_status === "tersedia" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`}>{menu.stok_status === "tersedia" ? "Tersedia" : "Habis"}</button></div>)}</div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Middle: Orders List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Filter controls */}
            <div className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md flex flex-wrap gap-4 items-center justify-between">
              <h2 className="font-extrabold text-sm text-cyan-300">Riwayat & Status Pesanan</h2>
              
              <div className="flex gap-3">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-xs font-bold p-2.5 rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Menunggu">Menunggu</option>
                  <option value="Sedang Dimasak">Sedang Dimasak</option>
                  <option value="Makanan Sudah Siap">Makanan Sudah Siap</option>
                </select>

                {/* Service Filter */}
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="bg-slate-950 border border-white/10 text-xs font-bold p-2.5 rounded-xl text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="Semua">Semua Layanan</option>
                  <option value="dinein">Makan di Tempat</option>
                  <option value="takeaway">Take-Away</option>
                  <option value="antar">Pesan Antar</option>
                  <option value="acara">Acara Besar</option>
                </select>
              </div>
            </div>

            {/* Orders list items */}
            {filteredOrders.length === 0 ? (
              <div className="bg-slate-900/20 border border-white/5 p-12 text-center rounded-3xl">
                <span className="text-4xl">📭</span>
                <p className="text-sm font-semibold text-slate-400 mt-3">Tidak ada antrean pesanan aktif yang cocok.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div 
                    key={order.id_pemesanan}
                    className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group"
                  >
                    <div onClick={() => setSelectedOrder(order)} className="space-y-1.5 cursor-pointer flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-955 border border-white/10 text-slate-400 px-2.5 py-0.5 rounded-lg font-mono">
                          #{order.id_pemesanan}
                        </span>
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-md ${getStatusColor(order.status_order)}`}>
                          {order.status_order}
                        </span>
                        <span className="text-xs font-bold text-slate-350">{getOpsiLabel(order.opsi_layanan)}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {order.user_nama} <span className="font-normal text-xs text-slate-450">({order.user_no_wa})</span>
                      </h4>
                      {order.items && order.items.length > 0 && (
                        <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                          {order.items.map((i) => `${i.nama_menu} x${i.quantity}`).join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Actions panel */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="text-right text-xs mr-3 hidden md:block">
                        <p className="text-slate-450">Total Tagihan</p>
                        <p className="font-bold text-cyan-300 text-sm">Rp {order.total_bayar.toLocaleString("id-ID")}</p>
                      </div>

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all active:scale-95"
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Meja Grid Management */}
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
              <div className="mb-4">
                <h2 className="font-extrabold text-sm text-cyan-300">Manajemen Status Meja</h2>
                <p className="text-[10px] text-slate-450 mt-1">Klik meja untuk mengganti status kosong/terisi secara instan.</p>
              </div>

              {/* Meja Grid */}
              <div className="grid grid-cols-2 gap-4">
                {mejas.map((m) => (
                  <button
                    key={m.id_meja}
                    onClick={() => handleToggleMeja(m.id_meja, m.status_meja)}
                    className={`p-4 border rounded-2xl text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer shadow-sm ${getMejaColor(
                      m.status_meja
                    )}`}
                  >
                    <span className="text-2xl">{m.status_meja === "kosong" ? "🟢" : "🔴"}</span>
                    <strong className="text-sm font-extrabold text-slate-100">{m.nomor_meja}</strong>
                    <span className="text-[9px] uppercase tracking-wider font-semibold opacity-75">
                      {m.status_meja === "kosong" ? "Kosong" : "Terisi"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Selected Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 animate-slideUp">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <h3 className="font-black text-lg text-slate-100 flex items-center gap-2">
                  <span>📄</span> Detail Tagihan Order
                </h3>
                <p className="text-[10px] text-slate-400">ID: #{selectedOrder.id_pemesanan}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Client Profile */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">— Profil Pelanggan —</h4>
              <div className="text-xs space-y-1.5 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
                <p><span className="text-slate-450">Nama:</span> <strong className="text-slate-200">{selectedOrder.user_nama}</strong></p>
                <div className="flex justify-between items-center">
                  <p><span className="text-slate-450">WhatsApp:</span> <strong className="text-slate-200">{selectedOrder.user_no_wa}</strong></p>
                  <a 
                    href={`https://wa.me/${selectedOrder.user_no_wa?.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2 py-1 rounded font-bold shadow-md"
                  >
                    💬 Hubungi WhatsApp
                  </a>
                </div>
                <p><span className="text-slate-450">Waktu Order:</span> <strong className="text-slate-200">{new Date(selectedOrder.created_at).toLocaleString("id-ID")}</strong></p>
              </div>
            </div>

            {/* Service details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">— Detail Layanan ({getOpsiLabel(selectedOrder.opsi_layanan)}) —</h4>
              <div className="text-xs bg-slate-955/40 p-3.5 rounded-xl border border-white/5 leading-relaxed">
                {selectedOrder.opsi_layanan === "dinein" && (
                  <p><span className="text-slate-450">Nomor Meja:</span> <strong className="text-slate-100">Meja {selectedOrder.extension?.id_meja}</strong></p>
                )}
                {selectedOrder.opsi_layanan === "takeaway" && (
                  <p><span className="text-slate-450">Jadwal Ambil:</span> <strong className="text-slate-100">{selectedOrder.extension?.waktu_permintaan}</strong></p>
                )}
                {selectedOrder.opsi_layanan === "antar" && (
                  <div>
                    <p><span className="text-slate-450">Alamat Lengkap:</span></p>
                    <p className="font-semibold text-slate-200 mt-1">{selectedOrder.extension?.alamat}</p>
                  </div>
                )}
                {selectedOrder.opsi_layanan === "acara" && (
                  <div className="space-y-1">
                    <p><span className="text-slate-450">Tanggal Acara:</span> <strong className="text-slate-100">{selectedOrder.extension?.tgl_acara}</strong></p>
                    <p><span className="text-slate-450">Jam Acara:</span> <strong className="text-slate-100">{selectedOrder.extension?.waktu_permintaan}</strong></p>
                    <p><span className="text-slate-450">Catatan/Alamat:</span></p>
                    <p className="font-semibold text-slate-250 italic mt-0.5">"{selectedOrder.extension?.alamat}"</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ordered Items */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">— Menu Dipesan —</h4>
              <div className="max-h-40 overflow-y-auto divide-y divide-white/5 bg-slate-950/40 p-3.5 rounded-xl border border-white/5 space-y-2">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start pt-2 first:pt-0">
                      <div>
                        <p className="text-xs font-bold text-slate-200">
                          {item.nama_menu} <span className="text-cyan-400">x{item.quantity}</span>
                        </p>
                        {item.catatan && (
                          <p className="text-[9px] text-slate-450 italic mt-0.5">Catatan: "{item.catatan}"</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-300">
                        Rp {(item.harga * item.quantity).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">Tidak ada detail item yang disimpan.</p>
                )}
                <div className="flex justify-between items-center pt-3 font-extrabold text-sm text-cyan-350 border-t border-dashed border-white/5">
                  <span>Total Pesanan</span>
                  <span>Rp {selectedOrder.total_bayar.toLocaleString("id-ID")}</span>
                </div>
                <p className="pt-3 text-xs font-semibold text-amber-300">Pembayaran dilakukan langsung di kasir.</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-350 text-xs font-bold py-2.5 rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
