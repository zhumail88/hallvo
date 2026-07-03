# Hallvo - MVP Requirements & Specifications

**Project Name:** Hallvo  
**Version:** MVP v1.0  
**Target Users:** Shaddi/Wedding Hall owners and desk staff (primarily 35-60 years old, non-tech savvy)  
**Goal:** Replace paper registers with a simple digital booking system focused on internal hall management. No customer-facing portal in MVP.

## 1. Project Overview

Hallvo is a web application for managing wedding/shaddi hall bookings. It eliminates manual register entries, reduces double-bookings, automates notifications, and provides clear visibility into availability and revenue.

**Core Value Proposition:**
- Simple calendar-based booking management
- Flexible pricing with addons and negotiation support
- Digital records and receipts
- WhatsApp-friendly workflow

**Tech Stack:**
- **Frontend:** Next.js 15 (App Router)
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **UI Library:** shadcn/ui + Tailwind CSS + Radix UI primitives (for professional yet simple UI)
- **State Management:** React hooks + Supabase real-time where needed
- **Forms:** React Hook Form + Zod validation
- **Notifications:** WhatsApp (Twilio or official API - placeholder in MVP), Email via Resend
- **PDF Generation:** @react-pdf/renderer or pdf-lib
- **Date Handling:** date-fns or dayjs

**Deployment:** Vercel (recommended for Next.js) + Supabase

## 2. Best Practices & Architecture Guidelines

### General
- Follow **Feature-Sliced Design** or clean module structure.
- All code must be **TypeScript** (strict mode).
- Use **Server Components** by default in Next.js. Use Server Actions for mutations.
- Implement proper **error boundaries** and loading states.
- **Responsive design** - Mobile-first (staff use phones/tablets).
- Accessibility (ARIA labels, keyboard navigation) - important for older users.
- No over-engineering. Keep MVP lean.

### Next.js Best Practices
- App Router only.
- Server Actions for all form submissions/mutations.
- Route Handlers for any API endpoints.
- Incremental Static Regeneration / Revalidation where applicable.
- Proper metadata, SEO (even for internal tool).
- Image optimization with Next/Image.
- Environment variables properly managed (`.env.example`).
- ESLint + Prettier + Husky for code quality.
- Modular, reusable components. No monolithic files.

### Supabase Best Practices
- Row Level Security (RLS) enabled on all tables.
- Use Supabase Auth (email + password + magic links for simplicity).
- Policies for multi-user roles.
- Real-time subscriptions for calendar updates (bookings).
- Storage buckets with proper access control for hall photos/receipts.
- Edge Functions for WhatsApp automation (later).
- Database schema with proper indexes, foreign keys, and constraints.
- Use Supabase JS client on server and client appropriately.
- Avoid exposing sensitive data.

### UI/UX Guidelines
- Clean, professional, trustworthy interface (not flashy).
- Large fonts, high contrast, big buttons/touch targets.
- Simple color scheme (greens/blues for trust).
- Consistent navigation (sidebar or top nav).
- Loading spinners and toast notifications (sonner).
- Dark mode optional but nice.
- Use shadcn/ui components heavily (Table, Calendar, Dialog, Form, etc.).

### Code Structure (Recommended)
```
hallvo/
├── app/
│   ├── (auth)/          # Login, register
│   ├── (dashboard)/     # Main protected routes
│   ├── api/             # Route handlers
│   └── layout.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── layout/          # Navbar, Sidebar
│   ├── bookings/        # Booking specific
│   ├── calendar/
│   ├── pricing/
│   └── common/
├── lib/
│   ├── supabase.ts      # Client & server clients
│   ├── utils.ts
│   └── constants.ts
├── hooks/
├── types/
├── schemas/             # Zod schemas
├── services/            # Business logic
└── store/               # If using any state
```

## 3. User Roles (MVP)

1. **Owner/Admin** - Full access
2. **Desk Staff** - Can create/view bookings, generate receipts (limited reports)

