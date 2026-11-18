export type InvitationStatus = 'draft' | 'published' | 'expired';
export type InvitationLanguage = 'en' | 'hi' | 'both';
export type ThemeKey = 'rose' | 'royal' | 'minimal' | 'traditional';
export type AnimationStyle = 'petals' | 'envelope' | 'royal-curtain' | 'subtle';
export type MusicTrack = 'shehnai-bliss' | 'flute-serenity' | 'royal-sitar' | 'none';
export type RsvpAttendance = 'attending' | 'declined' | 'maybe';

export const LIMITS = {
  slugRegex: /^[a-z0-9-]+$/,
  idRegex: /^[a-zA-Z0-9_-]+$/,
  nameMax: 120,
  shortTextMax: 200,
  bioMax: 600,
  storyMax: 2000,
  messageMax: 1200,
  wishMax: 500,
  urlMax: 1000,
  addressMax: 400,
  phoneMax: 40,
  complimentsMax: 12,
  complimentItemMax: 120,
  rsvpGuestsMax: 30,
};

export interface CustomColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface SectionsEnabled {
  ganeshVandana: boolean;
  dateReveal: boolean;
  countdown: boolean;
  coupleIntro: boolean;
  coupleStory: boolean;
  familyDetails: boolean;
  events: boolean;
  gallery: boolean;
  venueMap: boolean;
  rsvp: boolean;
  guestWishes: boolean;
  compliments: boolean;
}

export interface StudioSettings {
  id: string;
  businessName: string;
  tagline?: string;
  address: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  whatsappNumber?: string;
  email?: string;
  websiteDomain?: string;
  logoUrl?: string;
  defaultLanguage?: InvitationLanguage;
  ownerUid: string;
  updatedAt?: unknown;
}

export interface TemplatePreset {
  id: string;
  name: string;
  themeKey: ThemeKey;
  description?: string;
  previewImageUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  displayFont?: string;
  bodyFont?: string;
  animationStyle?: AnimationStyle;
  isActive: boolean;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ClientRecord {
  id: string;
  brideName: string;
  groomName: string;
  primaryContactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  notes?: string;
  status: 'active' | 'archived';
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InvitationRecord {
  id: string;
  slug: string;
  clientId?: string;
  status: InvitationStatus;
  isArchived: boolean;
  expiresAt?: string;
  brideName: string;
  groomName: string;
  brideNameHi?: string;
  groomNameHi?: string;
  brideBio?: string;
  groomBio?: string;
  coupleStory?: string;
  bridePhotoUrl?: string;
  groomPhotoUrl?: string;
  couplePhotoUrl?: string;
  weddingDate: string;
  weddingTime?: string;
  language: InvitationLanguage;
  ganeshVandana?: boolean;
  ganeshVandanaText?: string;
  brideParents?: string;
  groomParents?: string;
  brideGrandparents?: string;
  groomGrandparents?: string;
  familyMessage?: string;
  familyMessageHi?: string;
  gotra?: string;
  familyCompliments?: string[];
  primaryVenueName?: string;
  primaryVenueAddress?: string;
  primaryMapUrl?: string;
  thankYouMessage?: string;
  theme: ThemeKey;
  customColors?: CustomColors;
  typography?: string;
  animationStyle?: AnimationStyle;
  musicTrack?: MusicTrack;
  sectionsEnabled?: SectionsEnabled;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WeddingEvent {
  id: string;
  invitationId: string;
  title: string;
  titleHi?: string;
  eventDate: string;
  eventTime?: string;
  venue?: string;
  venueAddress?: string;
  googleMapsUrl?: string;
  description?: string;
  sortOrder: number;
  isPublic: boolean;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GalleryPhoto {
  id: string;
  invitationId: string;
  imageUrl: string;
  caption?: string;
  sortOrder: number;
  isPublic: boolean;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GuestRecord {
  id: string;
  invitationId: string;
  guestName: string;
  familyGroup?: string;
  phone?: string;
  personalNote?: string;
  inviteCode: string;
  ownerUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GuestPass {
  id: string;
  invitationId: string;
  guestName: string;
  personalNote?: string;
  isPublic: boolean;
  ownerUid: string;
  createdAt?: unknown;
}

export interface RsvpRecord {
  id: string;
  invitationId: string;
  guestName: string;
  phone?: string;
  attending: RsvpAttendance;
  guestsCount: number;
  eventsAttending?: string[];
  message?: string;
  createdAt?: unknown;
}

export interface GuestWish {
  id: string;
  invitationId: string;
  guestName: string;
  cityOrRelation?: string;
  message: string;
  isPublic: boolean;
  createdAt?: unknown;
}

export interface UploadedMediaFile {
  filename: string;
  url: string;
  sizeBytes: number;
  uploadedAt: string;
}
