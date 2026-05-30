# CutQuote ⚡

An online platform for laser and plasma cutting quotes. Customers upload DXF files, configure material and thickness, and get instant pricing with a live DXF preview.

## Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite + React Router      |
| Backend   | Node.js + Express                   |
| Parser    | Python 3.12 + Flask + ezdxf         |
| Database  | PostgreSQL 16                       |
| Auth      | JWT (bcrypt passwords)              |
| Storage   | Docker volume (swap for S3 later)   |

## Architecture

```
Browser (React)
    ↕ REST API
Node.js Backend :4000
    ├── Auth     /api/auth
    ├── Files    /api/files      ──→  Python Parser :5001
    ├── Quotes   /api/quotes
    └── Orders   /api/orders
                                      PostgreSQL :5432
```

When a DXF is uploaded:
1. Node saves the raw file and calls the Python parser
2. `ezdxf` extracts all cut entities (lines, arcs, circles, polylines, splines)
3. Parser calculates bounding box, total cut length, hole count, open contours
4. Parser renders an SVG preview and saves it alongside the DXF
5. Parsed metadata is stored in PostgreSQL
6. Frontend displays the SVG inline with pan/zoom

## Quick start

### Prerequisites
- Docker Desktop (or Docker + Docker Compose)

### Run

```bash
git clone <your-repo>
cd cutquote
cp .env.example .env          # edit JWT_SECRET at minimum
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Parser: http://localhost:5001

### First use
1. Open http://localhost:3000
2. Register an account
3. Upload any `.dxf` file
4. Select cutting method, material, thickness, quantity
5. Save quote → place order

## Development (without Docker)

### Backend
```bash
cd backend
npm install
# Set env vars (see .env.example) then:
node src/index.js
```

### Parser
```bash
cd parser
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

## Pricing model

The quote engine (`backend/src/services/pricing.js`) calculates:

- **Material cost** — weight × material price/kg (area × thickness × density)
- **Cutting cost** — machine hourly rate × actual cut time (derived from cut length ÷ speed for material+thickness combo)
- **Setup fee** — fixed €5.00 per job
- **Quantity discount** — 5% for 10+, 10% for 20+, 15% for 50+

Tune the rates in `pricing.js` to match your actual machine costs.

## DXF parsing

The parser handles:
- `LINE`, `CIRCLE`, `ARC`, `LWPOLYLINE`, `POLYLINE`, `SPLINE`, `ELLIPSE`
- Nested inserts (blocks) are processed via ezdxf's virtual entities
- Open contour detection
- Layer-based color coding in SVG preview
- Bounding box from `$EXTMIN`/`$EXTMAX` headers with entity-based fallback

## Production checklist

- [ ] Set a strong `JWT_SECRET`
- [ ] Replace Docker volume with S3/Cloudflare R2 for file storage
- [ ] Add Stripe for payments (quote → checkout session → webhook → order confirmed)
- [ ] Add email notifications (quote saved, order confirmed, status changes)
- [ ] Set up SSL / reverse proxy (Caddy or nginx)
- [ ] Add rate limiting on upload endpoint
- [ ] Add admin panel for order management

## Project structure

```
cutquote/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── sql/
│   │   └── init.sql           # DB schema
│   └── src/
│       ├── index.js            # Express app
│       ├── db.js               # Postgres pool
│       ├── middleware/
│       │   ├── auth.js         # JWT middleware
│       │   └── errorHandler.js
│       ├── routes/
│       │   ├── auth.js         # Register / login
│       │   ├── files.js        # Upload + parse DXF
│       │   ├── quotes.js       # Quote CRUD + pricing
│       │   └── orders.js       # Order management
│       └── services/
│           └── pricing.js      # Quote calculation engine
├── parser/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py                  # Flask + ezdxf
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── lib/api.js           # API client
        ├── hooks/useAuth.jsx    # Auth context
        ├── components/
        │   ├── Layout.jsx
        │   ├── DxfPreview.jsx   # SVG viewer with pan/zoom
        │   └── QuoteConfigurator.jsx
        └── pages/
            ├── LoginPage.jsx
            ├── RegisterPage.jsx
            ├── UploadPage.jsx   # Main upload + quote flow
            ├── QuotesPage.jsx
            └── OrdersPage.jsx
```
