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
- **Hostel & Room Management (Phase 2 - Part 1)**:
  - **Hostel Model**: Code uniqueness, gender designations (`boys`, `girls`, `mixed`), floor bounds, academic year eligibility, facilities, and rules.
  - **Room Model**: Compound index `(hostel, roomNumber)`, floor validation, capacity (1-6), types (`AC`, `Non-AC`), occupancy tracking, auto-status pre-save hook.
  - **High-Performance MongoDB Aggregations**: Pre-computed bed totals, occupancy metrics, and per-hostel breakdowns without N+1 query overhead.
  - **Student Eligibility Controls**: Students only see active hostels and safe room information matching their gender and year. Occupant identities and internal admin notes are strictly hidden.
  - **Occupancy Protections**: Rejects hostel gender changes or deletions if rooms are occupied; rejects lowering room capacity below current occupancy.
  - **Bulk Room Creation**: Admin generator creating up to 200 rooms per batch with duplicate skipping and live preview.
  - **Sample Demo Seeding**: Idempotent generator (`npm run seed:hostels`) creating 17 hostels (BH1-BH10, GH1-GH7) and 680 rooms.
- **Student Profile & Lifestyle Questionnaire (Phase 2 - Part 2)**:
  - **Central Questionnaire Config (`src/config/questionnaire.js`)**: Single source of truth for questions, allowed options, deal-breakers, language list, and step definitions.
  - **Substance-Free Policy**: Smoking and alcohol questions are strictly omitted across the entire system.
  - **Strict Privacy Guarantee**: A student's profile and questionnaire answers are completely private. No student can inspect another student's answers; only the student and verified administrators have access.
  - **Inclusivity & Non-Discrimination**: Regional origin and cultural comfort are self-declared, optional, and never used to rank, penalize, or segregate students.
  - **StudentProfile Model**: Manages academic details, home state, home country (default "India"), international status, IANA time zone, and expected arrival date.
  - **Preference Model**: Stores answers for sleep schedule, study time, late-night calls, cleanliness (1-5), noise tolerance (1-5), social level (1-5), AC choice, diet, sharing tolerance, languages, and strict deal-breakers.
  - **Student Portal**: Interactive profile form (`/dashboard/profile`) with inline validation and dynamic international fields; 4-step questionnaire wizard (`/dashboard/preferences`) with progress bar, option cards, scale buttons, language tags, and review summary.
  - **Admin Directory (`/admin/students`)**: Aggregated table with instant search, multi-filter dropdowns, pagination, status badges, and active/inactive toggle with confirmation modal.
  - **Student Detail View (`/admin/students/[id]`)**: Full read-only view with human-readable labels instead of raw enum keys and highlighted deal-breakers.
  - **Demo Student Seeder (`scripts/seed-students.js`)**: Idempotent generation of 300 realistic students (`npm run seed:students`) with demographic variety and `--reset` cleanup flag.


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

### 3. User Model (`src/models/User.js`)
- `name`: String (required, max 100)
- `email`: String (required, unique, lowercase)
- `password`: String (required, hashed via bcrypt, hidden by default)
- `role`: Enum `["student", "admin"]` (default `student`)
- `gender`: Enum `["male", "female", "other"]` (required for students)
- `registrationNumber`: String (sparse, unique)
- `phone`: String (contact mobile number)
- `course`: String (degree program)
- `department`: String (academic department)
- `year`: Number (1 to 6)
- `isActive`: Boolean (default `true`)
- `isDemo`: Boolean (default `false`, indexed; separates test students from genuine enrollments)

### 4. StudentProfile Model (`src/models/StudentProfile.js`)
- `user`: ObjectId ref `User` (required, unique, index)
- `homeCountry`: String (default `"India"`)
- `homeState`: String (state or province)
- `isInternational`: Boolean (default `false`, index)
- `homeTimeZone`: String (IANA format, e.g. `"Africa/Kampala"`, `"Asia/Kolkata"`)
- `arrivalDate`: Date (expected campus arrival date)
- `emergencyContactName`: String (optional)
- `emergencyContactPhone`: String (optional)
- `profileCompletedAt`: Date or null (set when all required academic & origin fields are filled)

### 5. Preference Model (`src/models/Preference.js`)
- `student`: ObjectId ref `User` (required, unique, index)
- `sleepSchedule`: Enum `["early", "normal", "late"]`
- `studyTime`: Enum `["morning", "daytime", "night", "flexible"]`
- `nightCalls`: Enum `["never", "sometimes", "often"]`
- `cleanliness`: Number (1 to 5)
- `noiseTolerance`: Number (1 to 5)
- `socialLevel`: Number (1 to 5)
- `acPreference`: Enum `["ac", "non-ac", "no-preference"]`
- `foodType`: Enum `["veg", "non-veg", "eggetarian", "halal", "jain"]`
- `okWithDifferentFood`: Boolean (dietary sharing tolerance)
- `languages`: Array of Strings (multi-select with custom addition support)
- `culturalComfort`: Enum `["open-to-all", "prefer-similar-background", "no-preference"]` (optional, self-declared)
- `dealBreakers`: Array of Enums `["food", "lateNightNoise", "visitors", "cleanliness", "acType"]`
- `completedAt`: Date or null (stamped when all mandatory lifestyle questions are answered)
- `version`: Number (default 1)
### 6. MatchingSettings Model (`src/models/MatchingSettings.js`)
- `weights`: Object containing configurable weights across 7 lifestyle dimensions (summing to 100):
  - `sleepSchedule` (20%), `studyTime` (20%), `cleanliness` (15%), `noiseTolerance` (15%), `foodType` (10%), `socialLevel` (10%), `languageAndCalls` (10%)
