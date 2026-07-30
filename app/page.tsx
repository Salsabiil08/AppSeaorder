"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [lightPos, setLightPos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Reactive inputs
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");

  // Load from session storage on mount
  useEffect(() => {
    setNama(sessionStorage.getItem("user_nama") || "");
    setWa(sessionStorage.getItem("user_wa") || "");
  }, []);

  // Efek Lighting (Tetap Sesuai Desainmu)
  useEffect(() => {
    if (headerRef.current) {
      const rect = headerRef.current.getBoundingClientRect();
      const center = { x: rect.width / 2, y: rect.height / 2 };
      setLightPos(center);
      setMousePos(center);
    }
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const updatePosition = () => {
      setLightPos((current) => {
        let targetX = mousePos.x;
        let targetY = mousePos.y;
        if (!isHovered && headerRef.current) {
          const rect = headerRef.current.getBoundingClientRect();
          targetX = rect.width / 2;
          targetY = rect.height / 2;
        }
        const dx = targetX - current.x;
        const dy = targetY - current.y;
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return { x: targetX, y: targetY };
        return { x: current.x + dx * 0.1, y: current.y + dy * 0.1 };
      });
      animationFrameId = requestAnimationFrame(updatePosition);
    };
    animationFrameId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(animationFrameId);
  }, [mousePos, isHovered]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!headerRef.current) return;
    const rect = headerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleNamaChange = (val: string) => {
    setNama(val);
    sessionStorage.setItem("user_nama", val);
  };

  const handleWaChange = (val: string) => {
    setWa(val);
    sessionStorage.setItem("user_wa", val);
  };

  // Logic Pindah Halaman
  const handleSelectOpsi = (opsiId: string) => {
    if (!nama.trim() || !wa.trim()) return;
    sessionStorage.setItem("selected_opsi", opsiId);
    router.push("/form-detail");
  };

  const isValid = nama.trim().length > 0 && wa.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans overflow-x-hidden pb-20">
      <header
        ref={headerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-800 text-white text-center py-20 px-4 shadow-lg rounded-b-[3.5rem] overflow-hidden transition-all duration-300 cursor-default select-none"
      >
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mt-4 mb-2 drop-shadow-lg bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-blue-200">
            🌊 SeaOrder
          </h1>
          <p className="text-sm md:text-base text-blue-100 font-medium mb-8">Warung Seafood & Lalapan "Lamongan Jaya Asli"</p>
          
          {/* Input Identitas */}
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <input 
              placeholder="Nama Lengkap" 
              className="p-3 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white shadow-md border-0" 
              value={nama}
              onChange={(e) => handleNamaChange(e.target.value)} 
            />
            <input 
              placeholder="Nomor WhatsApp" 
              className="p-3 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-cyan-400 outline-none bg-white shadow-md border-0" 
              value={wa}
              onChange={(e) => handleWaChange(e.target.value)} 
            />
          </div>
          <button
            onClick={() => router.push("/riwayat")}
            className="mt-5 text-xs font-bold text-cyan-100 hover:text-white underline underline-offset-4"
          >
            Cek Riwayat Pesanan
          </button>
          <button
            onClick={() => router.push("/login")}
            className="mt-3 block mx-auto text-xs font-bold text-cyan-100 hover:text-white underline underline-offset-4"
          >
            Login Stakeholder
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-xs font-bold text-center mb-12 text-slate-400 tracking-widest uppercase">— Pilih Opsi Layanan —</h2>
        
        {/* Grid 4 Opsi */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            id: "acara", 
            title: "Acara Besar", 
            icon: "📅", 
            desc: "Syukuran/Bukber. Wajib booking Minimal H-6 sebelum hari-H." 
          },
          { 
            id: "dinein", 
            title: "Makan di Tempat", 
            icon: "🍽️", 
            desc: "Pilih meja real-time. Layanan tersedia pukul 17.00 - 04.00 WIB." 
          },
          { 
            id: "takeaway", 
            title: "Take-Away", 
            icon: "🛍️", 
            desc: "Bisa pesan cepat. Pesanan diproses maksimal 30 menit." 
          },
          { 
            id: "antar", 
            title: "Pesan Antar", 
            icon: "🛵", 
            desc: "Layanan antar 17.00 - 04.00 WIB. Nikmati makanan hangat di rumah." 
          }
          ].map((item) => (
            <div key={item.id} className="bg-white border-2 border-dashed border-slate-200 hover:border-cyan-400 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group">
              <div className="text-4xl mb-4 group-hover:animate-bounce">{item.icon}</div>
              <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">{item.desc}</p>
              <button 
                onClick={() => handleSelectOpsi(item.id)} 
                disabled={!isValid}
                className={`w-full text-sm font-semibold py-2.5 rounded-xl transition-all cursor-pointer ${
                  isValid 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-blue-500/20 active:scale-95" 
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                Pilih
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
