# Birthday Magic — Production-Ready Interactive Birthday Surprise Experience ✨🎂

**Birthday Magic** is a modern, personalized, cinematic birthday surprise web application designed to create unforgettable interactive celebrations for loved ones.

It comes with an interactive 3D gift-opening experience, personalized celebrations, photo gallery slideshow, handwritten letter with typewriter reveal, milestone timeline, interactive candle-blowing birthday cake (with optional live microphone detection), mystery scratch card, background music synthesizer, and an admin Studio Editor with real-time mobile preview.

The platform is designed with a hybrid persistence architecture:
1. **Remote Cloud PostgreSQL + Supabase Storage + Supabase Auth**: Full multi-device persistence, cross-device shareable links (`/b/:slug`), user accounts, and Row Level Security (RLS).
2. **Local Browser Storage + Zero-Server Portable URL Fallback**: Instant offline/local editing and zero-server hash payloads (`#data=`) when remote credentials are not yet configured.

---

## 🌟 Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │             Vercel Hosting              │
                      │       SPA Routing via vercel.json       │
                      └────────────────────┬────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
         ┌──────────▼──────────┐                       ┌──────────▼──────────┐
         │   Public Recipient  │                       │   Creator Studio    │
         │     Route: /b/:slug │                       │ Routes: /editor,    │
         │                     │                       │         /dashboard  │
         │ - No login needed   │                       │ - Supabase Auth     │
         │ - Unwraps 3D gift   │                       │ - Autosave & RLS    │
         │ - Loads cloud media │                       │ - Live preview      │
         └──────────┬──────────┘                       └──────────┬──────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           │
                               ┌───────────▼───────────┐
                               │   Supabase Backend    │
                               │                       │
                               │ - PostgreSQL Database │
                               │ - Row Level Security  │
                               │ - Cloud Media Storage │
                               │ - Supabase Auth (JWT) │
                               └───────────────────────┘
```

- **Frontend Core**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS v4, Lucide React Icons.
- **Motion & Audio**: Framer Motion, Canvas Confetti, Web Audio API Synthesizer.
- **Database & RLS**: PostgreSQL via Supabase with least-privilege security policies.
- **Cloud Storage**: Supabase Storage bucket `birthday-media` (images, audios, video messages).
- **Authentication**: Supabase Auth (Email + Password & Anonymous Guest sessions).
- **Routing & Deployment**: React Router DOM v7, Vercel SPA rewrites via `vercel.json`.

---

## 🚀 Prerequisites & Local Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or v20.0.0+
- **npm**: v9.0.0+

### 2. Local Installation
```bash
# Clone the repository
git clone https://github.com/your-username/wish_site.git
cd wish_site

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

Configure your `.env` file with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here
```
> **Security Warning**: Use ONLY the `anon` public key in `VITE_SUPABASE_ANON_KEY`. Never expose your `service_role` secret in frontend code or Vite variables.

### 4. Running Locally
```bash
# Start local Vite development server
npm run dev

# Run automated test suite
npm test

# Run code linter
npm run lint

# Build production bundle
npm run build
```
Open `http://localhost:5173` in your browser.

---

## 🗄️ Supabase Project Setup & Security Configuration

To enable cloud persistence, cross-device shareable links, and media storage across devices:

### 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Set your Project Name (e.g. `birthday-magic`) and choose your preferred database region.
3. Save your database password securely.

### 2. Run Database Migrations & Security Policies
1. In the Supabase Dashboard, open the **SQL Editor** from the left sidebar.
2. Click **New Query**.
3. Copy and paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).
4. Click **Run**.

This script sets up:
- The `public.birthday_pages` table with fields: `id`, `slug`, `user_id`, `recipient_name`, `is_published`, `config`, `created_at`, `updated_at`.
- PostgreSQL Row Level Security (RLS) policies:
  - **SELECT**: Anonymous visitors can view published pages (`is_published = true`). Authenticated creators can view their own pages (both drafts and published).
  - **INSERT**: Authenticated users can insert pages associated with their own `auth.uid()`.
  - **UPDATE**: Authenticated users can update ONLY pages where `user_id = auth.uid()`.
  - **DELETE**: Authenticated users can delete ONLY pages where `user_id = auth.uid()`.