- `yearBonus`: `{ sameYear: 5, oneYearApart: 2, otherwise: 0 }` (bonus points, final score capped at 100)
- `updatedBy`: ObjectId ref `User`

---

## 🧮 Roommate Matching Engine & Formula (Phase 3)

### 1. Fairness & Privacy Rules
- **Pure Lifestyle Criteria**: Matching is strictly computed from voluntary lifestyle habits (sleep, study, tidiness, sound, food, guests, spoken languages).
- **Non-Discrimination Policy**: Nationality, home country, home state, race, or ethnicity are **NEVER** factored into scoring or candidate filtering.
- **Strict Privacy**: Students cannot inspect peers' raw questionnaire answers; they only receive high-level affinity percentages, top friendly reasons, and common languages.
- **Strict Gender Isolation**: Candidates are only evaluated within their exact gender pool (`male` with `male`, `female` with `female`, `other` with `other`).
- **Mutual Deal-Breakers**: If either student's deal-breaker is violated, the pair is immediately excluded (`excluded: true`, score: 0).

### 2. Category Similarity Matrices
- **Sleep Schedule (20%)**: `same = 1.0`, `early/normal = 0.5`, `normal/late = 0.5`, `early/late = 0.0`
- **Study Time (20%)**: `same = 1.0`, `flexible with any = 0.75`, `morning/daytime = 0.5`, `daytime/night = 0.5`, `morning/night = 0.0`
- **Cleanliness (15%)**: `1 - (|ratingA - ratingB| / 4)`
- **Noise Tolerance (15%)**: `1 - (|ratingA - ratingB| / 4)`
- **Food Type (10%)**: `same = 1.0`, specific pairs (`veg/jain = 0.7`, `veg/eggetarian = 0.7`, `non-veg/eggetarian = 0.7`, `non-veg/halal = 0.8`), other pairs use `okWithDifferentFood` rule (both ok = 0.6, one ok = 0.3, neither = 0.0)
- **Social / Guest Level (10%)**: `1 - (|ratingA - ratingB| / 4)`
- **Languages & Night Calls (10%)**: `60% * (sharedLanguages >= 1 ? 1 : 0) + 40% * nightCallsSimilarity`

### 3. Deal-Breaker Exclusions
- `food`: Roommate must have identical `foodType`.
- `lateNightNoise`: Roommate's `nightCalls` must not be `"often"`.
- `visitors`: Roommate's `socialLevel` must be `< 4` (1, 2, or 3).
- `cleanliness`: Roommate's `cleanliness` must be `>= 3`.
- `acType`: If AC preference is not `"no-preference"`, roommate's AC preference must match or be `"no-preference"`.

---

## 🌐 API Reference

All routes require authentication via `hm_token` cookie. Requests are validated via **Zod** with field-level errors.

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/matches/me` | Student | Evaluates and returns paginated top roommate matches for the authenticated student |
| **GET** | `/api/matches/with/[userId]` | Student | Detailed mutual compatibility breakdown with a specific candidate peer |
| **GET** | `/api/admin/matching/settings` | Admin | Retrieves current matching algorithm weights and year bonus points |
| **PUT** | `/api/admin/matching/settings` | Admin | Updates algorithm weights (strictly enforces weights total = 100%) |
| **POST** | `/api/admin/matching/settings/reset` | Admin | Resets matching weights and bonuses to system defaults |
| **GET** | `/api/admin/matching/pair` | Admin | Evaluates pair compatibility with full deal-breaker diagnostics (`?studentA=...&studentB=...`) |
| **GET** | `/api/admin/matching/students/[id]/top`| Admin | Retrieves top 10 matches for any specific student |
| **GET** | `/api/config/questionnaire` | Any Auth | Returns single-source-of-truth questionnaire definition, questions, and allowed choices |
| **GET** | `/api/students/me/profile` | Student | Retrieves the authenticated student's profile & academic data |
| **PUT** | `/api/students/me/profile` | Student | Upserts profile details and marks completion status |
| **GET** | `/api/students/me/preferences`| Student | Retrieves student lifestyle questionnaire answers & deal-breakers |
| **PUT** | `/api/students/me/preferences`| Student | Saves answers; sets `completedAt` when all mandatory questions are answered |
| **GET** | `/api/students/me/status` | Student | Computes `{ profileCompleted, preferencesCompleted, percentage }` |
| **GET** | `/api/admin/students` | Admin | Aggregated student directory with filters (search, gender, year, origin, status) |
| **GET** | `/api/admin/students/[id]` | Admin | Retrieves student record with profile and preferences |
| **PATCH**| `/api/admin/students/[id]` | Admin | Toggles student account `isActive` (never role or password) |
| **GET** | `/api/admin/stats` | Admin | System totals (hostels, rooms, beds, completed preferences, international students) |
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

### 3. Seed Demo Students (New in Phase 2)
```bash
# Seed 300 demo students (default)
npm run seed:students

