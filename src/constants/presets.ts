import { BirthdayPageConfig, BuiltInAudioTrack, GiftBoxStyle, ThemePreset } from '../types';

export interface ThemePresetDetails {
  id: ThemePreset;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  bgGradient: string;
  cardBg: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  boxStyle: GiftBoxStyle;
  badge: string;
}

export const THEME_PRESETS: Record<ThemePreset, ThemePresetDetails> = {
  'romantic-rose': {
    id: 'romantic-rose',
    name: 'Romantic Rose',
    description: 'Blush pinks, warm crimson glows & delicate starlight',
    primaryColor: '#ec4899',
    accentColor: '#f43f5e',
    bgGradient: 'from-[#190614] via-[#2a0b22] to-[#0d020c]',
    cardBg: 'rgba(255, 100, 160, 0.08)',
    textColor: '#fdf2f8',
    headingFont: 'var(--font-playfair)',
    bodyFont: 'var(--font-outfit)',
    boxStyle: 'rose-blush',
    badge: 'Popular for Partners'
  },
  'luxury-gold': {
    id: 'luxury-gold',
    name: 'Luxury Midnight Gold',
    description: 'Deep obsidian black, champagne gold ribbons & royal sparkle',
    primaryColor: '#eab308',
    accentColor: '#f59e0b',
    bgGradient: 'from-[#0d0f14] via-[#1a170e] to-[#07080a]',
    cardBg: 'rgba(234, 179, 8, 0.08)',
    textColor: '#fefce8',
    headingFont: 'var(--font-cinzel)',
    bodyFont: 'var(--font-montserrat)',
    boxStyle: 'classic-gold-red',
    badge: 'VIP & Milestone'
  },
  'dreamy-pastel': {
    id: 'dreamy-pastel',
    name: 'Dreamy Pastel Sky',
    description: 'Soft lavender, cloud blue & cotton-candy sunset hues',
    primaryColor: '#a855f7',
    accentColor: '#38bdf8',
    bgGradient: 'from-[#120e2e] via-[#1e133d] to-[#0c0822]',
    cardBg: 'rgba(168, 85, 247, 0.08)',
    textColor: '#f5f3ff',
    headingFont: 'var(--font-dancing)',
    bodyFont: 'var(--font-outfit)',
    boxStyle: 'pastel-lavender',
    badge: 'Dreamy & Whimsical'
  },
  'cosmic-galaxy': {
    id: 'cosmic-galaxy',
    name: 'Cosmic Galaxy',
    description: 'Deep nebula indigo, starry cyan & neon ultraviolet',
    primaryColor: '#8b5cf6',
    accentColor: '#06b6d4',
    bgGradient: 'from-[#070b19] via-[#110e2b] to-[#04060f]',
    cardBg: 'rgba(139, 92, 246, 0.08)',
    textColor: '#f3e8ff',
    headingFont: 'var(--font-outfit)',
    bodyFont: 'var(--font-outfit)',
    boxStyle: 'holographic-cyan',
    badge: 'Futuristic & Vibrant'
  },
  'cute-sunshine': {
    id: 'cute-sunshine',
    name: 'Cute Sunshine & Coral',
    description: 'Warm coral, cheerful buttercup glow & playful energy',
    primaryColor: '#f97316',
    accentColor: '#fbbf24',
    bgGradient: 'from-[#1c0f08] via-[#26150b] to-[#0e0703]',
    cardBg: 'rgba(249, 115, 22, 0.08)',
    textColor: '#fff7ed',
    headingFont: 'var(--font-caveat)',
    bodyFont: 'var(--font-outfit)',
    boxStyle: 'classic-gold-red',
    badge: 'Joyful & Cheerful'
  },
  'emerald-elegance': {
    id: 'emerald-elegance',
    name: 'Emerald Royale',
    description: 'Deep forest green, rich velvet textures & regal gold leaf',
    primaryColor: '#10b981',
    accentColor: '#fbbf24',
    bgGradient: 'from-[#051610] via-[#09231b] to-[#020b08]',
    cardBg: 'rgba(16, 185, 129, 0.08)',
    textColor: '#ecfdf5',
    headingFont: 'var(--font-playfair)',
    bodyFont: 'var(--font-montserrat)',
    boxStyle: 'emerald-gold',
    badge: 'Timeless & Classy'
  },
  'minimalist-noir': {
    id: 'minimalist-noir',
    name: 'Minimalist Titanium',
    description: 'Ultra-clean silver tones, dark glass & cinematic focus',
    primaryColor: '#94a3b8',
    accentColor: '#f8fafc',
    bgGradient: 'from-[#0b0f19] via-[#111827] to-[#030712]',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    textColor: '#f8fafc',
    headingFont: 'var(--font-outfit)',
    bodyFont: 'var(--font-outfit)',
    boxStyle: 'royal-midnight',
    badge: 'Modern & Chic'
  }
};

