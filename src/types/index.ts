export type ThemePreset = 
  | 'romantic-rose'
  | 'luxury-gold'
  | 'dreamy-pastel'
  | 'cosmic-galaxy'
  | 'cute-sunshine'
  | 'emerald-elegance'
  | 'minimalist-noir';

export type FontPairing = 
  | 'modern-sans'
  | 'elegant-serif'
  | 'playful-script'
  | 'luxury-display'
  | 'handwritten-warm';

export type GiftBoxStyle = 
  | 'classic-gold-red'
  | 'rose-blush'
  | 'royal-midnight'
  | 'holographic-cyan'
  | 'emerald-gold'
  | 'pastel-lavender';

export interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  date?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape';
}

export interface TimelineMemory {
  id: string;
  yearOrDate: string;
  title: string;
  description: string;
  imageUrl?: string;
  tag?: string;
}

export interface SpecialReason {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  emoji?: string;
}

export interface ThemeSettings {
  preset: ThemePreset;
  fontPairing: FontPairing;
  giftBoxStyle: GiftBoxStyle;
  primaryColor: string;
  accentColor: string;
  bgColorStart: string;
  bgColorEnd: string;
  particleType: 'hearts' | 'stars' | 'sparkles' | 'confetti' | 'bubbles';
  particleDensity: 'low' | 'medium' | 'high';
  enableSoundEffects: boolean;
  enableAmbientFloating: boolean;
}

export interface SectionsConfig {
  giftLanding: boolean;
  celebrationHero: boolean;
  photoGallery: boolean;
  birthdayVideo: boolean;
  personalLetter: boolean;
  memoryTimeline: boolean;
  birthdayCake: boolean;
  reasonsSpecial: boolean;
  scratchSurprise: boolean;
  finalCelebration: boolean;
}

export interface BirthdayPageConfig {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
  passcode?: string;

  // Recipient details
  recipientName: string;
  nickname?: string;
  birthDate?: string;
  showAgeCountdown?: boolean;
  targetAge?: number;

  // Copy & Personalization
  pageTitle: string;
  landingGreeting: string;
  heroHeadline: string;
  heroSubtitle: string;

  // Media
  profilePhotoUrl: string;
  galleryPhotos: GalleryPhoto[];
  galleryHeading: string;
  gallerySubtitle: string;

  // Video
  videoUrl?: string;
  videoTitle?: string;
  videoDescription?: string;
  videoThumbnailUrl?: string;

  // Audio & Music
  bgMusicTrackId: string;
  customAudioUrl?: string;
  voiceMessageUrl?: string;
  voiceMessageSender?: string;

  // Personal Letter
  letterHeading: string;
  letterContent: string;
  letterClosing: string;
  letterEnvelopeColor: string;

  // Interactive Memory Timeline
  timelineHeading: string;
  timelineSubtitle: string;
  timelineMemories: TimelineMemory[];

  // Interactive Birthday Cake & Wish
  cakeFlavor: 'chocolate' | 'vanilla-strawberry' | 'red-velvet' | 'rainbow';
  candlesCount: number;
  wishPrompt: string;
  wishCompletedMessage: string;

  // Reasons Why Special
  reasonsHeading: string;
  reasonsSubtitle: string;
  reasonsList: SpecialReason[];

  // Scratch / Secret Reveal
  scratchTitle: string;
  scratchInstruction: string;
  scratchSecretMessage: string;
  scratchGiftCode?: string;

  // Final Celebration
  finalSurpriseHeadline: string;
  finalSurpriseMessage: string;
  finalButtonText: string;

  // Theme & Sections
  theme: ThemeSettings;
  sections: SectionsConfig;
  sectionsOrder: (keyof SectionsConfig)[];
}

export interface BuiltInAudioTrack {
  id: string;
  title: string;
  artist: string;
  category: 'romantic' | 'cinematic' | 'celebration' | 'dreamy' | 'lofi';
  type: 'synth' | 'url';
  url?: string;
  durationEstimate: string;
}