# Seed custom number of demo students
npm run seed:students -- --count=100

# Reset: delete ONLY demo students, their profiles, and preferences (preserves real users & admins)
npm run seed:students -- --reset
```
*(Creates demo students with `isDemo: true`, registration numbers `DEMO-0001` onwards, ~60/40 gender ratio, diverse Indian states and ~8% international students, realistic preference correlations, and 85% completed / 15% pending questionnaires. Password for all demo accounts: `DemoStudentPass123!` or via `DEMO_STUDENT_PASSWORD`).*

### 4. Run Roommate Matching Pure Engine Tests (New in Phase 3)
```bash
npm run test:matching
```
*(Runs Node.js built-in test runner across 12 unit tests verifying symmetry, deal-breaker directions, dietary logic, scale differences, and year bonus).*

### 5. Run Roommate Compatibility Console Demo (New in Phase 3)
```bash
# Evaluate demo student DEMO-0001
npm run match:demo -- --reg=DEMO-0001

# Evaluate any specific demo student
npm run match:demo -- --reg=DEMO-0042
```
*(Loads candidate pool, calculates mutual compatibility, prints deal-breaker exclusions, and outputs top 5 matches with scores and reasons).*

### 6. Start Development Server
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

---

## 👥 Roommate Groups & Invitations (Phase 4)

### 1. Concept & Architecture
Campus rooms feature 2, 3, or 4 beds (`GROUP_SIZE_OPTIONS = [2, 3, 4]`). A student creates a group specifying their target bed count and becomes the **group leader**. The leader invites compatible peers; invitees accept or decline. When all seats are filled, the group transitions to `complete` and awaits automated hostel room allocation by the warden (Phase 5). Students who prefer not to form a group select **auto-assign** (`AllocationIntent mode = "auto"`), and will be paired algorithmically during general room allocation.

### 2. Fairness & Privacy Rules
- **Non-Discrimination**: Nationality, home country, home state, and ethnicity are **NEVER** used in any group logic, scoring, filtering, or recommendations.
- **Gender Isolation**: Strict, non-negotiable rule. All members of a group must share the identical gender.
- **Privacy Safeguards**: Group members and invited candidates only see safe public fields: `name`, `course`, `department`, `year`, `shared languages`, and mutual compatibility scores. Email, phone, registration number, and raw questionnaire answers are **NEVER** exposed to other students.
- **Generic Privacy Rejection**: When an invited candidate fails deal-breakers with an existing member, the system returns a generic *"Candidate is not compatible with current group criteria"* without disclosing private deal-breaker triggers.

### 3. Group State Lifecycle

```mermaid
stateDiagram-v2
    [*] --> forming: Student creates group (Leader)
    forming --> complete: All target seats filled (atomic accept)
    forming --> forming: Target size increased / Member leaves
    complete --> forming: Member leaves / Target size increased
    complete --> locked: Room allocated by admin (Phase 5)
    forming --> disbanded: Leader disbands / Last member leaves
    complete --> disbanded: Leader disbands (Admin override)
    locked --> [*]: Read-only (Cannot leave or remove)
    disbanded --> [*]: Inactive (Pending invites cancelled)
