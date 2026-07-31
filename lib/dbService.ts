import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface Menu {
  id_menu: number;
  nama_menu: string;
  harga: number;
  kategori: string;
  stok_status: string;
  image?: string;
  deskripsi?: string;
}

export interface Meja {
  id_meja: number;
  nomor_meja: string;
  status_meja: string; // "kosong" | "terisi"
  kapasitas?: number;
}

export interface CartItem {
  item: Menu;
  quantity: number;
  catatan: string;
}

export interface OrderDetail {
  id_pemesanan: string;
  id_user: string | null;
  opsi_layanan: string;
  status_order: string; // "Menunggu" | "Sedang Dimasak" | "Makanan Sudah Siap"
  total_bayar: number;
  created_at: string;
  items: {
    nama_menu: string;
    harga: number;
    quantity: number;
    catatan: string;
  }[];
  user_nama?: string;
  user_no_wa?: string;
  rating?: number;
  rating_comment?: string;
  extension?: {
    alamat?: string;
    waktu_permintaan?: string;
    id_meja?: number;
    tgl_acara?: string;
  };
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

const LOCAL_FALLBACK_MEJA: Meja[] = [
  { id_meja: 1, nomor_meja: "Meja 1", status_meja: "kosong", kapasitas: 8 },
  { id_meja: 2, nomor_meja: "Meja 2", status_meja: "kosong", kapasitas: 8 },
  { id_meja: 3, nomor_meja: "Meja 3", status_meja: "kosong", kapasitas: 8 },
  { id_meja: 4, nomor_meja: "Meja 4", status_meja: "kosong", kapasitas: 8 },
  { id_meja: 5, nomor_meja: "Meja 5", status_meja: "kosong", kapasitas: 8 },
  { id_meja: 6, nomor_meja: "Meja 6", status_meja: "kosong", kapasitas: 4 },
  { id_meja: 7, nomor_meja: "Meja 7", status_meja: "kosong", kapasitas: 4 },
  { id_meja: 8, nomor_meja: "Meja 8", status_meja: "kosong", kapasitas: 4 },
  { id_meja: 9, nomor_meja: "Meja Luar 1", status_meja: "kosong", kapasitas: 4 },
  { id_meja: 10, nomor_meja: "Meja Luar 2", status_meja: "kosong", kapasitas: 6 }
];

// Helper to determine operational status
export function checkOperationalStatus(): { isOpen: boolean; currentHourWib: number } {
  const currentHourWib = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    hourCycle: "h23"
  }).format(new Date()));
  const isOpen = currentHourWib >= 17 || currentHourWib < 4;
  return { isOpen, currentHourWib };
}

// In-memory/localStorage mock DB helpers
function getMockData<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  const data = localStorage.getItem(key);
  if (!data) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return defaultValue;
  }
}

function setMockData<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizePhoneNumber(value: string): string {
  return value.replace(/[^0-9]/g, "").replace(/^62/, "0");
}