export const GIFT_BOX_STYLES: Record<GiftBoxStyle, {
  name: string;
  boxColor: string;
  lidColor: string;
  ribbonColor: string;
  bowColor: string;
  glowColor: string;
}> = {
  'classic-gold-red': {
    name: 'Crimson Velvet & Royal Gold',
    boxColor: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)',
    lidColor: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    ribbonColor: 'linear-gradient(135deg, #fef08a 0%, #ca8a04 50%, #eab308 100%)',
    bowColor: '#facc15',
    glowColor: 'rgba(234, 179, 8, 0.4)'
  },
  'rose-blush': {
    name: 'Rose Gold & Blush Silk',
    boxColor: 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
    lidColor: 'linear-gradient(135deg, #fb7185 0%, #e11d48 100%)',
    ribbonColor: 'linear-gradient(135deg, #fce7f3 0%, #f472b6 50%, #fda4af 100%)',
    bowColor: '#f472b6',
    glowColor: 'rgba(244, 63, 94, 0.45)'
  },
  'royal-midnight': {
    name: 'Midnight Black & Platinum',
    boxColor: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    lidColor: 'linear-gradient(135deg, #334155 0%, #1e293b 100%)',
    ribbonColor: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 50%, #94a3b8 100%)',
    bowColor: '#e2e8f0',
    glowColor: 'rgba(148, 163, 184, 0.35)'
  },
  'holographic-cyan': {
    name: 'Cosmic Iridescent',
    boxColor: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    lidColor: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 100%)',
    ribbonColor: 'linear-gradient(135deg, #67e8f9 0%, #06b6d4 50%, #a5f3fc 100%)',
    bowColor: '#22d3ee',
    glowColor: 'rgba(6, 182, 212, 0.45)'
  },
  'emerald-gold': {
    name: 'Emerald & Gold Leaf',
    boxColor: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)',
    lidColor: 'linear-gradient(135deg, #059669 0%, #065f46 100%)',
    ribbonColor: 'linear-gradient(135deg, #fef08a 0%, #d97706 50%, #f59e0b 100%)',
    bowColor: '#fbbf24',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  'pastel-lavender': {
    name: 'Pastel Dream Lavender',
    boxColor: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    lidColor: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    ribbonColor: 'linear-gradient(135deg, #fdf4ff 0%, #f0abfc 50%, #e879f9 100%)',
    bowColor: '#f0abfc',
    glowColor: 'rgba(217, 70, 239, 0.4)'
  }
};

export const BUILT_IN_AUDIO_TRACKS: BuiltInAudioTrack[] = [
  {
    id: 'synth-happy-birthday-warm',
    title: 'Warm Acoustic Birthday Melodies',
    artist: 'Birthday Magic Studio',
    category: 'celebration',
    type: 'synth',
    durationEstimate: 'Looping Ambient'
  },
  {
    id: 'synth-dreamy-piano',
    title: 'Dreamy Starlight Piano & Bells',
    artist: 'Celestial Keys',
    category: 'dreamy',
    type: 'synth',
    durationEstimate: 'Looping Ambient'
  },
  {
    id: 'synth-romantic-strings',
    title: 'Heartfelt Romantic Strings & Harp',
    artist: 'Symphony of Love',
    category: 'romantic',
    type: 'synth',
    durationEstimate: 'Looping Ambient'
  },
  {
    id: 'synth-lofi-chill',
    title: 'Cozy Lofi Birthday Vibes',
    artist: 'Midnight Study Cafe',
    category: 'lofi',
    type: 'synth',
    durationEstimate: 'Looping Ambient'
  },
  {
    id: 'synth-cinematic-epic',
    title: 'Cinematic Grand Celebration Fanfare',
    artist: 'Golden Orchestra',
    category: 'cinematic',
    type: 'synth',
    durationEstimate: 'Looping Ambient'
  }
];