```

### 4. Concurrency Safety & Race Condition Protection
1. **Zero Overfilling Under Simultaneous Accepts**:
   When multiple students accept invitations simultaneously for the final free bed, MongoDB executes an atomic conditional update:
   ```javascript
   await RoommateGroup.findOneAndUpdate(
     {
       _id: groupId,
       status: "forming",
       "members.user": { $ne: userId },
       $expr: { $lt: [{ $size: "$members" }, "$targetSize"] }
     },
     { $push: { members: { user: userId, joinedAt: new Date() } } },
     { new: true }
   );
   ```
   If the group filled just milliseconds prior, the `$expr` condition fails atomically and returns `null`, rejecting the second accept with a clean 409 conflict and preventing overfilling.

2. **Single Active Group Guarantee**:
   A partial unique index on `members.user` in MongoDB:
   ```javascript
   RoommateGroupSchema.index(
     { "members.user": 1 },
     {
       unique: true,
       partialFilterExpression: { status: { $in: ["forming", "complete", "locked"] } }
     }
   );
   ```
   Guarantees at the database engine level that no student can belong to multiple active groups simultaneously.

### 5. API Endpoints

| Method | Route | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/groups/me` | Student | Active group details, safe member roster, seats, per-pair scores, pending invites |
| `POST` | `/api/groups` | Student | Create a new forming group (body: `{ targetSize }`) |
| `PATCH` | `/api/groups/me` | Student | Leader modifies target size (2, 3, 4) |
| `DELETE` | `/api/groups/me` | Student | Leader disbands the group (cancels pending invites) |
| `GET` | `/api/groups/me/candidates` | Student | Paginated compatible candidates matching all existing members |
| `POST` | `/api/groups/me/invitations` | Student | Leader invites a student (body: `{ userId }`, rate-limited) |
| `DELETE` | `/api/groups/me/invitations/[id]` | Student | Leader cancels a pending invitation |
| `POST` | `/api/groups/me/leave` | Student | Member leaves group; auto-transfers leadership if leader leaves |
| `POST` | `/api/groups/me/members/[userId]/remove` | Student | Leader removes a member from the group |
| `GET` | `/api/invitations/me` | Student | Incoming pending and historical invitations |
| `POST` | `/api/invitations/[id]/accept` | Student | Atomically accept invitation & join group |
| `POST` | `/api/invitations/[id]/decline` | Student | Decline an incoming group invitation |
| `GET` / `PUT` | `/api/students/me/intent` | Student | Retrieve or update auto-allocation mode (`auto` vs `group`) |
| `GET` | `/api/admin/groups` | Admin | Filterable, paginated directory of all campus roommate groups |
| `GET` | `/api/admin/groups/[id]` | Admin | Group diagnostics, members roster, full pairwise score matrix |
| `POST` | `/api/admin/groups/[id]/remove-member` | Admin | Administrative override to remove member from group |
| `POST` | `/api/admin/groups/[id]/disband` | Admin | Administrative override to disband group |

### 6. Verification Scripts
```bash
# Run pure group score math unit tests (5 automated tests)
npm run test:groups

# Seed 40 realistic demo groups & auto-assign pool
npm run seed:groups -- --count=40

# Reset all demo groups, invitations, and intents
npm run seed:groups -- --reset
```

---

## 🛏️ Room Preferences for Groups & Auto-Assign Students (Phase 4 - Part 2)

### 1. Conceptual Design & Soft Preferences
When a roommate group is formed (or when a solo student selects auto-assign mode), they state their accommodation preferences:
- **Preferred Hostels**: Up to 3 eligible hostels in priority order (Rank 1, 2, 3).
- **AC Type**: `ac`, `non-ac`, or `no-preference`.
- **Floor Preference**: `low` (bottom third), `mid` (middle third), `high` (top third), or `any`.

> [!IMPORTANT]
> **Soft Preferences Guarantee**: Preferences are soft criteria for the administrator's allocation engine. They are honored in priority order subject to availability, but do not guarantee a specific hostel, floor, or room. Students never pick room numbers directly.

### 2. Hostel Eligibility Rules
A hostel is selectable by a group only if it passes all three checks:
1. **Active Status**: `hostel.isActive === true`.
2. **Gender Rules**:
   - `boys` accepts male groups.
   - `girls` accepts female groups.
   - `mixed` accepts male, female, and other groups.
3. **Academic Year Matching**:
   - The hostel's `allowedYears` (if non-empty) must permit **every member's** academic year. If even one member's year is excluded, the hostel cannot be selected.

### 3. Dynamic Floor Band Logic
Floors are numbered starting from 0 (ground floor) through `totalFloors - 1`. The pure algorithm `floorMatchesBand(floor, totalFloors, band)` evaluates bands relative to building height:
- **$N = 1$ floor** (Floor 0): Ground floor matches `low`, `mid`, `high`, and `any`.
- **$N = 2$ floors** (Floors 0 & 1): Floor 0 is `low`, Floor 1 is `high`, and `mid` matches both floors.
- **$N \ge 3$ floors**: The floors are divided into three roughly equal segments:
  - `low`: Floors from `0` to `floor(N/3) - 1`
  - `high`: Floors from `N - floor(N/3)` to `N - 1`
  - `mid`: All remaining intermediate floors
- **`any`**: Always matches any floor $0 \le \text{floor} < \text{totalFloors}$.

### 4. Privacy & AC Deal-Breaker Protection
- **Generic Conflict Warning**: If the group's AC choice directly conflicts with any member's strict `acType` deal-breaker, the system returns an informative 400 rejection: *"One of your members requires a different AC setting due to a strict deal-breaker preference."* No member's name or private survey answer is ever revealed.
- **Aggregated Availability**: Students only see room and bed availability counts split by AC/Non-AC for their specific room size. Occupant names and room-level details are never leaked.

### 5. Automatic Invalidation (`preferencesNeedReview`)
Whenever a group's roster changes (a member joins, leaves, or is removed by leader or admin):
- `revalidatePreferencesForGroup` runs automatically.
- Any chosen hostel that is no longer eligible for the updated member set is pruned.
- If the current AC choice conflicts with an incoming member's deal-breaker, it resets safely to `suggestDefaultAcType`.
- Sets `preferencesNeedReview = true`, displaying a dismissible amber prompt on `/dashboard/group` alerting the leader to review choices.

