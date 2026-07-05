<div align="center">

<!-- Animated header with glassmorphism feel -->
<img src="https://capsule-render.vercel.app/api?type=venom&color=0,08090A,00E6A7&height=200&section=header&text=DataVault&fontSize=80&fontColor=00E6A7&fontAlignY=55&desc=Transform%20Spreadsheets%20Into%20Experiences&descColor=9CA3AF&descSize=18&descAlignY=75&animation=fadeIn" width="100%" />

<br/>

<!-- Live badge row -->
[![LIVE DEMO](https://img.shields.io/badge/🌐_LIVE_DEMO-datavault--gilt.vercel.app-00E6A7?style=for-the-badge&labelColor=08090A)](https://datavault-gilt.vercel.app)
[![API](https://img.shields.io/badge/⚡_API-onrender.com-5BE7FF?style=for-the-badge&labelColor=08090A)](https://datavault-api-3j82.onrender.com/health)
[![GitHub](https://img.shields.io/badge/GitHub-akshayy718-A78BFA?style=for-the-badge&logo=github&labelColor=08090A)](https://github.com/akshayy718/datavault)

<br/>

<!-- Stack badges -->
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)

<br/>

<!-- Test pass badge -->
![Tests](https://img.shields.io/badge/Tests-48%2F48_Passing-00E6A7?style=flat-square&labelColor=08090A)
![Endpoints](https://img.shields.io/badge/API_Endpoints-45-5BE7FF?style=flat-square&labelColor=08090A)
![Screens](https://img.shields.io/badge/Frontend_Screens-6-A78BFA?style=flat-square&labelColor=08090A)

</div>

---

## ✦ What Is DataVault?

DataVault turns a spreadsheet into a **QR-based shareable experience** — without the recipient needing any software, login, or technical knowledge.

Upload a CSV. Select the data you want to share. Generate a QR code. Anyone who scans it sees a premium card on their phone — live or frozen, PIN-protected or open, expiring or permanent.

> *"This is significantly stronger than the average fresh-grad portfolio project. That combination of authentication + file processing + database design + QR generation + analytics + AI + modern stack is uncommon at entry level."*

---

## ✦ The User Flow

```
📂 Upload CSV / Excel
        ↓
🔲 Select rows, columns, cells, or ranges
        ↓
⚙️  Configure share (mode, PIN, expiry, max views)
        ↓
📱 Generate QR code
        ↓
👁️  Recipient scans → sees premium card instantly
```

---

## ✦ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      VERCEL (CDN)                        │
│                                                         │
│   Next.js 14 App Router  ·  TypeScript  ·  Tailwind     │
│   Framer Motion  ·  Server Side Rendering (SSR)         │
│                                                         │
│   /dashboard  /share  /view/[token]  /analytics         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   RENDER (Singapore)                     │
│                                                         │
│   FastAPI 0.115  ·  Uvicorn  ·  SQLAlchemy 2.0          │
│   Alembic  ·  PyJWT  ·  bcrypt  ·  qrcode+Pillow        │
│   GZip Middleware  ·  CORS  ·  Connection Pooling        │
│                                                         │
│   45 API Endpoints  ·  9 Backend Modules                │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│              RENDER PostgreSQL (Singapore)               │
│   Users · Datasets · Shares · Snapshots · Analytics     │
│   6 Alembic Migrations  ·  Full Relational Schema       │
└─────────────────────────────────────────────────────────┘
```

---

## ✦ Features

### 🗄️ Data Layer
| Feature | Details |
|---|---|
| CSV & Excel upload | Parsed server-side, stored as structured rows |
| 5 selection modes | Row, multi-row, column, multi-column, cell, range |
| Snapshot vs Live | Snapshot freezes data; Live fetches fresh on every view |
| Dataset persistence | localStorage restore — no re-upload on navigation |

### 🔐 Auth & Security
| Feature | Details |
|---|---|
| JWT authentication | 24h access token + 7-day refresh token |
| Auto token refresh | 401 responses trigger silent token refresh + retry |
| bcrypt passwords | Industry-standard hashing, never stored in plaintext |
| Workspace isolation | Users can only access their own datasets and shares |

### 📱 Share Options
| Option | What it does |
|---|---|
| PIN protection | Recipients must enter correct PIN to view |
| Expiry date | Share auto-blocks after specified date/time |
| Max views | Share blocks after N views (tested to exact count) |
| Revoke | Owner can instantly kill any share |

### 📊 Analytics
- Total views, active shares, average per share
- Top shares ranked by view count
- Real-time data from backend, not demo numbers

### 🤖 AI Assistant
- Natural language row filter ("show me Engineering team")
- Real duplicate detection from uploaded data
- Suggestion chips computed from actual dataset patterns

---

## ✦ Tech Stack — Full List

### Backend
```
FastAPI 0.115        — API framework, auto-docs, dependency injection
Uvicorn 0.30         — ASGI server
SQLAlchemy 2.0       — ORM, connection pooling, pool_pre_ping
Alembic 1.13         — Database migrations (6 migration files)
PostgreSQL           — Production database (SQLite for dev)
bcrypt 4.2           — Password hashing
PyJWT 2.9            — JWT token signing and verification
qrcode + Pillow 8.0  — QR code PNG generation
openpyxl 3.1         — Excel file parsing
cryptography 43.0    — Fernet encryption for BYOK AI keys
GZipMiddleware       — 60-70% response compression
python-multipart     — File upload handling
pydantic 2.9         — Request/response validation
```

### Frontend
```
Next.js 14.2     — React framework, App Router, SSR
TypeScript 5.5   — Type safety across all components
Tailwind CSS 3.4 — Utility-first styling
Framer Motion    — Page and component animations
Lucide React     — Icon library
clsx + tw-merge  — Conditional class merging
```

### Infrastructure
```
Vercel   — Frontend deployment, global CDN, SSR functions
Render   — Backend deployment, Singapore region
UptimeRobot — Health monitoring, 5-min ping interval
GitHub   — Version control, auto-deploy triggers
```

---

## ✦ Real Bugs Found and Fixed

> These weren't hypothetical — every one of these was discovered during real development and testing.

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | CORS blocked all requests | No CORSMiddleware on FastAPI | Added middleware with explicit origins |
| 2 | Session expired in 15 minutes | JWT expiry too short in config.py | Extended to 24h + added auto-refresh in api.ts |
| 3 | Column selection showed only names | Frontend sent `cols[0]` (first column only) | Frontend now sends full `columns: [...]` array |
| 4 | Multi-row share showed only first person | Recipient page did `items[0]` always | Complete rewrite: kind=single vs kind=multi rendering |
| 5 | QR download opened fullscreen, no back button | Cross-origin `<a download>` restriction | Blob download via fetch + createObjectURL |
| 6 | Upload lost on browser back navigation | State lived only in React memory | usePersistedDataset hook with localStorage + restore |
| 7 | Selection spec mismatch — shares failed | Frontend spec didn't match backend contract | Verified exact spec formats from backend source |
| 8 | PIN screen froze on mobile | React useState re-rendering on every keypress | Replaced with useRef (uncontrolled input) |
| 9 | Phone took 25-30s to load recipient page | Mobile Safari throttles JS fetch requests | Converted to SSR — Vercel server fetches, not phone |
| 10 | Groq API key exposed in git history | .env committed before .gitignore set up | Removed via git filter-branch, key rotated |

---

## ✦ Test Results

```
══════════════════════════════════════════════════
  DataVault — Automated Test Suite
══════════════════════════════════════════════════

[1] AUTH
  ✓ Register new account
  ✓ Duplicate email blocked
  ✓ Login correct password
  ✓ Login wrong password blocked
  ✓ /auth/me session restore
  ✓ Token refresh

[2] UPLOAD
  ✓ CSV upload
  ✓ Row count correct
  ✓ Column count correct
  ✓ Row restore path (localStorage persistence)

[3] SELECTIONS + SHARES
  ✓ Create — Single row         | kind=single n=1
  ✓ Create — Multiple rows      | kind=multi  n=3
  ✓ Create — Single column      | kind=multi  n=9
  ✓ Create — Multiple columns   | kind=multi  n=9
  ✓ Multi-column has all fields
  ✓ Create — Cell               | kind=single n=1
  ✓ Create — Range              | kind=multi  n=3

[4] SHARE OPTIONS
  ✓ PIN share created
  ✓ PIN blocks access (401)
  ✓ Wrong PIN rejected (401)
  ✓ Correct PIN unlocks (200)
  ✓ Max views=2 created
  ✓ View 1 of 2 — allowed
  ✓ View 2 of 2 — allowed
  ✓ View 3 of 2 — blocked (410)
  ✓ Expired share blocked (410)
  ✓ Live mode viewable + mode=live

[5] QR CODE
  ✓ QR PNG accessible via HTTP
  ✓ File is a real PNG (magic bytes verified)

[6] ANALYTICS
  ✓ Workspace analytics 200 OK
  ✓ Has total_shares
  ✓ Has total_views
  ✓ Has top_shares

[7] REVOKE
  ✓ Viewable before revoke
  ✓ Revoke returns 200
  ✓ Blocked after revoke (410)

[8] SEARCH
  ✓ Search returns 200
  ✓ Finds datasets
  ✓ Finds shares

[9] SECURITY
  ✓ Cross-user dataset blocked (403)
  ✓ Search workspace-isolated

══════════════════════════════════════════════════
  RESULTS: 48 PASSED  |  0 FAILED  |  48 TOTAL
══════════════════════════════════════════════════
```

---

## ✦ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git

### Backend
```bash
cd apps/api

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and fill environment variables
cp ../../.env.example ../../.env

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

### Frontend
```bash
cd apps/web

# Install dependencies
npm install

# Create local env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables (Backend)
```env
DATABASE_URL=sqlite:///./datavault_dev.db   # or PostgreSQL URL
JWT_SECRET=your-random-secret-here
AI_PROVIDER_API_KEY=your-groq-key           # from console.groq.com
RECIPIENT_APP_BASE_URL=http://localhost:3000 # or your Vercel URL
APP_ENV=development
```

---

## ✦ Project Structure

```
datavault/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/           # Config, security, crypto
│   │   │   ├── db/             # SQLAlchemy session + engine
│   │   │   ├── models/         # Database table definitions
│   │   │   ├── routes/         # API endpoint handlers
│   │   │   ├── schemas/        # Pydantic request/response models
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── auth_service.py
│   │   │   │   ├── dataset_service.py
│   │   │   │   ├── share_service.py
│   │   │   │   ├── selection.py       ← all 5 selection types
│   │   │   │   ├── qr_service.py
│   │   │   │   ├── analytics_service.py
│   │   │   │   └── ai_service.py
│   │   │   └── main.py
│   │   ├── migrations/         # 6 Alembic migration files
│   │   └── requirements.txt
│   └── web/                    # Next.js 14 frontend
│       ├── app/
│       │   ├── auth/           # Login, register, forgot
│       │   ├── dashboard/      # Upload + selection table
│       │   ├── share/          # Share configurator
│       │   ├── view/[token]/   # Recipient card (SSR)
│       │   ├── analytics/      # Analytics dashboard
│       │   └── api/unlock/     # Vercel proxy for PIN unlock
│       ├── components/
│       │   ├── upload/         # DropZone, DataPreview, AIPanel
│       │   ├── share/          # QRPanel, ShareOptionsPanel
│       │   └── layout/         # Navbar, Toast
│       └── hooks/              # useAuth, useFlow, usePersistedDataset
└── infra/seed-data/            # Demo CSV files
```

---

## ✦ What's Pending

| Item | Status | Notes |
|---|---|---|
| Forgot password email | UI done, no email | Needs SendGrid or similar |
| Google OAuth | Backend endpoint exists | OAuth credentials not configured |
| AI features UI | Backend complete | No frontend UI yet for dashboard gen, cleanup |
| Export buttons | Backend complete | CSV/PDF/PNG export endpoints work, no frontend buttons |
| Template builder UI | Backend complete | Full CRUD API, no frontend screen |

---

## 🧑‍💻 Author

**Akshay Santhosh** — AI/ML Engineer · SAP BTP Developer · Full Stack

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Akshay_Santhosh-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/akshay-santhosh)
[![GitHub](https://img.shields.io/badge/GitHub-akshayy718-000000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/akshayy718)
[![Gmail](https://img.shields.io/badge/Gmail-akshaysanthosh718-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:akshaysanthosh718@gmail.com)
[![Portfolio](https://img.shields.io/badge/Portfolio-akshay--portfolio-00E6A7?style=for-the-badge&labelColor=08090A)](https://akshay-portfolio-site-vert.vercel.app)

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0,00E6A7,5BE7FF&height=100&section=footer" width="100%" />

*Built with ❤️ using FastAPI · SQLAlchemy · Next.js 14 · TypeScript · Tailwind CSS · Framer Motion · Groq AI · PostgreSQL · Vercel · Render*

</div>
