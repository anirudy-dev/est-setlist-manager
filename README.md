# 🎸 EST Setlist Manager
**Every Second Tuesday** — Setlist management tool for the band.

---

## ⚡ What It Does

- Master catalogue of all 45 songs with duration, decade, mood
- Create gigs and multiple setlists per gig
- Drag songs from the catalogue directly into setlists
- Reorder songs within a setlist
- Auto-calculates total set duration
- Export setlists as PDF
- Print-formatted setlists
- All data shared in real-time between bandmates
- **Stage mode** — phone-first dark view of a gig's setlists, with swipe to advance, screen wake lock, and set-transition cues. Open via the `▶ STAGE` button on a gig, or directly at `/stage/<gigId>`.

---

## 🚀 Full Setup Guide

### Step 1 — Supabase (Database)

1. Go to **[supabase.com](https://supabase.com)** → Sign Up (free)
2. Click **New Project**, name it `est-setlist`
3. Choose a region close to you, set a DB password, click **Create**
4. Wait ~2 minutes for it to spin up
5. Go to **SQL Editor** in the left sidebar
6. Paste the contents of `supabase-schema.sql` and click **Run**
7. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public** key (long string starting with `eyJ...`)

---

### Step 2 — GitHub

1. Go to **[github.com](https://github.com)** → Sign in
2. Click **New Repository** (green button top right)
3. Name it: `est-setlist-manager`
4. Set to **Private** (recommended for band use)
5. Click **Create repository**
6. On your computer, open Terminal and run:

```bash
# Install Node.js first if you don't have it: https://nodejs.org

# Clone or init your repo
cd ~/Desktop
git init est-setlist-manager
cd est-setlist-manager

# Copy all the project files into this folder
# (from wherever you downloaded the zip)

# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials (see Step 1)

# Test locally first
npm run dev
# Visit http://localhost:3000 — password is EST2026@!

# Push to GitHub
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/est-setlist-manager.git
git push -u origin main
```

---

### Step 3 — Vercel (Hosting)

1. Go to **[vercel.com](https://vercel.com)** → Sign Up with GitHub
2. Click **Add New → Project**
3. Find and select `est-setlist-manager` → Click **Import**
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...your-key...
   NEXT_PUBLIC_APP_PASSWORD = EST2026@!
   ```
5. Click **Deploy**
6. Vercel gives you a URL like `https://est-setlist-manager.vercel.app`
7. Share this URL + the password `EST2026@!` with your bandmates

---

### Step 4 — Custom Domain (Optional)

If you want something like `setlist.everysecondtuesday.ca`:
1. In Vercel → your project → **Settings → Domains**
2. Add your domain and follow the DNS instructions
3. Usually takes 10–30 minutes to go live

---

## 🔧 Local Development

```bash
npm install
cp .env.local.example .env.local
# Fill in your Supabase credentials in .env.local
npm run dev
```

Visit `http://localhost:3000`

---

## 🔐 Password

The password `EST2026@!` is set via the `NEXT_PUBLIC_APP_PASSWORD` environment variable.

To change it:
1. Update the value in Vercel → Settings → Environment Variables
2. Redeploy (Vercel → Deployments → Redeploy)

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx          ← Login page
│   ├── dashboard/
│   │   └── page.tsx      ← Main app
│   ├── stage/
│   │   └── [gigId]/
│   │       └── page.tsx  ← Phone-first stage mode
│   └── globals.css
├── components/
│   ├── MasterSongList    ← Left column: song catalogue
│   ├── GigPanel          ← Center: gig management
│   ├── SetlistPanel      ← Center: individual setlist + DnD
├── data/
│   └── songs.ts          ← All 45 songs with metadata
└── lib/
    ├── supabase.ts        ← Database functions
    └── export.ts          ← PDF + print export
```

---

## 🎵 Song Catalogue

45 songs across 5 decades:
- **1960s** — 10 songs (The Doors, Beatles, Hendrix, Cream...)
- **1970s** — 16 songs (Zeppelin, Floyd, Sabbath, Aerosmith...)
- **1980s** — 6 songs (Journey, Bon Jovi, AC/DC...)
- **1990s** — 5 songs (Foo Fighters, RHCP, Blink-182...)
- **2000s** — 8 songs (The Killers, White Stripes, Kings of Leon...)

To add new songs, edit `src/data/songs.ts`.

---

## 🛠 Tech Stack

- [Next.js 14](https://nextjs.org) — React framework
- [Supabase](https://supabase.com) — Postgres database (free tier)
- [Vercel](https://vercel.com) — Hosting (free tier)
- [@dnd-kit](https://dndkit.com) — Drag and drop
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export
- [Tailwind CSS](https://tailwindcss.com) — Styling

---

## 🆘 Common Issues

**"Cannot connect to database"**
→ Check your Supabase URL and anon key in `.env.local`

**"Drag and drop not working"**
→ Make sure you're dragging at least 8px before releasing

**Songs not saving after refresh**
→ Your Supabase database might not be set up — run the SQL schema

---

everysecondtuesday.ca · @everysecondtuesday