### 6. Room Preference API Endpoints

| Method | Route | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/groups/me/room-options` | Student | Eligible hostels for group or auto-intent, with live AC/Non-AC room & bed availability |
| `GET` | `/api/groups/me/room-preferences` | Student | Current saved preferences, suggested default AC, deal-breaker warnings, and review flag |
| `PUT` | `/api/groups/me/room-preferences` | Student | Save preferences (Leader only for groups, student for auto; revalidates eligibility & deal-breakers) |
| `POST` | `/api/groups/me/room-preferences` | Student | Acknowledge & clear the `preferencesNeedReview` banner |
| `GET` | `/api/admin/preferences/summary` | Admin | 1st-choice demand vs available supply per hostel, AC vs Non-AC demand, and capacity demand |
| `GET` | `/api/admin/groups/[id]` | Admin | Includes full room preferences block with populated hostel names |

### 7. Verification & Seeding Scripts

```bash
# Run room preferences pure logic unit tests (22 automated tests)
npm run test:roomprefs

# Run roommate matching unit tests (12 automated tests)
npm run test:matching

# Run roommate group score unit tests (5 automated tests)
npm run test:groups

# Seed room preferences for existing demo groups and auto-pool students
npm run seed:roomprefs
```

---

## ⚡ Automated Hostel Allocation Engine - Simulation Mode (Phase 5)

### 1. Concept & Algorithm in Plain Words
The automated allocation engine places complete groups, filled forming groups, and solo students into physical rooms through a deterministic, multi-round optimization pipeline:
1. **Fill Forming Groups**: Open seats in incomplete groups are filled one-by-one with the best-fitting solo students of the same gender without introducing deal-breaker conflicts.
2. **Handle Incomplete Groups**: Under the `"shrink"` policy, groups with $\ge 2$ members become smaller units of their current size; groups with only 1 member dissolve back into the solo pool.
3. **Cluster Remaining Solo Students**: Solo pool students are clustered into compatible groups descending by target room size (4 $\rightarrow$ 3 $\rightarrow$ 2) using a **most-constrained seed heuristic**, followed by an iterative 2-opt member swap pass that strictly increases compatibility.
4. **Multi-Round Priority Room Placement**:
   - Every group is placed into a free room whose physical capacity exactly equals group size.
   - **Rounds 1, 2, 3**: Every unit gets a fair chance at its 1st-choice hostel before anyone gets a 2nd choice, then 2nd, then 3rd choice.
   - **Round 4 (Fallback)**: Any remaining units are placed into the highest-scoring eligible room across all campus hostels.
   - Groups that cannot be placed are waitlisted with an exact diagnostic reason (`no_eligible_hostel`, `no_room_of_this_size`, `ac_requirement_unmet`, `all_matching_rooms_taken`).
5. **Monte Carlo Random Baseline Comparison**: Automatically compares the resulting room placements against a random permutation of the exact same students in the same room capacities across 20 trials, proving the score lift, disputation drop, and elimination of deal-breaker conflicts.

### 2. Preference Satisfaction Points (Total: 100 Points)

| Dimension | Condition | Points Earned |
| :--- | :--- | :--- |
| **Hostel Choice Rank** | 1st Choice Hostel | **50 points** |
| | 2nd Choice Hostel | **35 points** |
| | 3rd Choice Hostel | **20 points** |
| | Fallback (outside preferred list) | **0 points** |
| **Climate Control (AC)** | Matches explicit AC / Non-AC request (or unit is flexible) | **30 points** |
| | Conflicts with unit's soft AC request | **0 points** |
| **Floor Band** | Matches proportional floor band (`low`, `mid`, `high`) (or unit is "any") | **20 points** |
| | Conflicts with unit's floor preference | **0 points** |

### 3. Unit Priority Modes

| Mode | Key | Behavior |
| :--- | :--- | :--- |
| **Fair Seeded Lottery** | `lottery` | Units are placed in a pseudo-random order determined by the seed. Unbiased and fair for all students (Default). |
| **Completion Timestamp** | `completedAt` | Groups that completed or submitted room preferences earliest receive priority for room selection. |
| **Academic Seniority** | `seniority` | Groups with higher average academic year go first, with ties broken by the seeded lottery. |

### 4. Zero Live Data Modification Guarantee (Draft Mode)
> [!IMPORTANT]
> **Draft Simulation Guarantee**: Simulation runs **NEVER** modify live database records. No code path in Phase 5 modifies `Room.currentOccupancy`, `Room.status`, `RoommateGroup` (status or members), `GroupInvitation`, `AllocationIntent`, or `User`. The only records stored are new `AllocationRun` and `AllocationAssignment` documents.

### 5. API Endpoints

| Method | Route | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/allocations/run` | Admin | Execute simulation run (body: options; rate-limited, maxDuration: 60s) |
| `GET` | `/api/admin/allocations` | Admin | Paginated list of allocation simulation runs |
| `GET` | `/api/admin/allocations/[id]` | Admin | Run details, summary metrics, satisfaction stats, and baseline comparisons |
| `DELETE` | `/api/admin/allocations/[id]` | Admin | Delete draft or failed run and all associated assignment records |
| `GET` | `/api/admin/allocations/[id]/assignments` | Admin | Paginated room placements with search and status/hostel filters |
| `GET` | `/api/admin/allocations/[id]/unallocated` | Admin | Roster of unallocated students and diagnostic reasons |

