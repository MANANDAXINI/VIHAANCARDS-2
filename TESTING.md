# PIXEL DIGITAL — Complete Testing Guide

## Prerequisites

1. **PostgreSQL** running with database `pixel_digital`
2. **Backend** running on `http://localhost:4000`
3. **Frontend** running on `http://localhost:3000`
4. **Firebase Console** — Google Sign-In enabled under Authentication → Sign-in method

### Start servers

```bash
# Terminal 1 — Backend
cd backend
npm install
npx prisma db push
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

---

## Flow Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Register   │ ──► │ Admin Approve│ ──► │   Login     │ ──► │ Place Order  │
│ (or Google) │     │   Account    │     │ Phone/Google│     │ + Artwork    │
└─────────────┘     └──────────────┘     └─────────────┘     └──────┬───────┘
                                                                     │
                    ┌──────────────┐     ┌─────────────┐            ▼
                    │   Dispatch   │ ◄── │ Admin Print │ ◄── ┌──────────────┐
                    │  (LR number) │     │   Process   │     │ Pay / Credit │
                    └──────────────┘     └─────────────┘     └──────────────┘
```

---

## Part 1 — Customer Registration & Login

### Option A: Mobile Registration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `http://localhost:3000/register` | Registration form loads |
| 2 | Fill name, business, mobile, password | Form validates |
| 3 | Click **Submit Registration** | Success message: "Admin will approve..." |
| 4 | Go to `/#login` | Login section visible |

### Option B: Google Sign-In (new user)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `http://localhost:3000/#login` | Google button visible |
| 2 | Click **Continue with Google** | Google popup opens |
| 3 | Select Google account | Account auto-created (PENDING) |
| 4 | See message | "Admin approval required before ordering" |

### Login (after admin approval)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Use mobile + password OR Google button | Redirects to `/order` |
| 2 | Header shows business name | Logged-in state |

**Default admin:** not needed for customer login.

---

## Part 2 — Admin Panel

Open `http://localhost:3000/admin`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login: `admin` / `1234` | Admin dashboard loads |
| 2 | Tab: **Accounts & Wallet** | Three sections visible |

### 2a — Approve Account

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Find user in **Pending Account Approvals** | Shows name, business, phone |
| 2 | Click **Approve** | User moves to approved list |
| 3 | Select customer in **Credit Settings** dropdown | Form populates |
| 4 | Set Credit Limit e.g. `50000` | Saved |
| 5 | Set Previous Outstanding e.g. `0` | Saved |
| 6 | Click **Save Credit Settings** | Success message |

### 2b — Approve Wallet Payment

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Customer submits payment at `/payment` | Request appears in **Wallet Payment Requests** |
| 2 | Click **Approve** | Balance credited; order auto-created if order payment |
| 3 | Click **Reject** | Request rejected |

### 2c — Process Orders

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab: **Order Processing** | All orders listed |
| 2 | Click **Print** | Status → IN_PRINTING |
| 3 | Click **Dispatch** | Enter LR number, transport, date |
| 4 | Click artwork **Download** link | File opens from backend `/uploads/` |

### 2d — Customer Ledger

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Tab: **Customer Ledger** | Customer dropdown |
| 2 | Select customer | Balance, outstanding, credit shown |
| 3 | View ledger table | Debits (orders) and credits (payments) |

---

## Part 3 — Place an Order (Customer)

Login as approved customer → `http://localhost:3000/order`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | See wallet stats (balance, credit, outstanding) | Top stat cards |
| 2 | Step 1: Select paper GSM e.g. **90 art** | Chips highlight |
| 3 | Step 2: Choose size, quantity, printing side | Price in summary updates |
| 4 | Step 3: Upload artwork file (PDF/JPG) | File selected |
| 5 | Click **Place Order** | Two outcomes below |

### Outcome A — Sufficient Credit

- Order created with number `PD-00001`
- Redirects to `/account` with order in history

### Outcome B — Insufficient Credit

- Redirects to `/payment?type=shortfall`
- Pay shortfall amount → admin approves → order created

---

## Part 4 — Payment Flow

`http://localhost:3000/payment`

| Type | URL | When |
|------|-----|------|
| Wallet top-up | `/payment` | Add balance anytime |
| Shortfall | `/payment?type=shortfall` | Auto-redirect from order |
| Outstanding | `/payment?type=outstanding` | Pay old balance |

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter amount | Preview updates |
| 2 | Click **Submit Payment Request** | "Send screenshot to 7507543214" |
| 3 | Admin approves in panel | Balance updated in customer account |

---

## Part 5 — Account & History

`http://localhost:3000/account`

| Section | What to verify |
|---------|----------------|
| Profile | Edit name, business, phone — click Save |
| Orders | Order #, status, payment, LR number |
| Ledger | Debits, credits, receipt numbers |

---

## Part 6 — Full End-to-End Test Script

Run this once from scratch:

```
1. Register customer (mobile: 9876543210, password: test1234)
2. Admin → Approve account → Set credit limit 100000
3. Customer login → /order
4. Select: 90 art, 8.5 X 5.5, 1000, Single Side (Rs. 600)
5. Upload a test PDF → Place Order
6. Check /account — order PD-00001 appears
7. Admin → Order Processing → Print → Dispatch (LR: TEST123)
8. Customer /account — LR number shows
9. Customer /payment — submit Rs. 5000 wallet top-up
10. Admin → Approve wallet request
11. Customer /account — balance increased, ledger entry added
```

---

## Firebase Setup Checklist

In [Firebase Console](https://console.firebase.google.com) → project `pixeldigital-644fc`:

- [ ] **Authentication** → Sign-in method → Google → **Enabled**
- [ ] **Authentication** → Settings → Authorized domains → add `localhost`
- [ ] **Analytics** → already configured via env vars

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Hydration error in console | Fixed — refresh page; should not recur |
| Google sign-in fails | Enable Google in Firebase Console; check authorized domains |
| "Account pending approval" | Admin must approve at `/admin` |
| Order fails 402 | Insufficient credit — pay via `/payment` |
| Backend connection error | Ensure `npm run dev` in backend; check `NEXT_PUBLIC_API_URL` |
| Database error | Run `npx prisma db push` in backend folder |

---

## URLs Quick Reference

| URL | Purpose |
|-----|---------|
| `/` | Home + login |
| `/register` | New account |
| `/order` | Place leaflet order |
| `/payment` | UPI wallet payments |
| `/account` | Profile + history + ledger |
| `/admin` | Admin panel (admin / 1234) |
