"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dbService, checkOperationalStatus, Meja } from "@/lib/dbService";

export default function FormDetail() {
  const [opsi, setOpsi] = useState<string | null>(null);
  const [nama, setNama] = useState<string>("");
  const [wa, setWa] = useState<string>("");
  
  // Form fields
  const [tglAcara, setTglAcara] = useState("");
  const [waktuAcara, setWaktuAcara] = useState("");
  const [catatanAcara, setCatatanAcara] = useState("");

  const [mejaList, setMejaList] = useState<Meja[]>([]);
  const [selectedMeja, setSelectedMeja] = useState("");
  const [jumlahTamu, setJumlahTamu] = useState("1");
  const [loadingMeja, setLoadingMeja] = useState(false);

  const getKapasitasMeja = (meja: Meja) => meja.id_meja <= 5 ? 8 : meja.id_meja === 10 ? 6 : 4;

  const [takeawayTimeType, setTakeawayTimeType] = useState("sekarang");
  const [takeawayTime, setTakeawayTime] = useState("");

  const [alamat, setAlamat] = useState("");
  const [gang, setGang] = useState("");
  const [patokan, setPatokan] = useState("");

  // Validation state
  const [errorMsg, setErrorMsg] = useState("");
  const [isClientOpen, setIsClientOpen] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedOpsi = sessionStorage.getItem("selected_opsi");
    const savedNama = sessionStorage.getItem("user_nama");
    const savedWa = sessionStorage.getItem("user_wa");

    if (!savedOpsi || !savedNama || !savedWa) {
      router.push("/");
      return;
    }

    setOpsi(savedOpsi);
    setNama(savedNama);
    setWa(savedWa);

    // If dine-in, fetch tables
    if (savedOpsi === "dinein") {
      fetchMeja();
    }

    // Check operational hours
    const { isOpen } = checkOperationalStatus();
    setIsClientOpen(isOpen);
  }, [router]);

  const fetchMeja = async () => {
    setLoadingMeja(true);
    try {
      const data = await dbService.getMejaList();
      // Filter for tables that are empty and can fit the guests
      setMejaList(data.filter((m) => m.status_meja === "kosong"));
    } catch (err) {
      console.warn("Gagal mengambil data meja.", err);
    } finally {
      setLoadingMeja(false);
    }
  };

  const handleBack = () => {
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // 1. Operational Hours Validation
    if (opsi === "dinein" || (opsi === "takeaway" && takeawayTimeType === "sekarang") || opsi === "antar") {
      const { isOpen } = checkOperationalStatus();
      if (!isOpen) {
        setErrorMsg("Maaf, Warung tutup saat ini. Layanan makan di tempat, take-away sekarang, dan pesan antar hanya tersedia pukul 17.00 - 04.00 WIB.");
        return;
      }
    }

    if (opsi === "takeaway" && takeawayTimeType === "jam_tertentu") {
      if (!takeawayTime) {
        setErrorMsg("Harap tentukan jam pengambilan.");
        return;
      }
      const hour = parseInt(takeawayTime.split(":")[0], 10);
      const isHourOpen = hour >= 17 || hour < 4;
      if (!isHourOpen) {
        setErrorMsg("Maaf, jam pengambilan harus berada dalam waktu operasional warung (17.00 - 04.00 WIB).");
        return;
      }
    }

    // 2. Validation Logic for Opsi
    if (opsi === "acara") {
      if (!tglAcara || !waktuAcara) {
        setErrorMsg("Harap tentukan tanggal dan waktu acara.");
        return;
      }
      
      // Minimal H-1
      const selectedDateTime = new Date(`${tglAcara}T${waktuAcara}`);
      const minDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      if (selectedDateTime < minDateTime) {
        setErrorMsg("Booking untuk Acara Besar wajib dilakukan minimal H-1 sebelum hari-H.");
        return;
      }

      // Save to sessionStorage
      sessionStorage.setItem("form_tgl_acara", tglAcara);
      sessionStorage.setItem("form_waktu_acara", waktuAcara);
      sessionStorage.setItem("form_catatan", catatanAcara);

    } else if (opsi === "dinein") {
      if (!selectedMeja) {
        setErrorMsg("Harap pilih nomor meja.");
        return;
      }
      const tamuNum = parseInt(jumlahTamu, 10);
      const meja = mejaList.find((m) => String(m.id_meja) === selectedMeja);
      const kapasitas = meja ? getKapasitasMeja(meja) : 4;
      if (isNaN(tamuNum) || tamuNum < 1 || tamuNum > kapasitas) {
        setErrorMsg(`Jumlah tamu untuk ${meja?.nomor_meja || "meja ini"} maksimal ${kapasitas} orang.`);
        return;
      }

      // Save to sessionStorage
      sessionStorage.setItem("form_meja_id", selectedMeja);
      sessionStorage.setItem("form_jumlah_tamu", jumlahTamu);

    } else if (opsi === "takeaway") {
      if (takeawayTimeType === "jam_tertentu" && !takeawayTime) {
        setErrorMsg("Harap tentukan jam pengambilan.");
        return;
      }

      // Save to sessionStorage
      sessionStorage.setItem("form_takeaway_time_type", takeawayTimeType);
      sessionStorage.setItem("form_takeaway_time", takeawayTimeType === "sekarang" ? "Sekarang" : takeawayTime);

    } else if (opsi === "antar") {
      if (!alamat.trim()) {
        setErrorMsg("Alamat lengkap wajib diisi.");
        return;
      }

      // Save to sessionStorage
      sessionStorage.setItem("form_alamat", alamat);
      sessionStorage.setItem("form_gang", gang);
      sessionStorage.setItem("form_patokan", patokan);
    }

    // Set validation status and redirect
    sessionStorage.setItem("form_data_valid", "true");
    router.push("/katalog");
  };

  const getOpsiTitle = () => {
    switch (opsi) {
      case "acara":
        return "📅 Detail Acara Besar";
      case "dinein":
        return "🍽️ Detail Makan di Tempat";
      case "takeaway":
        return "🛍️ Detail Take-Away";
      case "antar":
        return "🛵 Detail Pesan Antar";
      default:
        return "Detail Layanan";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 md:p-8 shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <button 
            onClick={handleBack}
            className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:border-cyan-400/50 text-cyan-400 hover:text-cyan-300 hover:bg-blue-500/20 transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-blue-500/5"
            aria-label="Kembali"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-200">
            {getOpsiTitle()}
          </h1>
        </div>

        {/* Operational Hours Alert */}
        {!isClientOpen && (opsi === "dinein" || (opsi === "takeaway" && takeawayTimeType === "sekarang") || opsi === "antar") && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
            ⚠️ <strong>Info Warung:</strong> Saat ini di luar jam operasional (17.00 - 04.00 WIB). Pesanan Anda mungkin akan diproses saat warung buka.
          </div>
        )}

        <p className="text-sm text-slate-300 mb-6">
          Hai <strong>{nama}</strong>, silakan lengkapi formulir di bawah ini untuk melanjutkan ke katalog menu.
        </p>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Conditional Fields Based on Service */}
          {opsi === "acara" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Tanggal Acara (Min. H-1)</label>
                <input 
                  type="date" 
                  required 
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                  value={tglAcara}
                  onChange={(e) => setTglAcara(e.target.value)}
                />
              </div>
              <a href="https://wa.me/6281246178877" target="_blank" rel="noreferrer" className="block text-center text-xs font-bold text-emerald-300 hover:text-emerald-200">
                Butuh bantuan reservasi? Hubungi WhatsApp 0812-4617-8877
              </a>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Waktu Acara</label>
                <input 
                  type="time" 
                  required 
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                  value={waktuAcara}
                  onChange={(e) => setWaktuAcara(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Catatan Acara (Opsional)</label>
                <textarea 
                  placeholder="Contoh: Bukber Keluarga Besar, butuh meja panjang, dll."
                  className="w-full p-3 h-24 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm resize-none"
                  value={catatanAcara}
                  onChange={(e) => setCatatanAcara(e.target.value)}
                />
              </div>
            </>
          )}

          {opsi === "dinein" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Pilih Nomor Meja</label>
                {loadingMeja ? (
                  <div className="text-sm text-slate-400 p-3 bg-slate-800/80 rounded-xl">Memuat ketersediaan meja...</div>
                ) : (
                  <select 
                    required 
                    className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    value={selectedMeja}
                    onChange={(e) => setSelectedMeja(e.target.value)}
                  >
                    <option value="">-- Pilih Meja Kosong --</option>
                    {mejaList.map((m) => (
                      <option key={m.id_meja} value={m.id_meja}>
                        {m.nomor_meja} — kapasitas {getKapasitasMeja(m)} orang ({m.status_meja})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Jumlah Tamu (sesuai kapasitas meja)</label>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedMeja ? String(getKapasitasMeja(mejaList.find((m) => String(m.id_meja) === selectedMeja) || { id_meja: 0, nomor_meja: "", status_meja: "", kapasitas: 4 })) : "8"}
                  required 
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                  value={jumlahTamu}
                  onChange={(e) => setJumlahTamu(e.target.value)}
                />
              </div>
            </>
          )}

          {opsi === "takeaway" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Jadwal Pengambilan</label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setTakeawayTimeType("sekarang")}
                    className={`p-3 rounded-xl text-sm font-semibold border transition-all ${
                      takeawayTimeType === "sekarang"
                        ? "bg-cyan-500 border-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                    }`}
                  >
                    ⚡ Sekarang (30m)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTakeawayTimeType("jam_tertentu")}
                    className={`p-3 rounded-xl text-sm font-semibold border transition-all ${
                      takeawayTimeType === "jam_tertentu"
                        ? "bg-cyan-500 border-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/20"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
                    }`}
                  >
                    🕒 Jam Tertentu
                  </button>
                </div>
              </div>

              {takeawayTimeType === "jam_tertentu" && (
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Jam Pengambilan</label>
                  <input 
                    type="time" 
                    required 
                    className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    value={takeawayTime}
                    onChange={(e) => setTakeawayTime(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {opsi === "antar" && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Alamat Lengkap</label>
                <textarea 
                  placeholder="Tuliskan nama jalan, nomor rumah, RT/RW, kelurahan..."
                  required
                  className="w-full p-3 h-20 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm resize-none"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Nama Gang / Blok (Opsional)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Gang Dahlia 3 / Blok B4"
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                  value={gang}
                  onChange={(e) => setGang(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Patokan Rumah (Opsional)</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Depan Masjid Al-Ikhlas / Pagar Cat Hijau"
                  className="w-full p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                  value={patokan}
                  onChange={(e) => setPatokan(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Button Submit */}
          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-900 hover:text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] mt-6"
          >
            Lanjutkan ke Katalog Menu →
          </button>
        </form>
      </div>
    </div>
  );
}