### 6. Verification & Demo Scripts

```bash
# Run pure allocation engine unit tests (32 automated tests)
npm run test:allocation

# Run console simulation dry-run demo (writes zero records)
npm run allocation:demo -- --seed=42 --gender=all --priority=lottery

# Run console simulation and persist as admin draft run
npm run allocation:demo -- --seed=42 --save

# Run all test suites across the entire platform (90 automated tests)
npm run test:matching && npm run test:groups && npm run test:roomprefs && npm run test:allocation
```

---

## 🚀 Live Allocation Lifecycle, Publishing & Rollback (Phase 6)

### 1. The Allocation Lifecycle Architecture

The system provides an enterprise-grade, transactional state machine for transition from simulated draft to physical campus inventory:

```text
                     ┌────────────────────────────────────────┐
                     │           SIMULATION ENGINE            │
                     └──────────────────┬─────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  DRAFT ALLOCATION│ ◄──────────┐
                              │ (Zero live edits)│            │
                              └─────────┬────────┘            │
                                        │                     │
                     [Admin Edits: move, swap, unassign]      │
                                        │                     │
                                        ▼                     │
                              ┌──────────────────┐            │
                              │ PUBLISH PREVIEW  │            │
                              │(Conflict audits) │            │
                              └─────────┬────────┘            │
                                        │                     │
                         Type "PUBLISH" │ (Session Lock)      │
                                        ▼                     │
                              ┌──────────────────┐            │
                              │    PUBLISHING    │            │
                              │ (Transaction lock)            │
                              └─────────┬────────┘            │
                                        │                     │
             Atomic Commit (Rooms + Groups + Allocations)     │
                                        ▼                     │
                              ┌──────────────────┐            │
                              │    PUBLISHED     │            │
                              │(Live official)   │            │
                              └─────────┬────────┘            │
                                        │                     │
                    Emergency Reversal? │ Type "ROLLBACK"     │
                                        ▼                     │
                              ┌──────────────────┐            │
                              │   ROLLED_BACK    ├────────────┘
                              │(Restored to base)│ (Inventory freed)
                              └──────────────────┘
```

### 2. Admin Draft Editing Operations (`src/services/allocationEditService.js`)

Admins can fine-tune draft simulations without re-running the solver:

| Action | Function | Rules & Hard Constraints |
| :--- | :--- | :--- |
| `move` | Move unit to room | Target room must be empty in draft & live data; capacity must exactly equal unit size; passes hostel gender, allowed years, and hard AC deal-breaker. Soft AC/floor mismatches issue warnings. |
| `swap_rooms` | Swap rooms between 2 units | Both units must be assigned and have identical size; each unit must satisfy hard constraints of the counterpart's room. |
| `swap_members` | Swap students between 2 units | Both members and units must share the same gender; re-checks hostel academic years; if a swap introduces an intra-unit deal-breaker, the system blocks the action unless the admin ticks **Override** and inputs an audit reason ($\ge 5$ characters). |
| `unassign` | Move unit to waitlist | Frees room immediately; marks unit waitlisted with reason `manually_unassigned`. |
| `assign_waitlisted` | Assign waitlisted unit to room | Same constraints as `move`; assigns free eligible room. |

Every edit updates the run statistics (satisfaction scores, baseline comparisons) and records an immutable audit entry in `editLog` (capped at 200 entries).

### 3. Atomic Publication (`publishRun`) & Rollback (`rollbackRun`)

- **Publication**:
  1. **Atomic State Lock**: Moves run status from `draft` to `publishing` via `findOneAndUpdate`. Concurrent publication attempts fail immediately with `409 Conflict`.
  2. **MongoDB Replica Set Transaction**:
     - Room occupancy incremented with conditional query (`currentOccupancy === 0 && status !== 'maintenance'`).
     - Rooms reaching capacity are explicitly marked `status: 'full'`.
     - Group actions applied: `lock_existing`, `fill_and_lock`, `shrink_and_lock`, or `create_and_lock` (new group for solo pool units).
     - Official `Allocation` records inserted with a database partial unique index on `student` where `status: 'active'`.
     - Pending invitations for allocated students and groups cancelled.
     - `publishSnapshot` stored with original group and room states for exact reversal.
     - Run marked `published`; all other draft runs marked `discarded`.
- **Rollback**:
  - Reversible only for the **latest published run**.
  - Verified against state drift via `buildRollbackPlan`.
  - Inside a transaction: decrements room occupancies, cancels `Allocation` records (`status: 'cancelled'`, `cancelReason: 'rollback'`), disbands allocation-created groups, and restores original group states.

### 4. Privacy Safeguards & The Phone Rule

