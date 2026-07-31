"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { dbService, OrderDetail } from "@/lib/dbService";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrackingPage({ params }: PageProps) {
  // Unwrap the params promise using React.use()
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Status mapping
  const statuses = ["Menunggu", "Sedang Dimasak", "Makanan Sudah Siap"];

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    // Realtime listener from dbService (handles both Supabase and localStorage cross-tab sync)
    const unsubscribe = dbService.listenToOrderUpdates(id, (updatedOrder) => {
      console.log("Realtime order update received:", updatedOrder);
      setOrder(updatedOrder);
      playNotificationSound();
    });

    return () => {
      unsubscribe();
    };
  }, [id]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.15); // A5
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.warn("AudioContext not supported or allowed yet.", e);
    }
  };

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError("");

    try {
      const fullOrder = await dbService.getOrderDetails(id);
      if (fullOrder) {
        setOrder(fullOrder);
        
      } else {
        setError("Order tidak ditemukan di sistem.");
      }
    } catch (err) {
      console.warn("Gagal mengambil detail pesanan.", err);
      setError("Gagal memuat detail pesanan.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Menunggu": return "📥";
      case "Sedang Dimasak": return "…";
      case "Makanan Sudah Siap": return "✓";
      default: return "•";
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case "Menunggu": return "Pesanan baru terdaftar dan menunggu untuk dimasak.";
      case "Sedang Dimasak": return "Koki sedang menyiapkan hidangan laut lezat Anda.";
      case "Makanan Sudah Siap": return "Makanan sudah siap.";
      default: return "";
    }
  };

  const getOpsiLabel = (opsi: string) => {
    switch (opsi) {
      case "acara": return "Acara Besar";
      case "dinein": return "Makan di Tempat (Dine-In)";
      case "takeaway": return "Bawa Pulang (Take-Away)";
      case "antar": return "Pesan Antar (Delivery)";
      default: return opsi;
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Memuat pelacak pesanan...</div>;
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-slate-500 mb-4">Pesanan tidak ditemukan</p>
        <h2 className="text-lg font-bold mb-2">Pesanan Tidak Ditemukan</h2>
        <p className="text-sm text-slate-400 mb-6">{error || "Detail pesanan tidak tersedia."}</p>
        <button 
          onClick={() => router.push("/")}
          className="bg-cyan-500 text-slate-950 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-cyan-400 transition-colors"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const currentStatusIndex = statuses.indexOf(order.status_order);
  const isFoodReady = ["Makanan Sudah Siap", "Siap Disajikan", "Siap"].includes(order.status_order);

  return (
    <div className="oceanic-shell min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-slate-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
          <div>
            <h1 className="text-2xl font-black bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
              Pelacakan Pesanan
            </h1>
            <p className="text-xs text-slate-400 mt-1">ID Pesanan: #{order.id_pemesanan}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs font-bold text-slate-400 hover:text-white px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            Beranda
          </button>
        </div>

        {/* Realtime Status Bar / Progress */}
        <div className="mb-10 bg-slate-950/40 p-6 rounded-3xl border border-white/5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-6">— Status Hidangan —</h2>
          
          <div className="relative mb-4 flex items-start justify-between">
            {/* Horizontal Line background */}
            <div className="absolute top-1/2 left-[8%] right-[8%] h-1 bg-white/10 -translate-y-1/2 z-0 rounded-full"></div>
            {/* Active progress line */}
            <div 
              className="absolute top-1/2 left-[8%] h-1 bg-cyan-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
              style={{ width: `calc(${(currentStatusIndex / (statuses.length - 1)) * 100}% * 0.84)` }}
            ></div>

            {/* Stepper nodes */}
            {statuses.map((status, index) => {
              const isActive = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              return (
                <div key={status} className="relative z-10 flex w-1/3 flex-col items-center">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg border transition-all duration-300 ${
                      isCurrent 
                        ? "bg-cyan-500 border-cyan-300 text-slate-950 scale-110 ring-4 ring-cyan-500/20"
                        : isActive
                          ? "bg-cyan-600 border-cyan-500 text-slate-950"
                          : "bg-slate-800 border-slate-700 text-slate-500"
                    }`}
                  >
                    {getStatusIcon(status)}
                  </div>
                  <span 
                    className={`mt-2.5 w-full px-1 text-center text-[8px] font-bold uppercase leading-tight tracking-normal transition-colors duration-300 sm:text-[10px] sm:tracking-wide ${
                      isCurrent ? "text-cyan-300" : isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-6 pt-4 border-t border-white/5">
            <p className="text-sm font-semibold text-slate-200">
              {getStatusDescription(order.status_order)}
            </p>
            {!isFoodReady && (
              <p className="text-[10px] text-cyan-400 mt-1 animate-pulse">
                Menunggu pembaruan status real-time dari dapur...
              </p>
            )}
          </div>
        </div>

        {/* Order details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Service Details */}
          <div className="bg-slate-950/20 p-5 rounded-2xl border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Detail Pengiriman/Layanan</h3>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400">Jenis Layanan:</span>
                <p className="font-bold text-slate-200 mt-0.5">{getOpsiLabel(order.opsi_layanan)}</p>
              </div>
              <div>
                <span className="text-slate-400">Waktu Order:</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {new Date(order.created_at).toLocaleString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short"
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="bg-slate-950/20 p-5 rounded-2xl border border-white/5 space-y-3">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Informasi Pemesan</h3>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400">Nama Lengkap:</span>
                <p className="font-bold text-slate-200 mt-0.5">
                  {sessionStorage.getItem("user_nama") || "Pelanggan"}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Nomor WhatsApp:</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {sessionStorage.getItem("user_wa") || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Ordered items details */}
        {order.items && order.items.length > 0 && (
          <div className="bg-slate-950/20 p-5 rounded-2xl border border-white/5 mb-8">
            <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-3">Item yang Dipesan</h3>
            <div className="divide-y divide-white/5 space-y-2.5">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start pt-2.5 first:pt-0">
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      {item.nama_menu} <span className="text-cyan-400">x{item.quantity}</span>
                    </span>
                    {item.catatan && (
                      <p className="text-[10px] text-slate-400 italic mt-0.5">Catatan: "{item.catatan}"</p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-300">
                    Rp {(item.harga * item.quantity).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 font-extrabold text-sm text-cyan-300 border-t border-dashed border-white/5">
                <span>Total Pesanan</span>
                <span>Rp {order.total_bayar.toLocaleString("id-ID")}</span>
              </div>
              <p className="pt-3 text-xs font-semibold text-amber-300">
                {order.opsi_layanan === "antar" ? "Pembayaran dilakukan kepada driver saat pesanan tiba." : "Pembayaran dilakukan langsung di kasir."}
              </p>
            </div>
          </div>
        )}

        {isFoodReady && (
          <RatingForm order={order} onSaved={(rating, comment) => setOrder({ ...order, rating, rating_comment: comment })} />
        )}

        
      </div>
    </div>
  );
}

function RatingForm({ order, onSaved }: { order: OrderDetail; onSaved: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState(order.rating || 0);
  const [comment, setComment] = useState(order.rating_comment || "");
  const [saved, setSaved] = useState(Boolean(order.rating));
  const save = async () => {
    if (!rating) return;
    await dbService.submitRating(order.id_pemesanan, rating, comment);
    setSaved(true); onSaved(rating, comment);
  };
  return <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5 text-center">
    <h3 className="text-sm font-black text-cyan-200">Bagaimana layanan kami?</h3>
    <p className="mt-1 text-xs text-slate-400">Rating Anda membantu kami meningkatkan pelayanan.</p>
    <div className="mt-3 flex justify-center gap-2">{[1,2,3,4,5].map((star) => <button key={star} onClick={() => !saved && setRating(star)} disabled={saved} className={`text-3xl ${star <= rating ? "text-amber-400" : "text-slate-600"}`}>★</button>)}</div>
    {!saved ? <><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Saran untuk kami (opsional)" className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-white" />
      <button onClick={save} disabled={!rating} className="mt-3 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Kirim Rating</button></> : <p className="mt-3 text-xs font-bold text-emerald-300">Terima kasih atas rating Anda!</p>}
  </section>;
}
