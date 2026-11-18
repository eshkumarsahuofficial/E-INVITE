# Capture Studio — Digital Wedding Invitation Platform

A multi-client digital wedding invitation SaaS platform built for **Capture Studio** (*In Front of Police Station, Gaindatola, Rajnandgaon, Chhattisgarh*).

From a single password/Google-Auth protected studio console (`/admin`), the studio owner can create unlimited client wedding invitations, customize luxury themes, upload and reorder photo galleries, manage RSVPs and personalized guest links, generate QR codes, and publish permanent client invitation websites at `/invite/<slug>` (or `/<slug>`).

---

## Core Architecture & Features

### 1. Studio Admin Console (`/admin`)
- **Authentication**: Protected via Firebase Authentication (Google Sign-In) with verified studio administrator enforcement in both Firestore security rules and backend media APIs.
- **Analytics Overview**: Tracks total active clients, total invitations, published invitations, drafts, expired invitations, and confirmed guest headcount.
- **6-Step Invitation Builder**:
  1. **Couple Details**: Bride & Groom names (English + हिन्दी), bios, couple story, photo uploads, wedding date/time, permanent URL slug, and language mode.
  2. **Family Details**: Parents, grandparents, Gotra (optional), Ganesh Vandana invocation, bilingual family message, primary venue & Google Maps URL, and family compliments.
  3. **Wedding Events**: Unlimited dynamic ceremony cards with Hindi/English titles, dates, times, venues, addresses, and Google Maps links.
  4. **Photo Gallery**: Multi-photo upload, drag-and-drop ordering, accessible move up/down controls, captions, and photo replacement.
  5. **Design Selection**: Four luxury presets (**Rose Heritage**, **Royal Darbar**, **Atelier Minimal**, **Traditional Utsav**), custom color pickers, typography pairings, opening animations, ambient Indian classical music synthesis, and section visibility toggles.
  6. **Preview & Publish**: Interactive mobile/desktop live preview frame, optional expiry date, draft saving, and one-click live publishing.
- **Lifecycle Controls**: Edit without changing URL, duplicate/clone existing invitations, expire, archive/restore, and delete.
- **Clients CRM**: Private client contact directory strictly isolated to admins.
- **RSVPs & Guest Message Board**: View private attendance records, export CSV reports, and moderate public guest wishes.
- **Personalized Guest Links & QR Codes**: Generate guest-specific invitation links (`?g=<code >` or `?guest=<Name>`), download PNG QR passes, and send via WhatsApp.
- **Media Gallery & Backups**: Upload images securely to `/api/uploads` (stored in `/uploads`) and export full JSON studio backups.
- **Editable Studio Branding**: Update Capture Studio logo, address, phone numbers, email, and domain (`invite.capturestudio.in`) from Studio Settings.

### 2. Public Wedding Invitation Experience (`/invite/:slug` or `/:slug`)
- Tap-to-open floral / envelope seal animation (`prefers-reduced-motion` compliant).
- Ganesh Vandana & bilingual English / हिन्दी switcher.
- Interactive wedding date reveal card & live tabular countdown timer.
- Add-to-Calendar (`.ics`) export and Google Maps directions per ceremony.
- Swipeable / clickable photo gallery slider with fullscreen lightbox.
- Built-in Web Audio API gentle Indian classical ambient music with manual Play/Pause.
- Private RSVP submission form + public Guest Blessings board (zero PII exposure).
- WhatsApp share button, QR pass modal, and dynamic server-injected OpenGraph preview metadata.

---

## Firestore Data Model & Security

Defined in `firebase-blueprint.json` and enforced by `firestore.rules`:
- `/admins/{adminUid}` — Authorized studio administrators.
- `/studioSettings/default` — Public studio branding and contact details.
- `/templates/{templateId}` — Reusable invitation design presets.
- `/clients/{clientId}` — Private client CRM records (Admin-only).
- `/invitations/{slug}` — Wedding invitation master documents keyed by permanent URL slug.
  - `/events/{eventId}` — Scheduled wedding ceremonies.
  - `/galleries/{photoId}` — Ordered gallery photographs.
  - `/guests/{guestId}` — Private guest contact records (Admin-only).
  - `/guestPasses/{passId}` — Public personalized guest greeting tokens (zero PII).
  - `/rsvps/{rsvpId}` — Write-once public RSVP submissions (Admin-only read).
  - `/wishes/{wishId}` — Public guest blessings message board (zero PII).

---

## Local Development & Deployment

### Prerequisites
- Node.js 20+
- Configured `firebase-applet-config.json` (provisioned in project root)

### Commands
```bash
# Install dependencies
npm install

# Run development server (Express + Vite on port 3000)
npm run dev

# Type-check codebase
npm run lint

# Lint Firestore security rules
npx eslint firestore.rules

# Build production client bundle
npm run build

# Start production server
npm run start
```

### Environment Variables
See `.env.example` for optional runtime variables (`APP_URL`, `GEMINI_API_KEY`).

### Custom Domain Routing (`invite.capturestudio.in/<slug>`)
The Express server (`server.ts`) and React router (`src/App.tsx`) support both `/invite/<slug>` and root `/<slug>` routes automatically, injecting dynamic `<meta property="og:*">` tags for WhatsApp link previews on published invitations.