// Service Export
export const dbService = {
  // 1. Get Meja
  async getMejaList(): Promise<Meja[]> {
    try {
      const { data, error } = await supabase
        .from("meja")
        .select("*")
        .order("id_meja", { ascending: true });
      if (error) throw error;
      const existing = data || [];
      // Older databases may not yet contain the two outdoor tables. Keep them visible in the ordering UI.
      return [...existing, ...LOCAL_FALLBACK_MEJA.filter((fallback) => !existing.some((m) => m.id_meja === fallback.id_meja))]
        .map((m) => ({ ...m, kapasitas: m.id_meja <= 5 ? 8 : m.id_meja === 10 ? 6 : 4 }));
    } catch (err) {
      console.warn("dbService: Supabase getMejaList failed, using local storage.", err);
      return getMockData<Meja[]>("seaorder_meja", LOCAL_FALLBACK_MEJA);
    }
  },

  // 2. Get Menu
  async getMenuList(): Promise<Menu[]> {
    try {
      const { data, error } = await supabase
        .from("menu")
        .select("*")
        .order("id_menu", { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn("dbService: Supabase getMenuList failed, using local storage.", err);
      return getMockData<Menu[]>("seaorder_menu", LOCAL_FALLBACK_MENU);
    }
  },

  // 3. Create Order
  async createOrder(
    userName: string,
    userWa: string,
    opsiLayanan: string,
    totalBayar: number,
    items: CartItem[],
    extensionDetails: {
      alamat?: string;
      waktu_permintaan?: string;
      id_meja?: number;
      tgl_acara?: string;
    }
  ): Promise<string> {
    const orderId = Math.floor(100000 + Math.random() * 900000).toString();
    const nowStr = new Date().toISOString();

    const formattedItems = items.map((c) => ({
      nama_menu: c.item.nama_menu,
      harga: c.item.harga,
      quantity: c.quantity,
      catatan: c.catatan
    }));

    try {
      // Create user
      let userId = null;
      try {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .insert({ nama: userName, no_wa: userWa, role: "Pelanggan" })
          .select();
        
        if (!userError && userData && userData.length > 0) {
          userId = userData[0].id_user;
        } else {
          // Find existing
          const { data: existingUser } = await supabase
            .from("users")
            .select("id_user")
            .eq("nama", userName)
            .eq("no_wa", userWa)
            .limit(1);
          if (existingUser && existingUser.length > 0) {
            userId = existingUser[0].id_user;
          }
        }
      } catch (err) {
        console.warn("dbService: Supabase user registration failed, continuing.", err);
      }

      // Create pemesanan
      const { data: orderData, error: orderError } = await supabase
        .from("pemesanan")
        .insert({
          id_pemesanan: orderId,
          id_user: userId,
          opsi_layanan: opsiLayanan,
          status_order: "Menunggu",
          total_bayar: totalBayar
        })
        .select();

      if (orderError) throw orderError;

      // Create ekstensi
      const extData: any = {
        id_pemesanan: orderId,
        ...extensionDetails
      };

      const { error: extError } = await supabase.from("ekstensi").insert(extData);
      // The order itself is already valid. Do not downgrade a cloud order to local-only
      // data merely because optional extension columns have not been migrated yet.
      if (extError) console.warn("dbService: extension save failed", extError);

      // Update table status if Dine-In
      if (opsiLayanan === "dinein" && extensionDetails.id_meja) {
        await this.updateMejaStatus(extensionDetails.id_meja, "terisi");
      }

      // Mirror to local storage so admin/kds local view can see it if they are testing both
      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      localOrders.unshift({
        id_pemesanan: orderId,
        id_user: userId,
        opsi_layanan: opsiLayanan,
        status_order: "Menunggu",
        total_bayar: totalBayar,
        created_at: nowStr,
        items: formattedItems,
        user_nama: userName,
        user_no_wa: userWa,
        extension: extensionDetails
      });
      setMockData("seaorder_orders", localOrders);
      await this.broadcastNewOrder(localOrders[0]);

      return orderId;
    } catch (err) {
      console.warn("dbService: Supabase createOrder failed, placing order locally.", err);

      // With Supabase configured, localStorage would only exist on the customer's phone
      // and can never be seen by the admin device. Surface the failure instead of claiming success.
      if (isSupabaseConfigured) throw err;

      // Local storage fallback order placing
      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      const newOrder: OrderDetail = {
        id_pemesanan: orderId,
        id_user: "mock-user-id",
        opsi_layanan: opsiLayanan,
        status_order: "Menunggu",
        total_bayar: totalBayar,
        created_at: nowStr,
        items: formattedItems,
        user_nama: userName,
        user_no_wa: userWa,
        extension: extensionDetails
      };
      localOrders.unshift(newOrder);
      setMockData("seaorder_orders", localOrders);
      await this.broadcastNewOrder(newOrder);

      // Update local tables status
      if (opsiLayanan === "dinein" && extensionDetails.id_meja) {
        const localMeja = getMockData<Meja[]>("seaorder_meja", LOCAL_FALLBACK_MEJA);
        const updatedMeja = localMeja.map((m) =>
          m.id_meja === extensionDetails.id_meja ? { ...m, status_meja: "terisi" } : m
        );
        setMockData("seaorder_meja", updatedMeja);
      }

      // Save a fast-load reference for this specific order
      sessionStorage.setItem(`mock_order_${orderId}`, JSON.stringify(newOrder));

      return orderId;
    }
  },

  // 4. Get Order Details
  async getOrderDetails(id: string): Promise<OrderDetail | null> {
    try {
      const { data, error } = await supabase
        .from("pemesanan")
        .select("*")
        .eq("id_pemesanan", id)
        .single();
      if (error) throw error;

      const { data: extData } = await supabase
        .from("ekstensi")
        .select("*")
        .eq("id_pemesanan", id)
        .single();

      // Retrieve user details
      let userDetails = { nama: "Pelanggan", no_wa: "" };
      if (data.id_user) {
        const { data: userData } = await supabase
          .from("users")
          .select("nama, no_wa")
          .eq("id_user", data.id_user)
          .single();
        if (userData) {
          userDetails = userData;
        }
      }

      const localOrder = getMockData<OrderDetail[]>("seaorder_orders", []).find((order) => order.id_pemesanan === id);
      return {
        id_pemesanan: data.id_pemesanan,
        id_user: data.id_user,
        opsi_layanan: data.opsi_layanan,
        status_order: data.status_order,
        total_bayar: data.total_bayar || localOrder?.total_bayar || 0,
        created_at: data.created_at,
        items: [], // Since we don't have order items table, we can fetch items from local orders if matched, or return blank
        user_nama: userDetails.nama,
        user_no_wa: userDetails.no_wa,
        extension: extData || undefined
      };
    } catch (err) {
      console.warn("dbService: Supabase getOrderDetails failed, checking local storage.", err);
      // Search in local orders
      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      const found = localOrders.find((o) => o.id_pemesanan === id);
      if (found) return found;

      // Session storage mock order lookup
      const sessionMock = sessionStorage.getItem(`mock_order_${id}`);
      if (sessionMock) {
        try {
          return JSON.parse(sessionMock);
        } catch (e) {}
      }
      return null;
    }
  },

  // 5. Get Active Orders (Admin / KDS)
  async getActiveOrders(): Promise<OrderDetail[]> {
    try {
      const { data, error } = await supabase
        .from("pemesanan")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Hydrate orders with details
      const hydrated: OrderDetail[] = [];
      for (const order of data || []) {
        const { data: extData } = await supabase
          .from("ekstensi")
          .select("*")
          .eq("id_pemesanan", order.id_pemesanan)
          .single();

        let userDetails = { nama: "Pelanggan", no_wa: "" };
        if (order.id_user) {
          const { data: userData } = await supabase
            .from("users")
            .select("nama, no_wa")
            .eq("id_user", order.id_user)
            .single();
          if (userData) userDetails = userData;
        }

        // Try to match items from local storage representation if they exist
        const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
        const matchedLocal = localOrders.find((o) => o.id_pemesanan === order.id_pemesanan);

        hydrated.push({
          id_pemesanan: order.id_pemesanan,
          id_user: order.id_user,
          opsi_layanan: order.opsi_layanan,
          status_order: order.status_order,
          total_bayar: order.total_bayar || matchedLocal?.total_bayar || 0,
          created_at: order.created_at,
          items: matchedLocal ? matchedLocal.items : [],
          user_nama: userDetails.nama,
          user_no_wa: userDetails.no_wa,
          extension: extData || undefined
        });
      }
      return hydrated;
    } catch (err) {
      console.warn("dbService: Supabase getActiveOrders failed, using local storage.", err);
      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      return localOrders;
    }
  },

  // Riwayat dipakai dashboard dan KDS. Pembayaran tetap dicatat kasir secara manual.
  async getOrderHistory(): Promise<OrderDetail[]> {
    try {
      const { data, error } = await supabase
        .from("pemesanan")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      return (data || []).map((order) => {
        const local = localOrders.find((item) => item.id_pemesanan === order.id_pemesanan);
        return {
          id_pemesanan: order.id_pemesanan,
          id_user: order.id_user,
          opsi_layanan: order.opsi_layanan,
          status_order: order.status_order,
          total_bayar: order.total_bayar || local?.total_bayar || 0,
          created_at: order.created_at,
          items: local?.items || [],
          user_nama: local?.user_nama || "Pelanggan",
          user_no_wa: local?.user_no_wa || "",
          extension: local?.extension
        };
      });
    } catch (err) {
      console.warn("dbService: Supabase getOrderHistory failed, using local storage.", err);
      return getMockData<OrderDetail[]>("seaorder_orders", []);
    }
  },

  // Riwayat pelanggan tanpa akun: dicari menggunakan nomor WhatsApp.
  async getOrdersByWhatsApp(phoneNumber: string): Promise<OrderDetail[]> {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
    const localMatches = localOrders.filter(
      (order) => normalizePhoneNumber(order.user_no_wa || "") === normalizedPhone
    );

    try {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id_user, nama, no_wa")
        .eq("no_wa", phoneNumber);
      if (usersError) throw usersError;

      const userIds = (users || []).map((user) => user.id_user);
      if (userIds.length === 0) return localMatches;

      const { data: orders, error: ordersError } = await supabase
        .from("pemesanan")
        .select("*")
        .in("id_user", userIds)
        .order("created_at", { ascending: false });
      if (ordersError) throw ordersError;

      return (orders || []).map((order) => {
        const local = localOrders.find((item) => item.id_pemesanan === order.id_pemesanan);
        const user = (users || []).find((item) => item.id_user === order.id_user);
        return {
          id_pemesanan: order.id_pemesanan,
          id_user: order.id_user,
          opsi_layanan: order.opsi_layanan,
          status_order: order.status_order,
          total_bayar: order.total_bayar || local?.total_bayar || 0,
          created_at: order.created_at,
          items: local?.items || [],
          user_nama: user?.nama || local?.user_nama || "Pelanggan",
          user_no_wa: user?.no_wa || local?.user_no_wa || "",
          extension: local?.extension
        };
      });
    } catch (err) {
      console.warn("dbService: Supabase getOrdersByWhatsApp failed, using local storage.", err);
      return localMatches;
    }
  },

  // 6. Update Order Status
  async updateOrderStatus(id: string, status: string): Promise<boolean> {
    try {
      // First update Supabase
      const { error } = await supabase
        .from("pemesanan")
        .update({ status_order: status })
        .eq("id_pemesanan", id);
      if (error) throw error;

      // Also update local storage mirror
      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      const updatedOrders = localOrders.map((o) => {
        if (o.id_pemesanan === id) {
          const updated = { ...o, status_order: status };
          return updated;
        }
        return o;
      });
      setMockData("seaorder_orders", updatedOrders);
      
      // Update sessionStorage mock reference too
      const sessionMock = sessionStorage.getItem(`mock_order_${id}`);
      if (sessionMock) {
        try {
          const parsed = JSON.parse(sessionMock);
          sessionStorage.setItem(`mock_order_${id}`, JSON.stringify({ ...parsed, status_order: status }));
        } catch (e) {}
      }

      return true;
    } catch (err) {
      console.warn("dbService: Supabase updateOrderStatus failed, updating locally.", err);

      const localOrders = getMockData<OrderDetail[]>("seaorder_orders", []);
      const updatedOrders = localOrders.map((o) => {
        if (o.id_pemesanan === id) {
          const updated = { ...o, status_order: status };
          return updated;
        }
        return o;
      });
      setMockData("seaorder_orders", updatedOrders);

      // Session storage mock order lookup
      const sessionMock = sessionStorage.getItem(`mock_order_${id}`);
      if (sessionMock) {
        try {
          const parsed = JSON.parse(sessionMock);
          sessionStorage.setItem(`mock_order_${id}`, JSON.stringify({ ...parsed, status_order: status }));
        } catch (e) {}
      }

      return true;
    }
  },

  async submitRating(id: string, rating: number, comment: string): Promise<boolean> {
    const saved = { rating, rating_comment: comment };
    try {
      // This is optional until the rating columns are added in Supabase; local data remains functional.
      await supabase.from("pemesanan").update(saved).eq("id_pemesanan", id);
    } catch (err) {
      console.warn("dbService: Supabase submitRating failed, saving locally.", err);
    }
    const orders = getMockData<OrderDetail[]>("seaorder_orders", []).map((o) => o.id_pemesanan === id ? { ...o, ...saved } : o);
    setMockData("seaorder_orders", orders);
    const sessionMock = sessionStorage.getItem(`mock_order_${id}`);
    if (sessionMock) {
      try { sessionStorage.setItem(`mock_order_${id}`, JSON.stringify({ ...JSON.parse(sessionMock), ...saved })); } catch (e) {}
    }
    return true;
  },

  async updateMenu(menu: Menu): Promise<boolean> {
    try {
      const { error } = await supabase.from("menu").update({ nama_menu: menu.nama_menu, harga: menu.harga, kategori: menu.kategori, stok_status: menu.stok_status }).eq("id_menu", menu.id_menu);
      if (error) throw error;
    } catch (err) { console.warn("dbService: Supabase updateMenu failed, saving locally.", err); }
    const menus = getMockData<Menu[]>("seaorder_menu", LOCAL_FALLBACK_MENU).map((m) => m.id_menu === menu.id_menu ? menu : m);
    setMockData("seaorder_menu", menus);
    return true;
  },

  async addMenu(menu: Omit<Menu, "id_menu">): Promise<Menu> {
    const localMenus = getMockData<Menu[]>("seaorder_menu", LOCAL_FALLBACK_MENU);
    const newMenu = { ...menu, id_menu: Math.max(0, ...localMenus.map((m) => m.id_menu)) + 1 };
    try { await supabase.from("menu").insert({ nama_menu: newMenu.nama_menu, harga: newMenu.harga, kategori: newMenu.kategori, stok_status: newMenu.stok_status, image: newMenu.image, deskripsi: newMenu.deskripsi }); }
    catch (err) { console.warn("dbService: Supabase addMenu failed, saving locally.", err); }
    setMockData("seaorder_menu", [...localMenus, newMenu]);
    return newMenu;
  },

  async deleteMenu(idMenu: number): Promise<boolean> {
    try {
      const { error } = await supabase.from("menu").delete().eq("id_menu", idMenu);
      if (error) throw error;
    } catch (err) { console.warn("dbService: Supabase deleteMenu failed, deleting locally.", err); }
    const menus = getMockData<Menu[]>("seaorder_menu", LOCAL_FALLBACK_MENU).filter((menu) => menu.id_menu !== idMenu);
    setMockData("seaorder_menu", menus);
    return true;
  },

  async broadcastNewOrder(order: OrderDetail): Promise<void> {
    try {
      const channel = supabase.channel("admin-order-alerts");
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 1200);
        channel.subscribe((status) => {
          if (status === "SUBSCRIBED") { clearTimeout(timeout); resolve(); }
        });
      });
      await channel.send({ type: "broadcast", event: "new-order", payload: order });
      supabase.removeChannel(channel);
    } catch (err) { console.warn("dbService: order broadcast failed.", err); }
  },

  listenToOrderAlerts(callback: (order: OrderDetail) => void): () => void {
    const channel = supabase.channel("admin-order-alerts").on("broadcast", { event: "new-order" }, ({ payload }: { payload: OrderDetail }) => callback(payload)).subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  // 7. Update Meja Status
  async updateMejaStatus(id_meja: number, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("meja")
        .update({ status_meja: status })
        .eq("id_meja", id_meja);
      if (error) throw error;

      // Update local storage
      const localMeja = getMockData<Meja[]>("seaorder_meja", LOCAL_FALLBACK_MEJA);
      const updated = localMeja.map((m) =>
        m.id_meja === id_meja ? { ...m, status_meja: status } : m
      );
      setMockData("seaorder_meja", updated);
      return true;
    } catch (err) {
      console.warn("dbService: Supabase updateMejaStatus failed, updating locally.", err);
      const localMeja = getMockData<Meja[]>("seaorder_meja", LOCAL_FALLBACK_MEJA);
      const updated = localMeja.map((m) =>
        m.id_meja === id_meja ? { ...m, status_meja: status } : m
      );
      setMockData("seaorder_meja", updated);
      return true;
    }
  },

  // 8. Realtime Listeners
  listenToOrderUpdates(id: string, callback: (order: OrderDetail) => void): () => void {
    let isCancelled = false;

    // Supabase listener
    const channel = supabase
      .channel(`order-updates-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pemesanan",
          filter: `id_pemesanan=eq.${id}`
        },
        async (payload: any) => {
          if (isCancelled) return;
          console.log("dbService: Supabase order update received:", payload);
          const fullOrder = await this.getOrderDetails(id);
          if (fullOrder) callback(fullOrder);
        }
      )
      .subscribe();

    // Local Storage storage event listener (cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (isCancelled) return;
      if (e.key === "seaorder_orders") {
        try {
          const orders = JSON.parse(e.newValue || "[]") as OrderDetail[];
          const matched = orders.find((o) => o.id_pemesanan === id);
          if (matched) callback(matched);
        } catch (err) {
          console.error("dbService: Error parsing storage event data", err);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    // Return unsubscribe function
    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  },

  // 9. Realtime listener for incoming orders (Admin)
  listenToNewOrders(callback: (order: OrderDetail) => void): () => void {
    let isCancelled = false;

    // Supabase channel
    const channel = supabase
      .channel("new-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pemesanan"
        },
        async (payload: any) => {
          if (isCancelled) return;
          console.log("dbService: Supabase new order received:", payload);
          const fullOrder = await this.getOrderDetails(payload.new.id_pemesanan);
          if (fullOrder) callback(fullOrder);
        }
      )
      .subscribe();

    // Local Storage listener
    const handleStorageChange = (e: StorageEvent) => {
      if (isCancelled) return;
      if (e.key === "seaorder_orders") {
        try {
          const newOrders = JSON.parse(e.newValue || "[]") as OrderDetail[];
          const oldOrders = JSON.parse(e.oldValue || "[]") as OrderDetail[];

          // Find newly inserted order (present in new but not in old)
          const newlyAdded = newOrders.filter(
            (n) => !oldOrders.some((o) => o.id_pemesanan === n.id_pemesanan)
          );

          newlyAdded.forEach((order) => callback(order));
        } catch (err) {
          console.error("dbService: Error parsing storage event data for new orders", err);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
    };
  }
};
