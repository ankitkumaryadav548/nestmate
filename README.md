# HostelMatch 🏢🤝

> **Smart Hostel Allocation and Roommate Matching System**  
> A modular, generic, and configurable full-stack platform built for any college, university, or higher education institution.

---

## 📌 Project Overview

**HostelMatch** is an enterprise-ready foundation for managing student residential accommodations. Instead of being hard-coded for a single institution, it decouples institutional rules, room quotas, and preference criteria into a generic configuration schema.

### Core Foundation Features (Phase 1)
- **Unified Full-Stack Architecture**: Next.js App Router with React client components and server-side Route Handlers.
- **Robust Database Connectivity**: Mongoose with global connection caching for serverless environments and hot-reloading.
- **Resilient Health Check (`/api/health`)**: Non-crashing system diagnostics endpoint returning structured JSON reporting backend and MongoDB connection status.
- **Consistent API Utilities**: Standardized response helpers (`lib/apiResponse.js`) and preconfigured Axios instance (`lib/axios.js`).
- **Responsive Modern UI**: Built with Tailwind CSS, featuring an Indigo/Blue primary palette, dynamic health check card, mobile menu drawer, and custom 404 page.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | Latest stable full-stack React framework (JavaScript) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Modern utility-first CSS design system |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose](https://mongoosejs.com/) | Cloud document database with cached connection pooling |
| **Data Validation** | [Zod](https://zod.dev/) | TypeScript-first schema declaration and validation |
| **HTTP Client** | [Axios](https://axios-http.com/) | Pre-configured API client with baseURL `/api` |
| **Security & Auth** | `bcryptjs`, `jsonwebtoken` | Password hashing and JWT generation (foundation ready) |
| **Future Enhancements** | `recharts`, Google Gemini API | Analytics dashboard & AI-driven roommate compatibility |

---

## 📁 Folder Structure

The project strictly follows the requested modular layout:

```text
hostel-match/
├── src/
│   ├── app/
│   │   ├── layout.js              # Root layout with responsive Navbar, Footer & SEO metadata
│   │   ├── page.js                # Modern Hero section with live /api/health diagnostic card
│   │   ├── not-found.js           # Custom 404 page matching design system
│   │   ├── globals.css            # Base stylesheet with Tailwind CSS
│   │   └── api/
│   │       └── health/
│   │           └── route.js       # GET /api/health endpoint (connects to DB, returns JSON)
│   ├── components/
│   │   ├── Navbar.jsx             # Responsive navigation bar with mobile drawer
│   │   └── Footer.jsx             # Institutional branding and stack summary
│   ├── lib/
│   │   ├── db.js                  # Cached Mongoose connection handler
│   │   ├── apiResponse.js         # success() and failure() JSON response helpers
│   │   └── axios.js               # Axios instance preconfigured with baseURL "/api"
│   ├── models/                    # (Empty for now - Mongoose schemas for Hostels, Rooms, Users)
│   ├── services/                  # (Empty for now - Matching algorithms and allocation logic)
│   └── middleware-helpers/        # (Empty for now - Auth guards and role verification)
├── .env.example                   # Template environment variables
├── .env.local                     # Local environment file (with placeholders for your Atlas URI)
├── .gitignore                     # Ignores node_modules, .next, .env* (keeps .env.example)
└── README.md                      # Complete setup & developer documentation
```

---

## ⚙️ Environment Configuration

The repository includes both `.env.example` and `.env.local`.

1. Open `.env.local` inside the `hostel-match` directory.
2. Replace the placeholder for `MONGODB_URI` with your actual MongoDB Atlas connection string:

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.your-subdomain.mongodb.net/hostelmatch?retryWrites=true&w=majority

# JWT Authentication Secrets
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_for_security
JWT_EXPIRES_IN=7d

# Application Configuration
NEXT_PUBLIC_APP_NAME=HostelMatch

# Google Gemini API Key (Server-side only; leave empty for Phase 1)
GEMINI_API_KEY=
```

> **Note:** If you run the application before pasting your MongoDB Atlas URI, the system will **never crash**. The health diagnostics will simply report `database: "disconnected"` with a helpful tip.

---

## 🚀 How to Run the Project

### 1. Navigate to the project directory:
```bash
cd hostel-match
```

### 2. Dependencies (already installed):
If installing in a fresh clone:
```bash
npm install
```

### 3. Start the development server:
```bash
npm run dev
```

The application will be live at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 How to Confirm Everything Works

1. **Open your browser and navigate to**: `http://localhost:3000`
   - You should see the **HostelMatch** hero header: *"Smart hostel allocation and roommate matching"*.
   - The **System Diagnostics** card will automatically fetch `/api/health` on load.
   - It will display:
     - 🟢 **Backend connected** (HTTP 200 OK)
     - MongoDB Database status:
       - 🟢 **connected** (if your valid Atlas URI is pasted into `.env.local`)
       - 🟡 **disconnected** (if using placeholder URI, with a tip explaining how to connect)
     - A **Refresh** button allowing you to re-ping the endpoint anytime.

2. **Test the REST Health API directly in your browser or curl**:
   - Visit: `http://localhost:3000/api/health`
   - Expected JSON format:
     ```json
     {
       "success": true,
       "message": "HostelMatch API running",
       "database": "connected",
       "time": "2026-10-22T16:45:00.000Z"
     }
     ```

3. **Test the custom 404 page**:
   - Visit any non-existent route, e.g., `http://localhost:3000/random-page`
   - You will see the custom styled 404 page with the *"Return to Home"* button.

4. **Test the responsive Navbar**:
   - Resize the browser window or inspect in mobile emulation to verify the mobile hamburger menu opens and closes seamlessly.
