# PIXEL DIGITAL — Full-Stack Rebuild

Modern rebuild of the **PIXEL DIGITAL** B2B printing portal using:

| Layer | Stack |
|-------|-------|
| Frontend | **Next.js** (App Router, JavaScript) |
| Backend | **Node.js** + **Express.js** |
| Database | **PostgreSQL** |
| ORM | **Prisma** |

The original static HTML site is preserved in `mujhe-1-website-banani-hai-jo/`. This rebuild keeps the same business flow with a cleaner, more intuitive UI.

## User Flow

```
Guest → Register → Admin approves → Login
  → Configure leaflet order + upload artwork
  → Pay via UPI (wallet / credit / shortfall)
  → Admin verifies payment → Order gets PD-00001 number
  → Admin processes printing → Dispatch with LR details
  → Customer views ledger & order history
```

## Project Structure

```
├── backend/          Express API + Prisma + PostgreSQL
├── frontend/         Next.js customer & admin UI
└── mujhe-1-website-banani-hai-jo/   Original static site (reference)
```

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted instance)

## Setup

### 1. Database

Create a PostgreSQL database:

```sql
CREATE DATABASE pixel_digital;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and secrets

npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

API runs at **http://localhost:4000**

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local

npm install
npm run dev
```

App runs at **http://localhost:3000**

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PORT` | API port (default 4000) |
| `JWT_SECRET` | Secret for admin JWT tokens |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD` | Admin login password |
| `FRONTEND_URL` | Next.js URL for CORS |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase Analytics measurement ID |

Firebase Analytics tracks page views and key events (login, sign up, orders, payments).

## Features

### Customer Portal
- Marketing homepage with services & product catalog
- Registration with admin approval
- Member login / logout
- Leaflet/pamphlet ordering with live pricing
- Artwork upload
- Credit limit check with shortfall redirect to payment
- UPI wallet top-up, outstanding & order payments
- Account profile, order history & ledger

### Admin Panel (`/admin`)
- Secure JWT admin login
- Approve pending accounts
- Approve/reject wallet payment requests
- Set credit limits & outstanding amounts
- Record manual payments
- Process orders (print, dispatch)
- Download artwork
- Customer ledger view

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register account |
| POST | `/api/auth/login` | Customer login |
| GET | `/api/auth/me` | Current user |
| PUT | `/api/auth/account` | Update profile |
| GET | `/api/orders/my-orders` | Customer orders |
| POST | `/api/orders` | Create order (multipart) |
| POST | `/api/wallet/wallet-request` | Submit payment request |
| GET | `/api/wallet/ledger` | Customer ledger |
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/accounts/pending` | Pending accounts |
| PUT | `/api/admin/accounts/:id/approve` | Approve account |
| GET | `/api/admin/wallet-requests` | All wallet requests |
| PUT | `/api/admin/wallet-requests/:id/approve` | Approve payment |
| GET | `/api/admin/orders` | All orders |
| PUT | `/api/admin/orders/:id/dispatch` | Dispatch order |

## Default Admin Credentials

- Username: `admin`
- Password: `1234`

Change these in `backend/.env` before production.

## Notes

- Add your UPI QR image at `frontend/public/payment-qr.jpeg`
- Artwork files are stored in `backend/uploads/`
- Original pricing table from the legacy site is preserved in `frontend/src/lib/pricing.js`
