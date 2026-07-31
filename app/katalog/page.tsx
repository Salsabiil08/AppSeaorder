"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { dbService } from "@/lib/dbService";

interface Menu {
  id_menu: number;
  nama_menu: string;
  harga: number;
  kategori: string;
  stok_status: string;
  image?: string;
  deskripsi?: string;
}

interface CartItem {
  item: Menu;
  quantity: number;
  catatan: string;
}

const LOCAL_FALLBACK_MENU: Menu[] = [
  {
    id_menu: 1,
    nama_menu: "Ayam Asam Manis",
    harga: 25000,
    kategori: "Makanan",
    stok_status: "tersedia",
    image: "/AyamAsamManis.png",
    deskripsi: "Ayam krispi disiram saus asam manis spesial dengan bombay dan nanas segar."
  },
  {
    id_menu: 2,
    nama_menu: "Bebek Bakar",
    harga: 28000,
    kategori: "Makanan",
    stok_status: "tersedia",
    image: "/Bebek Bakar.png",
    deskripsi: "Bebek gurih dibakar dengan bumbu kecap manis pedas meresap, disajikan dengan lalapan."
  },
  {
    id_menu: 3,
    nama_menu: "Cah Kangkung",
    harga: 12000,
    kategori: "Makanan",
    stok_status: "tersedia",
    image: "/CahKangkung.png",
    deskripsi: "Kangkung segar ditumis cepat dengan bumbu bawang putih dan tauco gurih."
  },
  {
    id_menu: 4,
    nama_menu: "Cumi Krispy",
    harga: 30000,
    kategori: "Makanan",
    stok_status: "tersedia",
    image: "/Cumi Krispy.png",
    deskripsi: "Cumi segar digoreng tepung krispi keemasan, disajikan dengan saus sambal cocol."
  },
  {
    id_menu: 5,
    nama_menu: "Lele Goreng",
    harga: 18000,
    kategori: "Makanan",
    stok_status: "tersedia",
    image: "/LeleGoreng.png",
    deskripsi: "Ikan lele goreng garing gurih khas Lamongan, disajikan dengan sambal terasi segar."
  },
  {
    id_menu: 6,
    nama_menu: "Es Jeruk Peras",
    harga: 8000,
    kategori: "Minuman",
    stok_status: "tersedia",
    image: "/EsJeruk.webp",
    deskripsi: "Perasan jeruk manis asli segar dingin dengan es batu."
  },
  {
    id_menu: 7,
    nama_menu: "Es Teh Manis",
    harga: 5000,
    kategori: "Minuman",
    stok_status: "tersedia",
    image: "/EsTeh.png",
    deskripsi: "Seduhan teh wangi melati dengan kemanisan pas, disajikan dingin."
  }
];