export const DEFAULT_DEMO_CONFIG: BirthdayPageConfig = {
  id: 'demo-sophia-25',
  slug: 'sophia-25th',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isPublished: true,
  recipientName: 'Sophia',
  nickname: 'Soph / Sunshine ☀️',
  birthDate: '1999-10-15',
  showAgeCountdown: true,
  targetAge: 25,
  pageTitle: "Happy 25th Birthday, Sophia! ✨",
  landingGreeting: 'A Little Surprise Made Just for You',
  heroHeadline: 'HAPPY 25TH BIRTHDAY, SOPHIA!',
  heroSubtitle: 'Today the whole universe pauses to celebrate the most incredible human being.',
  profilePhotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
  galleryHeading: 'Our Favorite Memories Together',
  gallerySubtitle: 'Every photograph holds a million smiles, endless adventures, and unforgettable laughter.',
  galleryPhotos: [
    {
      id: 'photo-1',
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
      caption: 'The golden hour sunset by the coast — your laugh echoed across the whole beach!',
      date: 'Summer 2023',
      aspectRatio: 'portrait'
    },
    {
      id: 'photo-2',
      url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
      caption: 'That random road trip coffee stop where we could not stop giggling.',
      date: 'Autumn 2023',
      aspectRatio: 'landscape'
    },
    {
      id: 'photo-3',
      url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80',
      caption: 'Celebrating your dream job milestone! So immensely proud of you.',
      date: 'Spring 2024',
      aspectRatio: 'square'
    },
    {
      id: 'photo-4',
      url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      caption: 'Pure radiant happiness on our mountain hike getaway.',
      date: 'Winter 2024',
      aspectRatio: 'portrait'
    }
  ],
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  videoTitle: 'A Special Birthday Video Message',
  videoDescription: 'Turn your sound up! Here is a little cinematic montage created just for your special day.',
  videoThumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  bgMusicTrackId: 'synth-happy-birthday-warm',
  customAudioUrl: '',
  voiceMessageUrl: '',
  voiceMessageSender: 'From your biggest fan',
  letterHeading: 'A Letter from the Heart',
  letterContent: `Dearest Sophia,

Happy 25th Birthday! 🎉

It feels like just yesterday we were dreaming about what the future holds, and watching you grow into the compassionate, brilliant, and utterly captivating person you are today has been the greatest gift of my life.

You bring so much light, laughter, and genuine warmth into every room you enter. Thank you for your endless kindness, your infectious laugh, and the way you always believe in the people around you.

May your 25th year overflow with wild adventures, peaceful mornings, big breakthroughs, and memories you will treasure forever.

I am forever grateful to walk beside you in this journey.`,
  letterClosing: 'Forever cheering for you with all my love,\n— Alex ❤️',
  letterEnvelopeColor: '#f43f5e',
  timelineHeading: 'Chapters of Our Journey',
  timelineSubtitle: 'Looking back at the milestones and magical days that brought us here.',
  timelineMemories: [
    {
      id: 'mem-1',
      yearOrDate: '2020 — Day One',
      title: 'The First Hello',
      description: 'The moment we first talked over matcha lattes and lost track of 4 hours.',
      imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
      tag: 'First Spark'
    },
    {
      id: 'mem-2',
      yearOrDate: '2022 — The Road Trip',
      title: 'Stargazing at the Coast',
      description: 'Singing 2000s pop anthems at top volume with windows down and ocean breeze.',
      imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
      tag: 'Adventure'
    },
    {
      id: 'mem-3',
      yearOrDate: '2023 — Big Moves',
      title: 'New City, New Dreams',
      description: 'Helping each other unpack 20 boxes and eating pizza on the floor.',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
      tag: 'Growth'
    },
    {
      id: 'mem-4',
      yearOrDate: 'Today — The 25th Milestone',
      title: 'The Best is Yet to Come',
      description: 'Entering a brand new chapter filled with infinite possibilities!',
      imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
      tag: 'Celebration'
    }
  ],
  cakeFlavor: 'vanilla-strawberry',
  candlesCount: 25,
  wishPrompt: 'Close your eyes, think of your biggest dream, and blow out the candles!',
  wishCompletedMessage: '✨ Your wish has been sent to the stars! May every dream come true this year! ✨',
  reasonsHeading: '8 Reasons Why You Are Truly Special',
  reasonsSubtitle: 'Just a tiny handful of the endless things that make you irreplaceable.',
  reasonsList: [
    {
      id: 'r-1',
      title: 'Your Radiant Smile',
      description: 'It can literally turn the gloomiest day into pure sunshine in 0.5 seconds.',
      emoji: '✨'
    },
    {
      id: 'r-2',
      title: 'Your Boundless Empathy',
      description: 'You listen not just to respond, but with your whole caring heart.',
      emoji: '💖'
    },
    {
      id: 'r-3',
      title: 'Your Creative Spark',
      description: 'The way your eyes light up when you talk about your passions and ideas.',
      emoji: '🎨'
    },
    {
      id: 'r-4',
      title: 'Your Unstoppable Drive',
      description: 'When you set your mind on a goal, there is literally nothing that can stop you.',
      emoji: '🚀'
    },
    {
      id: 'r-5',
      title: 'The Best Taste in Music & Food',
      description: 'Every playlist you curate is a masterpiece and you always find the hidden gems.',
      emoji: '🎶'
    },
    {
      id: 'r-6',
      title: 'Your Unfiltered Authenticity',
      description: 'You stay 100% true to who you are, inspiring everyone around you to do the same.',
      emoji: '🌟'
    },
    {
      id: 'r-7',
      title: 'How You Make Others Feel Valued',
      description: 'Nobody ever feels unseen or forgotten when you are in the room.',
      emoji: '🕊️'
    },
    {
      id: 'r-8',
      title: 'Your Chaotic Giggle Fits',
      description: 'Because laughing until our stomachs hurt is my favorite hobby with you.',
      emoji: '😂'
    }
  ],
  scratchTitle: 'Your Secret Birthday Mystery Card',
  scratchInstruction: 'Scratch or tap the golden card to reveal your hidden surprise gift voucher!',
  scratchSecretMessage: '🎟️ VIP PASS: All-Expense-Paid Dinner at Your Dream Restaurant + Weekend Spa Escape!',
  scratchGiftCode: 'BDAY-SOPHIA-VIP-2026',
  finalSurpriseHeadline: 'Here is to Your Most Incredible Year Yet!',
  finalSurpriseMessage: 'Never forget how deeply you are loved, cherished, and celebrated today and every single day.',
  finalButtonText: 'Pop Massive Fireworks & Confetti! 🎆',
  theme: {
    preset: 'romantic-rose',
    fontPairing: 'elegant-serif',
    giftBoxStyle: 'rose-blush',
    primaryColor: '#ec4899',
    accentColor: '#f43f5e',
    bgColorStart: '#190614',
    bgColorEnd: '#0d020c',
    particleType: 'hearts',
    particleDensity: 'high',
    enableSoundEffects: true,
    enableAmbientFloating: true
  },
  sections: {
    giftLanding: true,
    celebrationHero: true,
    photoGallery: true,
    birthdayVideo: true,
    personalLetter: true,
    memoryTimeline: true,
    birthdayCake: true,
    reasonsSpecial: true,
    scratchSurprise: true,
    finalCelebration: true
  },
  sectionsOrder: [
    'giftLanding',
    'celebrationHero',
    'photoGallery',
    'birthdayVideo',
    'personalLetter',
    'memoryTimeline',
    'birthdayCake',
    'reasonsSpecial',
    'scratchSurprise',
    'finalCelebration'
  ]
};
