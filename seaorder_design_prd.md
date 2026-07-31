# Design PRD: SeaOrder "Oceanic Elegance"

## 1. Brand Identity & Visual Language

### 1.1 Visual Direction
The design follows the **"Oceanic Elegance"** theme, moving away from "AI-generated" looks and excessive emojis to a high-end, professional restaurant aesthetic. It balances luxury with operational clarity.

### 1.2 Color Palette
*   **Primary (Deep Ocean Blue):** `#002b5b` - Used for primary actions, headers, and branding to evoke trust and premium quality.
*   **Secondary (Emerald Green):** `#1db954` (or similar brand green) - Specifically reserved for WhatsApp-related actions and active status indicators.
*   **Surface:** `#f7f9fb` - A soft, cool white for page backgrounds to reduce eye strain and look modern.
*   **Surface Container:** `#ffffff` - Pure white for cards and elevated elements to create depth.
*   **Text (High Emphasis):** `#001e3c` - Deep blue-black for headings and body text for maximum readability.

### 1.3 Typography
*   **Primary Font:** Montserrat
*   **Weights:** 
    *   Bold (700): Headings and primary buttons.
    *   Medium (500): Sub-navigation and card titles.
    *   Regular (400): Body copy and descriptions.
*   **Style:** Clean, geometric sans-serif to maintain a professional, corporate-yet-welcoming feel.

### 1.4 Shape & Geometry
*   **Corner Radius:** `8px` to `12px` (Soft rounded corners) for cards and buttons.
*   **Spacing System:** 4px/8px grid to ensure consistent alignment.

---

## 2. Brand Assets

### 2.1 Logo Definition
*   **Concept:** Minimalist wave or nautilus icon combined with "SeaOrder" wordmark.
*   **Execution:** Solid vector (SVG) for scalability.
*   **Color:** Primary Deep Ocean Blue or White (on dark backgrounds).

### 2.2 Iconography Style
*   **Style:** Outlined/Linear icons with consistent stroke weights.
*   **Constraint:** Zero emojis. Use functional icons (e.g., utensil icon for dining, shopping bag for take-away, clock for history).

---

## 3. Product Architecture (Alur Web)

### 3.1 User Flow (Customer)
1.  **Entry:** No "Profile" required. Customers directly see the **Service Selection (Pilih Layanan)**.
2.  **Order Info:** Simplified input — only requires **Name** and **Phone Number**.
3.  **Service Options:**
    *   **Makan di Tempat:** Table selection.
    *   **Reservasi Meja:** Redirects to WhatsApp.
    *   **Take-Away:** Quick pick-up.
    *   **Pesan Antar:** Home delivery.
4.  **Tracking:** **Riwayat Pesanan** shows local statuses:
    *   `Menunggu` (Waiting)
    *   `Sedang Dimasak` (Cooking)
    *   `Makanan Sudah Siap` (Ready)
5.  **Payment:** **Manual / At Cashier**. No digital payment gateway, no taxes, no service fees displayed in the total.

### 3.2 Stakeholder Flow (Internal)
1.  **Access:** WhatsApp button in the main header for quick contact. Login for Admin/Kitchen is integrated into the home screen/footer for easy access.
2.  **Dashboard Admin:**
    *   Real-time performance metrics (Revenue, Active Guests, Ratings).
    *   **Menu Availability:** Toggle menu items to "Sold Out/Kosong" directly.
    *   Operational monitoring for Kitchen and Delivery.

---

## 4. Technical Specifications
*   **Device:** Mobile-First Responsive Website.
*   **Navigation:** Bottom Tab Bar (Layanan, Riwayat) + Header Action (WhatsApp).
*   **Framework Compatibility:** Design system tokens mapped to Tailwind CSS/CSS Variables for easy implementation.