export default function KatalogPage() {
  const [isAllowed, setIsAllowed] = useState(false);
  const [menu, setMenu] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  // User details from session
  const [userName, setUserName] = useState("");
  const [userWa, setUserWa] = useState("");
  const [selectedOpsi, setSelectedOpsi] = useState("");
  const [opsiDetails, setOpsiDetails] = useState("");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKategori, setSelectedKategori] = useState("Semua");
  const [sortBy, setSortBy] = useState("default");

  // Cart state
  const [cart, setCart] = useState<{ [key: number]: CartItem }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    const nama = sessionStorage.getItem("user_nama");
    const wa = sessionStorage.getItem("user_wa");
    const valid = sessionStorage.getItem("form_data_valid");
    const opsi = sessionStorage.getItem("selected_opsi");

    if (!nama || !wa || !valid || !opsi) {
      router.push("/");
    } else {
      setIsAllowed(true);
      setUserName(nama);
      setUserWa(wa);
      setSelectedOpsi(opsi);
      
      // Load service details for UI display
      let details = "";
      if (opsi === "acara") {
        details = `Booking Acara (${sessionStorage.getItem("form_tgl_acara")})`;
      } else if (opsi === "dinein") {
        details = `Dine-In (Meja ${sessionStorage.getItem("form_meja_id")})`;
      } else if (opsi === "takeaway") {
        details = `Take-Away (${sessionStorage.getItem("form_takeaway_time")})`;
      } else if (opsi === "antar") {
        details = `Antar ke: ${sessionStorage.getItem("form_alamat")?.substring(0, 15)}...`;
      }
      setOpsiDetails(details);

      // Load cart if exists
      const savedCart = sessionStorage.getItem("seaorder_cart");
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Gagal load keranjang", e);
        }
      }

      fetchMenu();
    }
  }, [router]);

  const mapMenuImageAndDesc = (item: any) => {
    const name = item.nama_menu.toLowerCase();
    let image = item.image || "/favicon.ico";
    let deskripsi = item.deskripsi || "Sajian lezat dan segar khas Warung Seafood & Lalapan Lamongan Jaya Asli.";

    // Use an image added by admin; infer an existing local asset only when no image is saved.
    if (item.image) return { ...item, image, deskripsi };
    if (name.includes("teh")) {
      image = "/EsTeh.png";
    } else if (name.includes("jeruk")) {
      image = "/EsJeruk.webp";
    } else if (name.includes("ayam") || name.includes("asam")) {
      image = "/AyamAsamManis.png";
    } else if (name.includes("bebek")) {
      image = "/Bebek Bakar.png";
    } else if (name.includes("kangkung") || name.includes("cah")) {
      image = "/CahKangkung.png";
    } else if (name.includes("cumi")) {
      image = "/Cumi Krispy.png";
    } else if (name.includes("lele")) {
      image = "/LeleGoreng.png";
    }
    
    return {
      ...item,
      image,
      deskripsi
    };
  };

  async function fetchMenu() {
    try {
      const data = await dbService.getMenuList();
      if (data && data.length > 0) {
        const enrichedData = data.map(mapMenuImageAndDesc);
        setMenu(enrichedData);
      } else {
        // Fallback to local high-quality mock data if database table is empty
        setMenu(LOCAL_FALLBACK_MENU);
      }
    } catch (error) {
      console.error("Error fetching menu, using local fallback:", error);
      setMenu(LOCAL_FALLBACK_MENU);
    } finally {
      setLoading(false);
    }
  }

  // Show customized toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Cart operations
  const saveCartToSession = (newCart: { [key: number]: CartItem }) => {
    sessionStorage.setItem("seaorder_cart", JSON.stringify(newCart));
  };

  const addToCart = (item: Menu) => {
    if (item.stok_status !== "tersedia") {
      triggerToast("Maaf, menu ini sedang tidak tersedia.");
      return;
    }

    setCart((prev) => {
      const existing = prev[item.id_menu];
      const newCart = {
        ...prev,
        [item.id_menu]: {
          item,
          quantity: existing ? existing.quantity + 1 : 1,
          catatan: existing ? existing.catatan : ""
        }
      };
      saveCartToSession(newCart);
      return newCart;
    });
    triggerToast(`Ditambahkan: ${item.nama_menu}`);
  };

  const updateQuantity = (id_menu: number, change: number) => {
    setCart((prev) => {
      const existing = prev[id_menu];
      if (!existing) return prev;

      const newQty = existing.quantity + change;
      let newCart = { ...prev };

      if (newQty <= 0) {
        delete newCart[id_menu];
      } else {
        newCart[id_menu] = {
          ...existing,
          quantity: newQty
        };
      }
      saveCartToSession(newCart);
      return newCart;
    });
  };

  const updateCatatan = (id_menu: number, catatan: string) => {
    setCart((prev) => {
      const existing = prev[id_menu];
      if (!existing) return prev;

      const newCart = {
        ...prev,
        [id_menu]: {
          ...existing,
          catatan
        }
      };
      saveCartToSession(newCart);
      return newCart;
    });
  };

  // Calculate cart metrics
  const cartItemsArray = Object.values(cart);
  const totalItemsCount = cartItemsArray.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cartItemsArray.reduce((acc, curr) => acc + curr.item.harga * curr.quantity, 0);
  const grandTotal = cartSubtotal;

  // Checkout handling
  const handleCheckout = async () => {
    if (cartItemsArray.length === 0) return;
    setCheckoutLoading(true);

    try {
      // Build extension details
      const extensionDetails: any = {};

      if (selectedOpsi === "acara") {
        extensionDetails.tgl_acara = sessionStorage.getItem("form_tgl_acara");
        extensionDetails.waktu_permintaan = sessionStorage.getItem("form_waktu_acara");
        extensionDetails.alamat = sessionStorage.getItem("form_catatan") || "";
      } else if (selectedOpsi === "dinein") {
        extensionDetails.id_meja = parseInt(sessionStorage.getItem("form_meja_id") || "0", 10);
      } else if (selectedOpsi === "takeaway") {
        extensionDetails.waktu_permintaan = sessionStorage.getItem("form_takeaway_time");
      } else if (selectedOpsi === "antar") {
        const mainAlamat = sessionStorage.getItem("form_alamat") || "";
        const gangBlock = sessionStorage.getItem("form_gang") || "";
        const patokanStr = sessionStorage.getItem("form_patokan") || "";
        extensionDetails.alamat = `${mainAlamat}. Gang/Blok: ${gangBlock}. Patokan: ${patokanStr}`;
      }

      // Call database service
      const orderId = await dbService.createOrder(
        userName,
        userWa,
        selectedOpsi,
        grandTotal,
        cartItemsArray,
        extensionDetails
      );

      // Close the drawer first; retain the cart until navigation completes so totals never flash to zero.
      setIsCartOpen(false);
      triggerToast("Pemesanan sukses! Mengalihkan...");
      setTimeout(() => {
        setCart({});
        sessionStorage.removeItem("seaorder_cart");
        router.push(`/tracking/${orderId}`);
      }, 1500);

    } catch (e) {
      console.error(e);
      triggerToast("Pesanan belum tersimpan. Periksa koneksi lalu coba lagi.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Filtered & Sorted Menu list
  const filteredMenu = menu
    .filter((item) => {
      const matchSearch = item.nama_menu.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedKategori === "Semua" || item.kategori === selectedKategori;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.harga - b.harga;
      if (sortBy === "price-desc") return b.harga - a.harga;
      if (sortBy === "alpha-asc") return a.nama_menu.localeCompare(b.nama_menu);
      if (sortBy === "alpha-desc") return b.nama_menu.localeCompare(a.nama_menu);
      return 0; // default
    });

  if (!isAllowed) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Memverifikasi akses katalog...</div>;
  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Memuat hidangan laut spesial untukmu...</div>;

  return (
    <div className="oceanic-shell min-h-screen bg-[#f7f9fb] text-[#001e3c] font-sans pb-24 selection:bg-blue-100">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg bg-[#002b5b] text-white font-bold shadow-lg flex items-center gap-2 animate-bounce">
          <span className="inline-block h-2 w-2 rounded-full bg-[#1db954]"></span> {toastMessage}
        </div>
      )}

      {/* Hero Header */}
      <header className="relative bg-[#002b5b] py-7 px-6 border-b border-blue-950 shadow-sm overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                SeaOrder
              </h1>
            </div>
            <p className="text-xs text-blue-100 font-medium">Warung Seafood & Lalapan "Lamongan Jaya Asli"</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Service Chip */}
            <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[#1db954]"></span> {opsiDetails}
            </div>
            {/* Ubah Layanan button */}
            <button 
              onClick={() => router.push("/form-detail")}
              className="px-3 py-2 rounded-lg text-xs font-bold bg-white/10 border border-white/30 text-white hover:bg-white/20 transition-all"
            >
              Ubah Detail
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="catalog-content max-w-5xl mx-auto px-4 md:px-6 py-8">
        
        {/* Search, Filter, Sort Controls */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Category selection */}
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 scrollbar-none">
              {["Semua", "Makanan", "Minuman"].map((kat) => (
                <button
                  key={kat}
                  onClick={() => setSelectedKategori(kat)}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold border transition-all whitespace-nowrap ${
                    selectedKategori === kat
                      ? "bg-cyan-500 border-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20 scale-[1.03]"
                      : "bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {kat}
                </button>
              ))}
            </div>

            {/* Sorting */}
            <div className="w-full sm:w-auto flex items-center gap-2 bg-slate-900/60 border border-white/10 px-3 py-2 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Urutkan:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer"
              >
                <option value="default" className="bg-white text-[#001e3c]">Rekomendasi</option>
                <option value="price-asc" className="bg-white text-[#001e3c]">Harga Terendah</option>
                <option value="price-desc" className="bg-white text-[#001e3c]">Harga Tertinggi</option>
                <option value="alpha-asc" className="bg-white text-[#001e3c]">Nama A - Z</option>
                <option value="alpha-desc" className="bg-white text-[#001e3c]">Nama Z - A</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 pointer-events-none"><SearchIcon /></span>
            <input
              type="text"
              placeholder="Cari hidangan favoritmu..."
              className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-slate-900/40 border border-white/10 placeholder-slate-500 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-4 flex items-center text-xs font-bold text-slate-400 hover:text-white"
              >
                Batal
              </button>
            )}
          </div>
        </div>

        {/* Menu Grid */}
        {filteredMenu.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 border border-white/5 rounded-3xl">
            <p className="text-sm font-bold text-[#002b5b] mb-4">Tidak ada menu</p>
            <h3 className="font-bold text-slate-300 mb-1">Menu tidak ditemukan</h3>
            <p className="text-xs text-slate-500">Coba kata kunci lain atau pilih kategori yang berbeda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredMenu.map((item) => {
              const qty = cart[item.id_menu]?.quantity || 0;
              return (
                <div 
                  key={item.id_menu}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#002b5b] hover:shadow-md flex gap-4"
                >
                  <div className="w-2/5 shrink-0">
                    {/* Image Container */}
                    <div className="relative h-full min-h-36 w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                      {/* Image element */}
                      <img 
                        src={item.image || "/favicon.ico"} 
                        alt={item.nama_menu}
                        className="object-contain w-full h-full group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      
                      {/* Availability badge */}
                      {item.stok_status !== "tersedia" ? (
                        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center">
                          <span className="bg-rose-500 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                            Habis
                          </span>
                        </div>
                      ) : (
                        item.harga >= 28000 && (
                          <span className="absolute top-2.5 right-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide">
                            Best Seller
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-[#001e3c] mb-1 text-base">{item.nama_menu}</h3>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.deskripsi}</p>
                    </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                    <span className="text-[#002b5b] font-extrabold text-base">
                      Rp {item.harga.toLocaleString("id-ID")}
                    </span>

                    {item.stok_status === "tersedia" ? (
                      qty > 0 ? (
                        <div className="flex items-center gap-2.5 bg-cyan-500 text-slate-950 rounded-xl p-1 shadow-md">
                          <button 
                            onClick={() => updateQuantity(item.id_menu, -1)}
                            className="w-7 h-7 rounded-lg hover:bg-cyan-400 font-bold text-sm flex items-center justify-center transition-colors active:scale-90"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-xs px-1 min-w-[12px] text-center">{qty}</span>
                          <button 
                            onClick={() => updateQuantity(item.id_menu, 1)}
                            className="w-7 h-7 rounded-lg hover:bg-cyan-400 font-bold text-sm flex items-center justify-center transition-colors active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(item)}
                          className="border border-[#002b5b] text-[#002b5b] hover:bg-[#002b5b] hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95"
                        >
                          + Tambah
                        </button>
                      )
                    ) : (
                      <span className="text-[10px] text-slate-500 font-semibold italic">Tidak Tersedia</span>
                    )}
                  </div></div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar for Cart Summary */}
      {totalItemsCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 md:max-w-xl md:mx-auto z-40 animate-slideUp">
          <button 
            onClick={() => {
              const savedCart = sessionStorage.getItem("seaorder_cart");
              if (savedCart) { try { setCart(JSON.parse(savedCart)); } catch (e) {} }
              setIsCartOpen(true);
            }}
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 px-6 py-4.5 rounded-2xl font-bold shadow-2xl flex items-center justify-between border border-cyan-200 hover:border-cyan-100 transition-all hover:scale-[1.01] active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3">
              <span className="bg-slate-950 text-cyan-300 text-xs font-extrabold px-3 py-1 rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                {totalItemsCount} Porsi
              </span>
              <span className="text-sm font-semibold">Lihat Keranjang Belanja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs opacity-75">Total:</span>
              <span className="text-base font-extrabold">Rp {grandTotal.toLocaleString("id-ID")}</span>
              <CartIcon />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center animate-fadeIn">
          <div className="max-w-md w-full bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-6 shadow-2xl max-h-[90vh] flex flex-col justify-between animate-slideUp">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <CartIcon /> Detail Pesanan
                </h2>
                <p className="text-[10px] text-slate-400">{opsiDetails}</p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-slate-400 hover:text-white text-sm font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Drawer Content - Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {cartItemsArray.map(({ item, quantity, catatan }) => (
                <div key={item.id_menu} className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-semibold text-sm text-slate-200">{item.nama_menu}</h4>
                      <p className="text-xs text-cyan-300 font-bold">
                        Rp {item.harga.toLocaleString("id-ID")}
                      </p>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2 bg-slate-905 border border-white/10 rounded-xl p-0.5">
                      <button 
                        onClick={() => updateQuantity(item.id_menu, -1)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-xs text-slate-200 px-1 min-w-[12px] text-center">
                        {quantity}
                      </span>
                      <button 
                        onClick={() => updateQuantity(item.id_menu, 1)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Add Notes */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Catatan porsi (contoh: pedas manis, ga pake kol)"
                      className="w-full bg-slate-900/60 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-slate-300 placeholder-slate-650 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      value={catatan}
                      onChange={(e) => updateCatatan(item.id_menu, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer - Totals & Submit */}
            <div className="border-t border-white/5 pt-4 mt-4 space-y-4">
              {/* Calculations */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span>Rp {cartSubtotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-slate-100 font-bold text-sm pt-1.5 border-t border-dashed border-white/5">
                  <span>Total Bayar</span>
                  <span className="text-cyan-300">Rp {grandTotal.toLocaleString("id-ID")}</span>
                </div>
              </div>

              {selectedOpsi === "antar" && (
                <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
                  Pembayaran dilakukan kepada driver saat pesanan tiba.
                </p>
              )}

              {/* Submit Button */}
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 py-3.5 rounded-2xl font-extrabold shadow-xl text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {checkoutLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-950" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Memproses Pesanan...
                  </>
                ) : (
                  <>Konfirmasi Pemesanan</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><path d="M3 4h2l2 11h10l2-8H7" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="19" r="1"/><circle cx="17" cy="19" r="1"/></svg>;
}
function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4" strokeLinecap="round"/></svg>; }