- **Strict Student Privacy**:
  - Roommates in a published, active room can see **ONLY**: `name`, `course`, `department`, `year`, `sharedLanguages`, `compatibilityScore`, and `phone` (subject to the Phone Rule).
  - Roommates **NEVER** see email addresses, registration numbers, raw questionnaire answers, deal-breaker flags, home country, or home state.
  - Students never see draft runs, unassigned lists, or other rooms' occupants.
- **The Phone Rule**:
  - Controlled by `sharePhoneWithRoommates` (default: `true`) on `StudentProfile`, toggled on `/dashboard/profile`.
  - A roommate's phone number is returned **ONLY** when ALL 3 conditions are satisfied:
    1. Viewer has an active allocation in the same room.
    2. Roommate has `sharePhoneWithRoommates === true`.
    3. Roommate has a personal phone number saved.
  - Otherwise returns `phoneStatus: "not_provided"` or `phoneStatus: "hidden_by_student"`.
  - Phone numbers never appear in match suggestions, group candidates, invitations, or public directories.

### 5. Phase 6 API Routes

| Method | Route | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/allocations/[id]/edit` | Admin | Edit draft run (`move`, `swap_rooms`, `swap_members`, `unassign`, `assign_waitlisted`) |
| `GET` | `/api/admin/allocations/[id]/edit-options` | Admin | Fetch eligible candidate rooms or swap partners for a unit |
| `GET` | `/api/admin/allocations/[id]/publish-preview`| Admin | Dry-run publish plan and detect any live conflicts |
| `POST` | `/api/admin/allocations/[id]/publish` | Admin | Atomically publish draft run with live transaction (requires `confirmText: "PUBLISH"`) |
| `POST` | `/api/admin/allocations/[id]/rollback` | Admin | Atomically roll back latest published run (requires `confirmText: "ROLLBACK"`) |
| `GET` | `/api/admin/allocations/[id]/export` | Admin | Download official allocation CSV with formula injection sanitization |
| `GET` | `/api/admin/rooms/[id]/occupants` | Admin | Fetch occupants of an active room for hostel floor plans |
| `GET` | `/api/admin/integrity` | Admin | Run complete database integrity diagnostics |
| `POST` | `/api/admin/integrity/fix-occupancy` | Admin | Self-heal room occupancy mismatches based on active allocations |
| `GET` | `/api/allocation/me` | Student | Official "My Room" portal with room details, rules, and privacy-filtered roommates |
| `PATCH`| `/api/students/me/profile/sharing` | Student | Update `sharePhoneWithRoommates` privacy toggle |

### 6. Phase 6 Verification & Diagnostic Scripts

```bash
# 1. Run database integrity diagnostic check (exits non-zero on issues)
npm run integrity:check

# 2. Run diagnostic check with automatic room occupancy repair
npm run integrity:check -- --fix

# 3. Self-contained End-to-End Publish & Rollback database verification
npm run test:publish

# 4. Simultaneous double-publish race condition verification
npm run test:concurrency
```

---

## 🔔 Phase 7: In-App Notifications & Admin Announcements

HostelMatch features a real-time, privacy-preserving in-app notification engine and administrative broadcast announcement system.

### 1. Architectural Invariants & Design Rules

- **After Commit & Best-Effort Guarantee**: Creating notifications is strictly best-effort. Notifications are triggered **ONLY AFTER** primary database operations and transactions have successfully committed. Notification calls are wrapped in robust `try/catch` handlers that log failures and never break, roll back, or fail the primary action.
- **Strict Privacy Invariant**: Notification messages and metadata are strictly cleansed of sensitive data. They **NEVER** contain phone numbers, email addresses, registration numbers, deal-breaker reasons, raw lifestyle answers, home country, or home state. A student may be referenced only by their display name where naturally required (e.g., an invitation from a group leader).
- **Session-Bound Authorization**: Users can view, update, and delete **ONLY** their own notifications. User IDs are extracted strictly from the validated JWT session (`hm_token`), never trusted from client request bodies. Re-checking user roles is enforced in every API route handler. Requesting a notification belonging to another user returns a generic `404 Not Found`.
- **Plain-Text & Safe Link Enforcement**: All notification titles and messages are rendered as plain text (never using `dangerouslySetInnerHTML`). Embedded links must pass strict internal link validation: they must begin with a single `/` (rejecting schemes, protocol-relative `//`, backslashes, whitespace, and exceeding 200 characters).
- **Idempotency & Deduplication**: Every event constructs a deterministic `dedupeKey` (e.g., `invitation_received:<id>`). Coupled with a MongoDB partial unique index on `(user, dedupeKey)`, duplicate events or network retries are safely and silently deduplicated without throwing errors.
- **Scalable Fan-Out & Retention**: Bulk notifications are batched into chunks of 500 (`FANOUT_CHUNK_SIZE`) with `ordered: false`. Notifications feature a TTL index on `expiresAt` automatically purging records after 90 days (`RETENTION_DAYS`).

---

### 2. Notification Types & Categories

