# PIXEL DIGITAL — Simple Guide

## What is this website?

A printing order website for businesses (printers, ad agencies).

- **Customer** = places print orders, pays money, tracks orders
- **Admin** = approves customers, confirms payments, dispatches orders

---

## Pages (only 5!)

| Page | URL | Who uses it |
|------|-----|-------------|
| Home + Login | `/` | Everyone |
| Register | `/register` | New customers |
| Place Order | `/order` | Approved customers |
| Payment | `/payment` | Customers adding money |
| My Account | `/account` | Customers |
| Admin Panel | `/admin` | Admin only |

---

## Customer Flow (easy)

```
Register → Wait for admin approval → Login → Place Order → Pay → Track in My Account
```

### Step by step

1. **Register** at `/register` (mobile + password OR Google)
2. **Wait** — admin must approve you first
3. **Login** at `/` — mobile + password OR Google
4. **Order** at `/order` — pick paper, size, upload file
5. **Pay** if needed at `/payment` — UPI pay, submit amount, send screenshot to **7507543214**
6. **Check** `/account` — see your orders and balance

---

## Admin Flow (easy)

**Same login page as customers!** No separate admin login screen.

### Admin login — 2 ways

| Method | How |
|--------|-----|
| Mobile | Phone: `9999999999` / Password: `1234` |
| Google | Use Google account with email set in `ADMIN_EMAIL` (default: `admin@pixeldigital.com`) |

After login → automatically goes to `/admin`

### Admin does 3 things

```
1. Approve new users
2. Approve payment requests  
3. Dispatch orders (enter LR number)
```

---

## Start the app

```bash
# Terminal 1
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev

# Terminal 2
cd frontend
npm run dev
```

Open: **http://localhost:3000**

---

## Quick test (5 minutes)

| # | Do this | Who |
|---|---------|-----|
| 1 | Register with mobile `9876543210` | Customer |
| 2 | Login as admin `9999999999` / `1234` | Admin |
| 3 | Admin → Approve the customer | Admin |
| 4 | Customer login → Place order | Customer |
| 5 | Admin → see order → Dispatch | Admin |
| 6 | Customer → My Account → see order | Customer |

---

## Account table — role field

Every user in database has a `role`:

| Role | Meaning |
|------|---------|
| `CUSTOMER` | Normal business user |
| `ADMIN` | Can access admin panel |

Also has `status`: `PENDING` (waiting) or `APPROVED` (can order).

---

## Admin login at /admin

Go to **http://localhost:3000/admin** — login form is ON that page.

| Method | Details |
|--------|---------|
| Mobile | `9999999999` / `1234` |
| Google | Your email must match `ADMIN_EMAIL` in backend `.env` |

**Important:** If you are logged in as a customer, logout first, then login as admin.

**First time setup** — create admin in database:
```bash
cd backend
npx prisma db push
npm run db:seed
```

---

## Where do paper types & prices come from?

Copied from the **original site** in this folder:

```
mujhe-1-website-banani-hai-jo/order.js  →  rateRows array (lines 36-82)
```

Now lives in:

```
frontend/src/lib/pricing.js  →  rateRows + paperGsmOptions
```

Example prices (Leaflet / Pamphlet):
- 90 art, 8.5×5.5, 1000, Single Side = **Rs. 600**
- 90 art, 8.5×11, 1000, Single Side = **Rs. 1150**
- 90 art, 8.5×11, 10000, Front Back = **Rs. 8900**

When customer picks paper + size + qty on `/order`, price is looked up from this list automatically.

---

## Need help?

Call / WhatsApp payment screenshots: **7507543214**
