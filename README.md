
<p align="center">
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node" />
  <img src="https://img.shields.io/badge/mysql-5.7%2B-orange" alt="MySQL" />
</p>

<br />

<p align="center">
  <samp>
    <strong>───── ａｎｉｚｉｌ ─────</strong><br />
    <em>full-stack anime streaming portal</em>
  </samp>
</p>

<p align="center">
  <sub>built with express.js · react · mysql · tailwind</sub>
</p>

<br />

---

**Anizil** is a full-stack anime streaming platform with external API importing, role-based admin panels, XP gamification, premium subscriptions, and community features.

---

## ✦ Features

| | |
|---|---|
| 📺 **Anime Management** | Add, edit, delete anime with episodes & streaming sources |
| 🔌 **External Import** | Import directly from Anikoto API with episodes & embed URLs |
| 👥 **User Roles** | Super Admin · Content Admin · Moderator · User with granular perms |
| 🔐 **Authentication** | Email/password + Google OAuth |
| ⭐ **Premium System** | Premium episodes with access control & XP-based purchases |
| 📋 **Watchlist & History** | Track watched episodes & maintain a personal list |
| 🏆 **Achievements** | Gamified XP & achievement system |
| 💬 **Comments & Reports** | Community moderation tools |
| 🎟️ **Redeem Codes** | Generate & manage premium/XP redeem codes |
| 📊 **Admin Dashboard** | Full analytics, user management, settings & moderation |
| 📱 **Responsive** | Works on desktop & mobile |

---

## ✦ Tech Stack

```
Backend   →  Node.js · Express.js · MySQL (mysql2) · JWT · Passport.js
Frontend  →  React · Vite · Tailwind CSS · Zustand · React Router · Framer Motion
APIs      →  Anikoto API (anime import)
```

---

## ✦ Installation

### Prerequisites

- Node.js 18+
- MySQL 5.7+ or MariaDB
- npm

### Setup

**1. Clone the repository**

```bash
git clone https://github.com/golammostofasadhin/anizil.git
cd anizil
```

**2. Set up the database**

Create a MySQL database named `anizil`, then:

```bash
# Option A — import the full dump
mysql -u root -p anizil < anizil_database.sql

# Option B — run the migration script
cd server
node migrate.js
```

**3. Configure environment**

```bash
cp .env.example server/.env
```

Edit `server/.env`:

```
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=anizil
JWT_SECRET=your_jwt_secret_key
```

**4. Install dependencies**

```bash
cd server && npm install
cd ../client && npm install
```

**5. Run the application**

```bash
# Terminal 1 — Backend
cd server && node index.js

# Terminal 2 — Frontend (dev)
cd client && npm run dev
```

Frontend → `http://localhost:5173` • API → `http://localhost:3001`

---

## ✦ Default Admin

| | |
|---|---|
| **Email** | `admin@anizil.com` |
| **Password** | `admin123` |

---

## ✦ Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web Application)
3. Add redirect URI: `http://localhost:3001/api/auth/google/callback`
4. Set in `server/.env`:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

5. Or configure via **Admin Panel → Settings → OAuth**

---

## ✦ API Routes

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/anime` | List anime (pagination, search, filters) |
| `GET` | `/api/anime/:slug` | Anime details by slug |
| `GET` | `/api/anime/:id/episodes` | Episodes for an anime |
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/auth/register` | User registration |
| `GET` | `/api/auth/google` | Google OAuth login |
| `POST` | `/api/import/anikoto` | Import anime from Anikoto (admin) |
| `GET` | `/api/admin/dashboard` | Admin dashboard stats |
| `PUT` | `/api/admin/users/:id/role` | Change user role (admin) |

> See `API_DOCS.md` for full API documentation.

---

## ✦ Project Structure

```
anizil/
├── client/                      # React frontend
│   ├── src/
│   │   ├── pages/               # Page components
│   │   │   └── admin/           # Admin panel pages
│   │   ├── components/          # Shared components
│   │   │   ├── common/          # AnimeCard, Skeleton, Modal …
│   │   │   └── layout/          # Navbar, Footer, AdminLayout …
│   │   ├── store/               # Zustand state stores
│   │   ├── lib/                 # API client, utilities
│   │   └── hooks/               # Custom React hooks
│   └── vite.config.js
├── server/                      # Express backend
│   ├── routes/                  # API route handlers
│   ├── middleware/               # Auth & admin middleware
│   ├── config/                  # Database config
│   └── utils/                   # Helper functions
├── anizil_database.sql          # Schema & seed data
└── README.md
```

---

<p align="center">
  <sub>built with ❤︎ by <a href="https://github.com/masatoshinn">Masato 真</a></sub>
</p>
