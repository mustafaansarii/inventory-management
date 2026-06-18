# Inventory & Order Management System

A production-ready, fully containerized full-stack application for managing products, customers, orders, and inventory.

- **Frontend:** React (JavaScript) + Vite + Tailwind CSS
- **Backend:** Python + Flask (REST API)
- **Database:** PostgreSQL
- **Containerization:** Docker + Docker Compose

```
assignment/
├── backend/            # Flask API
├── frontend/           # React + Vite + Tailwind SPA
├── docker-compose.yml  # Orchestrates frontend + backend + postgres
└── .env.example        # Root env vars for docker-compose
```

## Features

- **Products** — create, list, view, update, delete. Unique SKU, non-negative price/stock.
- **Customers** — create, list, view, delete. Unique email.
- **Orders** — create (multi-line), list, view details, cancel. Auto-calculated totals,
  inventory checks, automatic stock decrement on order and restock on cancel.
- **Dashboard** — totals for products/customers/orders and a low-stock report.
- Responsive UI, form validation, and clear success/error messaging throughout.

## Quick start with Docker Compose (recommended)

This is the only command you need. It starts the database, backend, and frontend.

```bash
cp .env.example .env          # then edit credentials in .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432 (data persisted in the `postgres_data` named volume)

Tables are created automatically on first backend startup.

## Local development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Point at a running Postgres, or set the parts individually:
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory
flask --app wsgi run --port 8000        # or: python wsgi.py
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env        # set VITE_API_URL=http://localhost:8000
npm run dev                 # http://localhost:5173
```

## API reference

Base URL: `http://localhost:8000`

### Products
| Method | Path             | Description           |
|--------|------------------|-----------------------|
| POST   | `/products`      | Create a product      |
| GET    | `/products`      | List all products     |
| GET    | `/products/{id}` | Get a product         |
| PUT    | `/products/{id}` | Update a product      |
| DELETE | `/products/{id}` | Delete a product      |

```jsonc
// POST /products
{ "name": "Widget", "sku": "WID-001", "price": 9.99, "quantity": 100 }
```

### Customers
| Method | Path              | Description        |
|--------|-------------------|--------------------|
| POST   | `/customers`      | Create a customer  |
| GET    | `/customers`      | List all customers |
| GET    | `/customers/{id}` | Get a customer     |
| DELETE | `/customers/{id}` | Delete a customer  |

```jsonc
// POST /customers
{ "full_name": "Jane Doe", "email": "jane@example.com", "phone": "+1 555 0100" }
```

### Orders
| Method | Path           | Description              |
|--------|----------------|--------------------------|
| POST   | `/orders`      | Create an order          |
| GET    | `/orders`      | List all orders          |
| GET    | `/orders/{id}` | Get order details        |
| DELETE | `/orders/{id}` | Cancel/delete an order   |

```jsonc
// POST /orders  — total is calculated by the backend
{
  "customer_id": 1,
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ]
}
```

### Dashboard
| Method | Path                  | Description                  |
|--------|-----------------------|------------------------------|
| GET    | `/dashboard/summary`  | Totals + low-stock products  |
| GET    | `/health`             | Health check                 |

## Business rules

- Product SKU and customer email are unique (`409 Conflict` on duplicates).
- Product quantity and price can never be negative (DB-level check constraints + validation).
- Orders are rejected if any product has insufficient stock (`409 Conflict`).
- Creating an order automatically reduces stock; cancelling an order restores it.
- The order total is computed server-side from current product prices.
- All endpoints validate input (`422` on bad data) and return appropriate HTTP status codes.

## Environment variables

### Root / docker-compose (`.env`)
| Variable            | Description                                   |
|---------------------|-----------------------------------------------|
| `POSTGRES_USER`     | Postgres username                             |
| `POSTGRES_PASSWORD` | Postgres password                             |
| `POSTGRES_DB`       | Database name                                 |
| `CORS_ORIGINS`      | Allowed origins (`*` or comma-separated list) |
| `VITE_API_URL`      | Backend URL baked into the frontend build     |

### Backend
Accepts either a full `DATABASE_URL` (preferred in cloud hosting) **or** the individual
`POSTGRES_*` parts. A `postgres://` URL is normalized to `postgresql://` automatically.

### Frontend
| Variable       | Description                          |
|----------------|--------------------------------------|
| `VITE_API_URL` | Base URL of the backend API          |

## Deployment

### Backend → Render (Docker)
1. Push this repo to GitHub.
2. On Render, **New → Blueprint** and point it at the repo. The included
   [`backend/render.yaml`](backend/render.yaml) provisions a free Postgres database and a
   Docker web service, wiring `DATABASE_URL` automatically.
3. Set `CORS_ORIGINS` to your deployed frontend URL.
4. Note the public backend URL (e.g. `https://inventory-backend.onrender.com`).

> Railway / Fly.io work too — build the `backend/Dockerfile` and set `DATABASE_URL` + `CORS_ORIGINS`.

### Frontend → Vercel or Netlify
1. Import the repo and set the project root to `frontend/`.
2. Build command `npm run build`, output directory `dist`.
3. Add env var `VITE_API_URL` = your deployed backend URL.
4. SPA routing is preconfigured via [`frontend/vercel.json`](frontend/vercel.json) /
   [`frontend/netlify.toml`](frontend/netlify.toml).

### Docker Hub (backend image)
```bash
cd backend
docker build -t <your-dockerhub-username>/inventory-backend:latest .
docker push <your-dockerhub-username>/inventory-backend:latest
```

## Docker notes

- Slim/lightweight base images: `python:3.12-slim`, `node:20-alpine` build + `nginx:1.27-alpine` serve.
- Backend runs under gunicorn as a non-root user.
- No credentials are hardcoded — everything comes from environment variables.
- PostgreSQL persists to the named volume `postgres_data`.
