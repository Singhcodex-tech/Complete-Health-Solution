# HealthCare+ — Frontend Prototype

A premium, investor-ready frontend prototype for a healthcare platform —
built for demos to hospitals, clinics, doctors and investors. **No backend,
no database, no auth** — every interaction uses dummy data and client-side
state so the whole experience runs instantly on `localhost`.

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** for animation
- **Lucide Icons**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> First run needs internet access once, to fetch the Google Fonts used
> (Fraunces, Inter, IBM Plex Mono) via `next/font/google`.

To build for production:

```bash
npm run build
npm run start
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page — hero, search, services grid, about, why-us, testimonials, FAQ, contact |
| `/services` | All 29 services with category filter |
| `/booking` | Universal booking form (accepts `?service=slug` to preselect) |
| `/ambulance` | Road / railway / air ambulance + emergency dispatch |
| `/doctors` | Doctor directory with search, speciality & availability filters |
| `/nursing` | Home nursing pricing plans |
| `/lab-tests` | Diagnostic test catalogue |
| `/equipment` | Medical equipment rental/purchase |
| `/insurance` | Insurance assistance & partner network |
| `/contact` | Contact form, map placeholder, phone/email/WhatsApp |

## Project Structure

```
app/                 Route segments (App Router)
  page.tsx           Home page
  services/          Services listing
  booking/           Booking form
  ambulance/         Ambulance module
  doctors/           Doctor consultation
  nursing/           Home nursing plans
  lab-tests/         Lab test catalogue
  equipment/         Medical equipment
  insurance/         Insurance assistance
  contact/           Contact page
components/          Shared UI (Navbar, Footer, ServiceCard, etc.)
lib/
  data.ts            All dummy content (services, doctors, testimonials…)
  utils.ts           cn() className helper
```

## Design System

- **Colors** — white/soft paper background, clinical blue (`--primary`),
  medical green (`--accent`), warm red reserved for emergency actions only.
- **Type** — Fraunces (display/serif) for headings, Inter for body copy,
  IBM Plex Mono for stats and prices.
- **Signature element** — an animated ECG "vitals line" used as a section
  divider and inside the hero, tying the visual language back to patient
  monitoring.

## Connecting a Real Backend Later

Every form (`ContactForm`, `BookingForm`) currently just flips local React
state to show a success screen. To wire up a backend:

1. Replace the `handleSubmit` functions in `components/ContactForm.tsx` and
   `app/booking/page.tsx` with real `fetch`/API calls.
2. Replace the arrays in `lib/data.ts` with API responses (same shapes are
   already used throughout the UI, so components won't need changes).
3. Add auth, a database, and payment/notification providers behind those
   same forms — the UI layer is intentionally backend-agnostic.
