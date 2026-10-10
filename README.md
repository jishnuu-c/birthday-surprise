# Birthday Magic — Premium Interactive Birthday Surprise Experience ✨🎂

**Birthday Magic** is a production-quality, personalized, cinematic birthday surprise web application designed to create unforgettable moments for friends, family, and loved ones.

It comes with an interactive 3D gift-opening experience, personalized celebrations, photo gallery slideshow, handwritten letter with typewriter reveal, milestone timeline, interactive candle-blowing birthday cake (with optional live microphone detection), mystery scratch card, background music synthesizer, and an admin Studio Editor with real-time mobile preview.

---

## 🌟 Key Features

### 1. Interactive 3D Gift Box Landing Screen
- Realistic 3D gift box with silk ribbons, bow, glowing particles, and personalized gift tag.
- Interactive unwrap sequence with sound effects, particle burst, and confetti cannons.
- Compliant with mobile autoplay policies (audio triggers on user interaction).
- Optional skip button for immediate viewing.

### 2. Personalized Birthday Celebration Screen
- Cinematic typography with shimmering glowing gradients.
- 3D tilted photo frame with ambient rotating neon aura.
- Personalized subtitle, floating celebratory balloons, and milestone age badge.

### 3. Personal Photo Gallery ("Our Memories")
- Responsive masonry grid and animated slideshow.
- Fullscreen lightbox with zoom, prev/next controls, and captions.
- Drag-and-drop uploads with automatic client-side image compression.

### 4. Personal Birthday Video Surprise
- Cinematic video player with ambient backlighting.
- Support for uploaded MP4 videos, YouTube, and Vimeo embeds.
- Custom thumbnails and mobile-friendly touch controls.

### 5. Handwritten Letter with Wax Seal & Typewriter Reveal
- Interactive vintage/modern envelope with wax seal pop animation.
- Unfolding paper aesthetic with handwritten typography (`Caveat` & `Dancing Script`).
- Typewriter text reveal with "Show All Instantly" toggle and love signature.

### 6. Interactive Memory Timeline
- Milestone journey with dates, stories, photos, and glowing timeline nodes.

### 7. Interactive Birthday Cake & Make a Wish
- Realistic 3D cake with glowing candles and flickering flame animations.
- "Blow Out Candles" button OR live microphone blow detection via Web Audio Analyser!
- Smoke puff effect, sparkling heart confetti, and wish-sent confirmation banner.

### 8. Reasons You Are Special
- Flippable tarot/polaroid-style cards detailing heartfelt qualities and memories.

### 9. Secret Scratch-to-Reveal Mystery Card
- HTML5 Canvas golden scratch card to reveal a secret gift code or dinner voucher.

### 10. Grand Fireworks Finale & Social Sharing
- Fullscreen fireworks and confetti explosion.
- Dynamic QR code generation for physical cards/boxes.
- 1-Click WhatsApp, Telegram, SMS, and public link sharing.

### 11. Complete Admin Studio & Customizer
- **Basic Details**: Recipient name, nickname, age, date, greetings, letter, and signature.
- **Media Manager**: Profile photo, gallery photo reordering, video URL, background audio tracks, and custom voice notes.
- **Theme Customizer**: 7 preset themes, 6 gift box wrapping styles, 5 font pairings, and particle density controls.
- **Section Manager**: Toggle any section ON/OFF, customize titles, and manage timeline/reasons/cake items.
- **Publish & Share**: Public link generator, portable zero-server URL encoding, QR code download, and JSON backup export/import.
- **Live Split-Screen Preview**: Mobile mockup (iPhone/Android), tablet, and desktop views with real-time updates.

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- Node.js 18+ or 20+
- npm

### 2. Installation
```bash
# Navigate to project directory
cd wish_site

# Install dependencies
npm install
```

### 3. Run Locally
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to explore the experience!

---

## 🗄️ Database & Cloud Persistence (Supabase Setup - Optional)

The app is 100% functional out-of-the-box using local browser storage and portable URL encoding. To sync configurations and uploaded media to a remote cloud PostgreSQL database:

1. Create a free project at [Supabase](https://supabase.com).
2. Go to **SQL Editor** in Supabase and run the script located at `supabase/schema.sql`.
3. Copy your project URL and `anon` public key into a `.env` file:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Restart the Vite dev server (`npm run dev`).

---

## 🌐 Production Deployment

You can deploy Birthday Magic to Vercel, Netlify, or GitHub Pages with a single command:

### Deploy to Vercel:
```bash
npx vercel
```

### Deploy to Netlify:
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

Ensure the client-side routing fallback is set to `index.html` (already configured for SPA routing).

---

## 💖 Built with
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React Icons
- Canvas Confetti
- QRCode.react
- Web Audio API Synthesizer