## 4. User Stories & Features

### Authentication
- Users can sign up / sign in with email + password.
- Magic link support.
- Role assignment on signup (admin sets roles).

### Dashboard
- Overview: Today's bookings, Total bookings this month, Occupancy rate, Pending payments.
- Quick stats cards.
- Recent activity feed.

### Calendar View
- Monthly/Weekly view using shadcn Calendar or react-big-calendar (if needed).
- Color-coded bookings:
  - Confirmed (green)
  - Tentative (yellow)
  - Available (white/gray)
- Click on date → See details + quick book.
- Filter by hall (if multi-hall added later).
- Show number of inquiries/holds per day.

### Booking Management
- Create new booking:
  - Customer details (name, phone, email, guests count, event type).
  - Date & time slot selection.
  - Hall selection (basic - expandable later).
  - Addons selection with prices.
  - Base pricing calculation.
  - Notes field.
- Booking statuses: Inquiry, Tentative, Confirmed, Completed, Cancelled.
- Edit booking.
- Manual price override field (with reason).
- Search & filter bookings (by customer name, phone, date range, status).

### Pricing & Addons
- Admin can define:
  - Base hall rates (per slot or per day).
  - Addons (Catering per head, Decoration packages, Lights, DJ, etc.) with prices.
- Dynamic total calculation (base + addons + guests).
- Final manual adjustment field.

### Digital Receipts & Documents
- Generate PDF receipt/invoice with booking details.
- Contract/Agreement template (basic, editable text or markdown).
- Store generated PDFs in Supabase Storage.
- Download + "Send via WhatsApp" button (placeholder).

### WhatsApp Integration (MVP)
- "Send via WhatsApp" button that opens `wa.me` with pre-filled message (booking details).
- Full automation (using Twilio/WhatsApp Business API) marked as Phase 2.

### History & Search
- Full booking history with audit trail (who changed what, when).
- Powerful search across customers and bookings.

### Reports (Basic Dashboard)
- Monthly revenue summary.
- Occupancy percentage.
- Popular addons.
- Pending payments list.
- Export to CSV (optional but recommended).

### Other Requirements
- Data validation on all forms (Zod).
- Confirmation dialogs for destructive actions (cancel booking).
- Activity logs.
- Basic settings page: Hall details, base pricing configuration, user management.
- Responsive design tested on tablet/mobile.

## 5. Database Schema (Supabase - PostgreSQL)

**Key Tables:**

- `profiles` (user profiles + role)
- `halls` (name, capacity, base_price, description, photos)
- `bookings`
  - id, hall_id, customer_name, phone, email, event_date, start_time, end_time
  - status, guests_count, base_amount, addon_details (jsonb), final_amount, adjustment_reason
  - notes, created_by, updated_at
- `addons` (name, price, category)
- `booking_addons` (junction)
- `receipts` (booking_id, pdf_url, generated_at)
- `activity_logs`

Enable RLS policies:
- Users can only see their organization's data.
- Staff roles have appropriate permissions.

## 6. Non-Functional Requirements

- **Performance:** Fast loading (<2s), real-time calendar updates.
- **Security:** RLS, input sanitization, rate limiting.
- **Scalability:** Designed to support multiple halls later.
- **Offline Consideration:** Optimistic updates + error handling (full offline later).
- **Error Handling:** User-friendly messages.
- **Testing:** Unit tests for critical logic (pricing), integration tests for auth.

## 7. Future Enhancements (Post-MVP)

- Customer portal
- Full WhatsApp automation
- Multi-hall advanced support
- Advanced analytics
- SMS fallback
- Inventory tracking
- E-signatures

## 8. Development Guidelines

1. Start with Supabase schema + auth.
2. Build Dashboard + Calendar.
3. Implement Booking CRUD.
4. Add pricing engine.
5. Receipts & documents.
6. Polish UI/UX for target demographic.
7. Testing with real scenarios (wedding booking flows).

**Prioritize simplicity and reliability over features.**

---