- Public Storage bucket `birthday-media` with:
  - 50MB file size limit.
  - Allowed MIME types for images, audio, and video.
  - Public read access for published media.
  - Authenticated upload, update, and delete access scoped to user folders.

### 3. Supabase Authentication Settings
In the Supabase Dashboard:
1. Go to **Authentication** -> **Providers** -> **Email**:
   - Ensure Email provider is **Enabled**.
   - (Optional) Toggle *Confirm email* depending on whether you want immediate signup verification.
2. Go to **Authentication** -> **Settings**:
   - (Recommended) Enable **Allow Anonymous Sign-ins** under Anonymous Sign-in. This enables creators to use the "Continue as Guest" feature with full PostgreSQL Row Level Security protection.

---

## ☁️ Vercel Deployment Instructions

### 1. Configure Vercel Project
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com/new).
3. Build Settings are automatically detected via `vercel.json`:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2. Add Environment Variables on Vercel
In your Vercel Project Dashboard, navigate to **Settings** -> **Environment Variables**:
Add the following two production variables:
- `VITE_SUPABASE_URL`: `https://your-project-ref.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `your-anon-public-key-here`

Click **Save** and redeploy.

### 3. SPA Routing & Direct URL Refresh
Direct navigation to routes like `/b/sophia-25th` or `/editor/bday-123` works seamlessly without 404 errors because of the SPA rewrite rule in `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🔗 How Public Share Links Work

1. **Creator Customizes**: Creator creates or edits a birthday surprise in `/editor`.
2. **Creator Publishes**: On the *Publish & Share* tab, the creator clicks **Publish Surprise Page**.
3. **Cloud Persistence**: The application saves the page to Supabase with `is_published: true`.
4. **Permanent Link Generated**: The shareable URL is formed:
   `https://your-domain.vercel.app/b/[slug]` (e.g. `https://your-domain.vercel.app/b/sophia-25th`).
5. **Recipient Opens**: The recipient opens the link on their iPhone, Android, or PC in any browser or private incognito session.
   - **No Login Required**: The recipient does NOT need an account or login.
   - **Database Stream**: The page config and media load directly from Supabase.
   - **Full Audio & Animation**: Mobile-compliant tap-to-unwrap experience triggers celebration music and confetti.
6. **Passcode Protection (Optional)**: If the creator configured a secret passcode in settings, the recipient is prompted to enter the passcode before unwrapping.

---

## 🔒 Security Considerations

- **Row Level Security (RLS)**: Enforced directly at the PostgreSQL database level. No user can alter or delete another user's pages.
- **Client Key Isolation**: Only the Supabase `anon` public key is bundled into the client build. Service role / admin keys are never exposed.
- **Cloud Storage File Limits**:
  - Images: Max 10MB per file.
  - Audio: Max 25MB per file.
  - Video: Max 50MB per file.
  - Total bucket limit: 50MB per upload.
- **Unpublished Draft Privacy**: Unauthenticated visitors querying unpublished drafts receive an empty response from PostgreSQL; the frontend displays a themed "Surprise Not Found / Unpublished" notice.
- **No Reliance on Creator LocalStorage**: Published pages and shared media are served strictly from remote cloud storage and PostgreSQL.

---

## 🧪 Testing and Verification

Run the automated test suite locally:
```bash
npm test
```
The test suite validates:
- Unique slug generation and draft states.
- Local and remote page persistence models.
- Data export serialization and stripping of ephemeral session blob URLs.
- Media upload size validations and error handling.
- URL-safe slug formatting for cross-platform link sharing.

---

## 📋 Known Limitations & Recommendations

- **Custom Audio & Video on Mobile**: Due to mobile operating system autoplay policies (iOS Safari & Chrome Android), background music starts when the user taps "Unwrap Gift" on the landing screen.
- **Video Storage**: Direct MP4 uploads to Supabase Storage are limited to 50MB. For larger 4K video files, embedding YouTube or Vimeo URLs in the video section is recommended.
- **Anonymous Session Expiration**: If a user creates pages via "Continue as Guest", their browser retains their session credentials. To preserve permanent access across multiple computers, signing up with an email account in the Creator Studio is recommended.
