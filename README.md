# HostelMatch 🏢🤝

> **Smart Hostel Allocation and Roommate Matching System**  
> A modular, generic, and configurable full-stack platform built for any college, university, or higher education institution.

---

## 📌 Project Overview

**HostelMatch** is an enterprise-ready platform for student residential accommodations. Instead of being hard-coded for a single institution, it decouples institutional rules, room quotas, and preference criteria into a generic configuration schema.

### Core Architecture & Features
- **Full-Stack Next.js App Router**: Client components, Server Components, and REST Route Handlers.
- **Robust Database Connectivity**: Mongoose with global connection caching for serverless environments.
- **Authentication & Role-Based Access (Phase 2)**:
  - **Jose JWT**: Universal token signing/verification across Node.js & Edge runtimes.
  - **httpOnly Cookies**: Stored in secure `hm_token` cookies (never exposed to `localStorage`).
  - **Role Guards**: Strict separation between `student` and `admin` portals (`requireAuth`, `requireRole`).
  - **Route Protection (`src/proxy.js`)**: Modern Next.js 16+ proxy intercepting unauthorized page accesses.
- **Hostel & Room Management (Phase 3)**:
  - **Hostel Model**: Code uniqueness, gender designations (`boys`, `girls`, `mixed`), floor bounds, academic year eligibility, facilities, and rules.
  - **Room Model**: Compound index `(hostel, roomNumber)`, floor validation, capacity (1-6), types (`AC`, `Non-AC`), occupancy tracking, auto-status pre-save hook.
  - **High-Performance MongoDB Aggregations**: Pre-computed bed totals, occupancy metrics, and per-hostel breakdowns without N+1 query overhead.
  - **Student Eligibility Controls**: Students only see active hostels and safe room information matching their gender and year. Occupant identities and internal admin notes are strictly hidden.
  - **Occupancy Protections**: Rejects hostel gender changes or deletions if rooms are occupied; rejects lowering room capacity below current occupancy.
  - **Bulk Room Creation**: Admin generator creating up to 200 rooms per batch with duplicate skipping and live preview.
  - **Sample Demo Seeding**: Idempotent generator (`npm run seed:hostels`) creating 17 hostels (BH1-BH10, GH1-GH7) and 680 rooms.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router 16.4+) | Full-stack React framework (JavaScript) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) v4 | Modern utility-first CSS design system |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas) + [Mongoose](https://mongoosejs.com/) | Cloud document database with cached connection pooling |
| **Authentication** | [Jose](https://github.com/panva/jose) + [Bcrypt.js](https://github.com/dcodeIO/bcrypt.js) | Universal JWT signing/verifying & password hashing |
| **Data Validation** | [Zod](https://zod.dev/) | Strict request body schema declaration and field errors |
| **HTTP Client** | [Axios](https://axios-http.com/) | Pre-configured API client with baseURL `/api` |
| **Route Protection** | Next.js 16 `src/proxy.js` + Server Layout Guards | Multi-layered role protection for `/dashboard` and `/admin` |

---

## 📁 Folder Structure

```text
hostel-match/
├── scripts/
│   ├── seed-admin.js                 # Admin seeding script (npm run seed:admin)
│   └── seed-hostels.js               # Hostel & room demo generator (npm run seed:hostels)
├── src/
│   ├── app/
│   │   ├── layout.js                 # Root layout with AuthProvider, Navbar & Footer
│   │   ├── page.js                   # Landing hero with live system health diagnostics
│   │   ├── login/page.js             # Authentication login page (role selector tabs)
│   │   ├── register/page.js          # Student registration page
│   │   ├── dashboard/
│   │   │   ├── layout.js             # Student layout guard
│   │   │   ├── page.js               # Student profile & hostel overview
│   │   │   └── hostels/page.js       # Eligible hostels directory & room type availability
│   │   ├── admin/
│   │   │   ├── layout.js             # Administrator layout guard
│   │   │   ├── page.js               # Admin command center with live inventory stats
│   │   │   ├── hostels/
│   │   │   │   ├── page.js           # Hostels directory (filters, occupancy bars, actions)
│   │   │   │   ├── new/page.js       # Create hostel page
│   │   │   │   └── [id]/
│   │   │   │       ├── page.js       # Hostel detail view with rooms grouped by floor
│   │   │   │       └── edit/page.js  # Edit hostel attributes
│   │   │   └── rooms/
│   │   │       └── page.js           # Global rooms table (filters, pagination, modals)
│   │   ├── unauthorized/page.js      # 403 Forbidden page
│   │   ├── not-found.js              # Custom 404 page
│   │   └── api/
│   │       ├── health/route.js       # GET /api/health
│   │       ├── auth/                 # Authentication endpoints (login, register, me, logout)
│   │       ├── admin/stats/route.js  # GET /api/admin/stats (live aggregation totals)
│   │       ├── hostels/
│   │       │   ├── route.js          # GET /api/hostels, POST /api/hostels
│   │       │   └── [id]/route.js     # GET, PUT, DELETE /api/hostels/[id]
│   │       └── rooms/
│   │           ├── route.js          # GET /api/rooms, POST /api/rooms
│   │           ├── bulk/route.js     # POST /api/rooms/bulk (batch room generator)
│   │           └── [id]/route.js     # GET, PUT, DELETE /api/rooms/[id]
│   ├── components/
│   │   ├── Navbar.jsx                # Responsive navigation with role links & auth menu
│   │   ├── Footer.jsx                # Institutional footer
│   │   ├── hostels/
│   │   │   └── HostelForm.jsx        # Shared hostel form (create/edit) with facility tags
│   │   ├── rooms/
│   │   │   ├── RoomModal.jsx         # Single room create/edit modal
│   │   │   └── BulkRoomModal.jsx     # Bulk room creation modal with live preview
│   │   └── ui/
│   │       ├── Input.jsx             # Form input component
│   │       ├── Select.jsx            # Custom select dropdown
│   │       ├── Button.jsx            # Button with loading state
│   │       ├── Badge.jsx             # Color-coded status badge
│   │       ├── Modal.jsx             # Accessible dialog with ESC & backdrop click
│   │       ├── ConfirmDialog.jsx     # Safe action confirmation dialog
│   │       ├── Pagination.jsx        # Page navigation bar
│   │       ├── EmptyState.jsx        # Placeholder for empty query results
│   │       └── Alert.jsx             # Notification banners
│   ├── context/
│   │   └── AuthContext.jsx           # Global auth provider
│   ├── lib/
│   │   ├── db.js                     # Cached Mongoose connection
│   │   ├── auth.js                   # Jose JWT cookie helpers
│   │   ├── apiResponse.js            # Standardized success() & failure() JSON helpers
│   │   └── axios.js                  # Axios client
│   ├── models/
│   │   ├── User.js                   # Student & admin accounts
│   │   ├── Hostel.js                 # Hostel schema & indexes
│   │   └── Room.js                   # Room schema, compound indexes & pre-save status hook
│   ├── services/
│   │   ├── hostelService.js          # Hostel aggregations & business logic
│   │   ├── roomService.js            # Room query filters & bulk creation
│   │   └── statsService.js           # Administrative dashboard aggregation metrics
│   ├── middleware-helpers/
│   │   └── authGuard.js              # requireAuth() & requireRole() helpers
│   └── proxy.js                      # Next.js 16 route protection proxy
```

---

## 🗄️ Data Models

### 1. Hostel Model (`src/models/Hostel.js`)
- `name`: String (required, trimmed, max 100)
- `code`: String (required, unique, uppercase, short, e.g. "BH1")
- `gender`: Enum `["boys", "girls", "mixed"]` (required)
- `location`: String (optional campus area or block)
- `totalFloors`: Number (required, min 1)
- `allowedYears`: Array of Numbers (1-6; empty array allows all years)
- `facilities`: Array of Strings (e.g. Wi-Fi, Laundry, Gym, Mess)
- `rules`: String (optional policies or curfew)
- `isActive`: Boolean (default `true`)
- Indexes: `code` (unique), `(gender, isActive)`

### 2. Room Model (`src/models/Room.js`)
- `hostel`: ObjectId ref `Hostel` (required)
- `roomNumber`: String (required, trimmed)
- `floor`: Number (required, min 0)
- `capacity`: Number (required, min 1, max 6)
- `roomType`: Enum `["AC", "Non-AC"]` (required)
- `currentOccupancy`: Number (default 0, min 0, must never exceed capacity)
- `status`: Enum `["available", "full", "maintenance"]` (default `available`)
- `notes`: String (internal administrator remarks)
- Compound Index: `(hostel, roomNumber)` (unique)
- Pre-Save Hook: Automatically computes `status = "full"` when `currentOccupancy >= capacity`, or `status = "available"`, unless manually set to `"maintenance"`.

---

## 🌐 API Reference

All routes require authentication via `hm_token` cookie. Requests are validated via **Zod** with field-level errors.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/admin/stats` | Admin | Returns system totals and per-hostel breakdown |
| **GET** | `/api/hostels` | All Auth | Filtered hostels with pre-computed room & bed stats (students only see eligible hostels) |
| **POST** | `/api/hostels` | Admin | Creates a new hostel block |
| **GET** | `/api/hostels/[id]` | All Auth | Retrieves hostel details with stats |
| **PUT** | `/api/hostels/[id]` | Admin | Updates hostel attributes (gender locked if occupied) |
| **DELETE**| `/api/hostels/[id]` | Admin | Deletes hostel and its rooms (refuses if occupancy > 0) |
| **GET** | `/api/rooms` | All Auth | Filtered rooms (students only see safe public fields) |
| **POST** | `/api/rooms` | Admin | Creates a single room |
| **POST** | `/api/rooms/bulk` | Admin | Bulk generates up to 200 rooms per batch (skips duplicates) |
| **GET** | `/api/rooms/[id]` | All Auth | Retrieves room details |
| **PUT** | `/api/rooms/[id]` | Admin | Updates room (capacity cannot be lowered below occupancy) |
| **DELETE**| `/api/rooms/[id]` | Admin | Deletes room (refuses if occupancy > 0) |

---

## 🚀 How to Run & Seed

### 1. Seed Initial Admin Account
```bash
npm run seed:admin
```
*(Creates admin `admin@hostelmatch.edu` with password `AdminPassword123!`)*

### 2. Seed Sample Hostels & Rooms
```bash
npm run seed:hostels
```
*(Idempotent demo data generator: creates 10 boys hostels `BH1-BH10` and 7 girls hostels `GH1-GH7` with 4 floors and 10 rooms per floor = 680 rooms. Skips existing codes).*

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🧪 Browser Testing & Verification Steps

1. **Verify Admin Dashboard Metrics**:
   - Log in at `/login` as admin (`admin@hostelmatch.edu` / `AdminPassword123!`).
   - Navigate to `/admin`.
   - Observe live inventory metrics: 17 Hostels, 680 Rooms, Bed counts, and Students Registered.
   - Click the active **Hostels** or **Rooms** cards.

2. **Add & Manage a Hostel**:
   - Navigate to `/admin/hostels`.
   - Click **+ Add Hostel**.
   - Enter name (e.g. `Diamond Jubilee Hall`), code `DJ1`, gender `mixed`, total floors `5`.
   - Select amenities (Wi-Fi, Gym, Study Room) and click **Create Hostel**.
   - Verify the new hostel appears with 0 rooms and 0 beds.

3. **Add Rooms (Single & Bulk)**:
   - On the hostel detail page (`/admin/hostels/[id]`), click **+ Add Rooms in Bulk**.
   - Set Floor `1`, Start Room `101`, Count `10`, Capacity `3`, Room Type `AC`.
   - Observe live preview text: *"This will create rooms 101 to 110 (10 rooms)"*.
   - Click **Generate Rooms**. Verify 10 rooms are created under Floor 1.
   - Click **+ Add Room** to add room `111` individually.

4. **Verify Occupancy & Deletion Guards**:
   - In `/admin/rooms`, edit a room and attempt to delete or edit properties.
   - Rooms or hostels with active occupants cannot be deleted.

5. **Test Student Eligibility View (Gender Isolation)**:
   - Register a **female student** at `/register` (e.g. `priya@university.edu`, gender: `female`).
   - Log in and navigate to `/dashboard/hostels`.
   - Confirm Priya only sees **Girls Hostels (`GH1` to `GH7`)** and any `mixed` hostels. She cannot see Boys Hostels.
   - Open a hostel to verify available room type breakdowns (e.g. 2-bed Non-AC, 3-bed AC).
   - Log out and register a **male student** (e.g. `rahul@university.edu`, gender: `male`).
   - Confirm Rahul only sees **Boys Hostels (`BH1` to `BH10`)** and any `mixed` hostels.