| Category | Type Key | Label | Severity | Link | Trigger Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invitations** | `invitation_received` | New Roommate Invitation | `info` | `/dashboard/invitations` | Leader sends an invitation to a student |
| **Invitations** | `invitation_accepted` | Invitation Accepted | `success` | `/dashboard/group` | Invited student accepts leader's invitation |
| **Invitations** | `invitation_declined` | Invitation Declined | `info` | `/dashboard/group` | Invited student declines leader's invitation |
| **Invitations** | `invitation_cancelled` | Invitation Cancelled | `info` | `/dashboard/invitations` | Leader withdraws a pending invitation |
| **Groups** | `group_member_joined` | New Roommate Joined | `info` | `/dashboard/group` | Non-leader existing members notified when peer joins |
| **Groups** | `group_member_left` | Member Left Group | `warning` | `/dashboard/group` | A member leaves or is removed from the group |
| **Groups** | `group_member_removed` | Removed from Group | `warning` | `/dashboard/group` | Removed student notified with neutral wording |
| **Groups** | `group_complete` | Roommate Group Complete | `success` | `/dashboard/group` | Group reaches its target capacity |
| **Groups** | `group_disbanded` | Group Disbanded | `warning` | `/dashboard/group` | Leader or admin disbands the group |
| **Groups** | `group_leader_changed` | New Group Leader | `info` | `/dashboard/group` | Leadership transfers after former leader leaves |
| **Groups** | `group_preferences_review` | Room Preferences Review | `warning` | `/dashboard/group` | Group changes and leader must review room preferences |
| **Allocation** | `allocation_published` | Room Allocated! | `success` | `/dashboard/room` | Run published: student gets allocated hostel & room |
| **Allocation** | `allocation_waitlisted` | Allocation Waitlisted | `warning` | `/dashboard/room` | Run published: unit placed on waitlist with reason |
| **Allocation** | `allocation_unallocated` | Allocation Update | `warning` | `/dashboard/room` | Run published: student unallocated with next steps |
| **Allocation** | `allocation_rolled_back` | Allocation Withdrawn | `warning` | `/dashboard/room` | Published allocation run rolled back by administration |
| **Announcements**| `announcement` | Admin Announcement | `info` | (Optional validated link) | Targeted administrative broadcast announcement |

*(Note: Types `room_change_submitted`, `room_change_approved`, `room_change_rejected`, `complaint_submitted`, and `complaint_status_updated` are reserved for upcoming phases).*

---

### 3. Admin Announcement Audiences

Announcements can be dynamically broadcast to targeted cohorts of active students (capped at 5,000 recipients per broadcast):

| Audience Type | Target Cohort | Extra Field / Criteria |
| :--- | :--- | :--- |
| `all_students` | All active students | None |
| `gender` | Students of a specific gender | `gender: "male"` \| `"female"` \| `"other"` |
| `year` | Students of a specific academic year | `year: 1` through `6` |
| `hostel` | Students with an active room allocation in a hostel | `hostelId`: Valid active Hostel ObjectId |
| `allocated` | All students with an active room allocation | None |
| `not_allocated`| Active students currently without a room allocation | None |
| `group_status` | Filtered by group status | `status: "forming"` \| `"complete"` \| `"locked"` \| `"none"` |

---

### 4. Phase 7 API Routes

#### In-App Notifications (Authenticated Users: Student or Admin)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/notifications` | Paginated notifications list with filters (`unreadOnly=true`, `category`) |
| `GET` | `/api/notifications/unread-count` | Live count of unread notifications (indexed query) |
| `POST` | `/api/notifications/[id]/read` | Mark a specific notification as read |
| `POST` | `/api/notifications/read-all` | Mark all notifications (or all in a category) as read |
| `DELETE` | `/api/notifications/[id]` | Delete a single notification owned by the user |
| `DELETE` | `/api/notifications` | Delete all read notifications owned by the user |

#### Administrative Announcements (Admin Only)
| Method | Route | Description |
| :--- | :--- | :--- |
| `POST` | `/api/admin/announcements/preview` | Preview audience recipient count & descriptive label without sending |
| `POST` | `/api/admin/announcements` | Broadcast announcement to audience (Rate limit: 10 per hour per admin) |
| `GET` | `/api/admin/announcements` | Paginated announcement history with real-time read receipt counts |
| `GET` | `/api/admin/announcements/[id]` | Get single announcement detail with live read count |
| `DELETE` | `/api/admin/announcements/[id]` | Withdraw active announcement and purge delivered in-app notifications |

---

### 5. Phase 7 Verification Scripts

```bash
# 1. Run pure unit test suite (templates, link validator, audience, dedupe)
npm run test:notifications

# 2. Generate sample notifications for a demo student (for UI verification)
npm run notify:test -- --reg=DEMO-0001

# 3. Clear generated sample notifications for a demo student
npm run notify:test -- --reg=DEMO-0001 --clear

# 4. Run end-to-end flow test (invitation, group completion, cross-user isolation, announcement broadcast & withdrawal)
npm run test:notify-flow
```




