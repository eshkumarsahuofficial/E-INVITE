import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Eye,
  GripVertical,
  ImagePlus,
  Loader2,
  Monitor,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  CURATED_STUDIO_IMAGES,
  DEFAULT_SECTIONS_ENABLED,
  THEME_DEFINITIONS,
  TYPOGRAPHY_OPTIONS,
} from '../../data/presets';
import { saveInvitationWithChildren, uploadStudioImage } from '../../lib/firestoreService';
import type {
  AnimationStyle,
  ClientRecord,
  GalleryPhoto,
  InvitationLanguage,
  InvitationRecord,
  InvitationStatus,
  MusicTrack,
  SectionsEnabled,
  StudioSettings,
  ThemeKey,
  WeddingEvent,
} from '../../types/wedding';
import { SafeImage } from '../common/SafeImage';
import { PublicInvitationView } from '../public/PublicInvitationView';
import { PhotoUploadInput } from './PhotoUploadInput';

interface InvitationWizardProps {
  initialInvitation?: InvitationRecord | null;
  initialEvents?: WeddingEvent[];
  initialGallery?: GalleryPhoto[];
  clients: ClientRecord[];
  existingSlugs: string[];
  studioSettings: StudioSettings;
  onCancel: () => void;
  onSaved: (slug: string) => void;
}

const STEPS = [
  '01. Couple Details',
  '02. Family Details',
  '03. Wedding Events',
  '04. Photo Gallery',
  '05. Design Selection',
  '06. Preview & Publish',
];

function slugifyCouple(groom: string, bride: string): string {
  return `${groom}-${bride}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export const InvitationWizard: React.FC<InvitationWizardProps> = ({
  initialInvitation,
  initialEvents = [],
  initialGallery = [],
  clients,
  existingSlugs,
  studioSettings,
  onCancel,
  onSaved,
}) => {
  const isEditing = Boolean(initialInvitation);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Form State — Step 1: Couple Details
  const [clientId, setClientId] = useState(initialInvitation?.clientId || '');
  const [groomName, setGroomName] = useState(initialInvitation?.groomName || '');
  const [brideName, setBrideName] = useState(initialInvitation?.brideName || '');
  const [groomNameHi, setGroomNameHi] = useState(initialInvitation?.groomNameHi || '');
  const [brideNameHi, setBrideNameHi] = useState(initialInvitation?.brideNameHi || '');
  const [slug, setSlug] = useState(initialInvitation?.slug || '');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [weddingDate, setWeddingDate] = useState(initialInvitation?.weddingDate || '2027-02-18');
  const [weddingTime, setWeddingTime] = useState(initialInvitation?.weddingTime || '07:30 PM');
  const [language, setLanguage] = useState<InvitationLanguage>(initialInvitation?.language || 'both');
  const [groomPhotoUrl, setGroomPhotoUrl] = useState(
    initialInvitation?.groomPhotoUrl || CURATED_STUDIO_IMAGES.groomPortrait
  );
  const [bridePhotoUrl, setBridePhotoUrl] = useState(
    initialInvitation?.bridePhotoUrl || CURATED_STUDIO_IMAGES.bridePortrait
  );
  const [couplePhotoUrl, setCouplePhotoUrl] = useState(
    initialInvitation?.couplePhotoUrl || CURATED_STUDIO_IMAGES.couplePortrait
  );
  const [groomBio, setGroomBio] = useState(initialInvitation?.groomBio || '');
  const [brideBio, setBrideBio] = useState(initialInvitation?.brideBio || '');
  const [coupleStory, setCoupleStory] = useState(initialInvitation?.coupleStory || '');

  // Form State — Step 2: Family Details
  const [ganeshVandana, setGaneshVandana] = useState(initialInvitation?.ganeshVandana ?? true);
  const [ganeshVandanaText, setGaneshVandanaText] = useState(
    initialInvitation?.ganeshVandanaText ||
      'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥'
  );
  const [groomParents, setGroomParents] = useState(initialInvitation?.groomParents || '');
  const [brideParents, setBrideParents] = useState(initialInvitation?.brideParents || '');
  const [groomGrandparents, setGroomGrandparents] = useState(initialInvitation?.groomGrandparents || '');
  const [brideGrandparents, setBrideGrandparents] = useState(initialInvitation?.brideGrandparents || '');
  const [gotra, setGotra] = useState(initialInvitation?.gotra || '');
  const [familyMessage, setFamilyMessage] = useState(
    initialInvitation?.familyMessage ||
      'With the blessings of our elders, we cordially invite you and your family to celebrate the auspicious wedding of our beloved children.'
  );
  const [familyMessageHi, setFamilyMessageHi] = useState(
    initialInvitation?.familyMessageHi ||
      'परमपिता परमेश्वर एवं बुजुर्गों के आशीर्वाद से शुभ विवाह समारोह में सपरिवार पधारने का स्नेहभरा निमंत्रण।'
  );
  const [complimentsText, setComplimentsText] = useState(
    (initialInvitation?.familyCompliments || ['All Family Members & Well-Wishers']).join(', ')
  );
  const [primaryVenueName, setPrimaryVenueName] = useState(initialInvitation?.primaryVenueName || '');
  const [primaryVenueAddress, setPrimaryVenueAddress] = useState(initialInvitation?.primaryVenueAddress || '');
  const [primaryMapUrl, setPrimaryMapUrl] = useState(initialInvitation?.primaryMapUrl || '');
  const [thankYouMessage, setThankYouMessage] = useState(
    initialInvitation?.thankYouMessage ||
      'Your gracious presence and blessings will make this celebration truly memorable.'
  );

  // Form State — Step 3: Events
  const [events, setEvents] = useState<
    Array<{
      id: string;
      title: string;
      titleHi: string;
      eventDate: string;
      eventTime: string;
      venue: string;
      venueAddress: string;
      googleMapsUrl: string;
      description: string;
    }>
  >(
    initialEvents.length > 0
      ? initialEvents.map((e) => ({
          id: e.id,
          title: e.title,
          titleHi: e.titleHi || '',
          eventDate: e.eventDate,
          eventTime: e.eventTime || '',
          venue: e.venue || '',
          venueAddress: e.venueAddress || '',
          googleMapsUrl: e.googleMapsUrl || '',
          description: e.description || '',
        }))
      : [
          {
            id: `evt-${Date.now()}-1`,
            title: 'Haldi & Mehendi Ceremony',
            titleHi: 'हल्दी एवं मेहंदी समारोह',
            eventDate: weddingDate,
            eventTime: '11:00 AM',
            venue: 'Family Courtyard',
            venueAddress: '',
            googleMapsUrl: '',
            description: 'Traditional morning rituals, folk songs, and lunch.',
          },
          {
            id: `evt-${Date.now()}-2`,
            title: 'Shubh Vivah & Reception',
            titleHi: 'शुभ विवाह एवं प्रीतिभोज',
            eventDate: weddingDate,
            eventTime: '07:30 PM',
            venue: primaryVenueName || 'Royal Heritage Lawns',
            venueAddress: primaryVenueAddress || 'Rajnandgaon, Chhattisgarh',
            googleMapsUrl: primaryMapUrl || '',
            description: 'Baraat welcome, Varmala, and wedding dinner.',
          },
        ]
  );

  // Form State — Step 4: Photo Gallery
  const [gallery, setGallery] = useState<Array<{ id: string; imageUrl: string; caption: string }>>(
    initialGallery.length > 0
      ? initialGallery.map((g) => ({
          id: g.id,
          imageUrl: g.imageUrl,
          caption: g.caption || '',
        }))
      : [
          {
            id: `gal-${Date.now()}-1`,
            imageUrl: CURATED_STUDIO_IMAGES.couplePortrait,
            caption: 'Our pre-wedding portrait',
          },
          {
            id: `gal-${Date.now()}-2`,
            imageUrl: CURATED_STUDIO_IMAGES.mandapHero,
            caption: 'Wedding mandap venue',
          },
        ]
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Form State — Step 5: Design Selection
  const [theme, setTheme] = useState<ThemeKey>(initialInvitation?.theme || 'traditional');
  const [customColors, setCustomColors] = useState(
    initialInvitation?.customColors || { ...THEME_DEFINITIONS.traditional.colors }
  );
  const [typography, setTypography] = useState(initialInvitation?.typography || 'playfair-lora');
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>(
    initialInvitation?.animationStyle || 'envelope'
  );
  const [musicTrack, setMusicTrack] = useState<MusicTrack>(
    initialInvitation?.musicTrack || 'shehnai-bliss'
  );
  const [sectionsEnabled, setSectionsEnabled] = useState<SectionsEnabled>({
    ...DEFAULT_SECTIONS_ENABLED,
    ...(initialInvitation?.sectionsEnabled || {}),
  });

  // Form State — Step 6: Expiry & Publish
  const [expiresAt, setExpiresAt] = useState(initialInvitation?.expiresAt || '');

  const handleCoupleNameChange = (nextGroom: string, nextBride: string) => {
    setGroomName(nextGroom);
    setBrideName(nextBride);
    if (!slugTouched && !isEditing) {
      setSlug(slugifyCouple(nextGroom, nextBride));
    }
  };

  const handleThemeSelect = (key: ThemeKey) => {
    setTheme(key);
    setCustomColors({ ...THEME_DEFINITIONS[key].colors });
  };

  const handleGalleryMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setGalleryUploading(true);
    setError('');
    try {
      const uploaded: Array<{ id: string; imageUrl: string; caption: string }> = [];
      for (let i = 0; i < files.length; i += 1) {
        const res = await uploadStudioImage(files[i]);
        uploaded.push({
          id: `gal-${Date.now()}-${i}`,
          imageUrl: res.url,
          caption: files[i].name.replace(/\.[^.]+$/, ''),
        });
      }
      setGallery((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload gallery photo');
    } finally {
      setGalleryUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  const handleReplacePhoto = async (index: number, file: File) => {
    setGalleryUploading(true);
    try {
      const res = await uploadStudioImage(file);
      setGallery((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, imageUrl: res.url } : item))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace photo');
    } finally {
      setGalleryUploading(false);
    }
  };

  const moveGalleryItem = (from: number, to: number) => {
    if (to < 0 || to >= gallery.length || from === to) return;
    setGallery((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const addEvent = () => {
    setEvents((prev) => [
      ...prev,
      {
        id: `evt-${Date.now()}`,
        title: '',
        titleHi: '',
        eventDate: weddingDate,
        eventTime: '',
        venue: primaryVenueName,
        venueAddress: primaryVenueAddress,
        googleMapsUrl: primaryMapUrl,
        description: '',
      },
    ]);
  };

  const buildInvitationPayload = (status: InvitationStatus): Omit<InvitationRecord, 'ownerUid' | 'createdAt' | 'updatedAt'> => {
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
    return {
      id: cleanSlug,
      slug: cleanSlug,
      clientId,
      status,
      isArchived: false,
      expiresAt,
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      brideNameHi: brideNameHi.trim(),
      groomNameHi: groomNameHi.trim(),
      brideBio: brideBio.trim(),
      groomBio: groomBio.trim(),
      coupleStory: coupleStory.trim(),
      bridePhotoUrl: bridePhotoUrl.trim(),
      groomPhotoUrl: groomPhotoUrl.trim(),
      couplePhotoUrl: couplePhotoUrl.trim(),
      weddingDate,
      weddingTime: weddingTime.trim(),
      language,
      ganeshVandana,
      ganeshVandanaText: ganeshVandanaText.trim(),
      brideParents: brideParents.trim(),
      groomParents: groomParents.trim(),
      brideGrandparents: brideGrandparents.trim(),
      groomGrandparents: groomGrandparents.trim(),
      familyMessage: familyMessage.trim(),
      familyMessageHi: familyMessageHi.trim(),
      gotra: gotra.trim(),
      familyCompliments: complimentsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
      primaryVenueName: primaryVenueName.trim(),
      primaryVenueAddress: primaryVenueAddress.trim(),
      primaryMapUrl: primaryMapUrl.trim(),
      thankYouMessage: thankYouMessage.trim(),
      theme,
      customColors,
      typography,
      animationStyle,
      musicTrack,
      sectionsEnabled,
    };
  };

  const validateBeforeSave = (): boolean => {
    setError('');
    if (!groomName.trim() || !brideName.trim()) {
      setError('Both Groom and Bride names are required in Step 1.');
      setStep(0);
      return false;
    }
    const cleanSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(cleanSlug) || cleanSlug.length < 2 || cleanSlug === 'admin') {
      setError('URL Slug must be at least 2 lowercase letters, numbers, or hyphens (and cannot be "admin").');
      setStep(0);
      return false;
    }
    if (!isEditing && existingSlugs.includes(cleanSlug)) {
      setError(`The invitation URL "/${cleanSlug}" already exists. Choose a unique slug.`);
      setStep(0);
      return false;
    }
    if (!weddingDate) {
      setError('Wedding date is required.');
      setStep(0);
      return false;
    }
    return true;
  };

  const handleSave = async (targetStatus: InvitationStatus) => {
    if (!validateBeforeSave()) return;
    setSaving(true);
    setError('');
    try {
      const inv = buildInvitationPayload(targetStatus);
      const validEvents = events
        .filter((e) => e.title.trim())
        .map((e, idx) => ({
          id: e.id,
          title: e.title.trim(),
          titleHi: e.titleHi.trim(),
          eventDate: e.eventDate || weddingDate,
          eventTime: e.eventTime.trim(),
          venue: e.venue.trim(),
          venueAddress: e.venueAddress.trim(),
          googleMapsUrl: e.googleMapsUrl.trim(),
          description: e.description.trim(),
          sortOrder: idx + 1,
        }));

      const validGallery = gallery
        .filter((g) => g.imageUrl.trim())
        .map((g, idx) => ({
          id: g.id,
          imageUrl: g.imageUrl.trim(),
          caption: g.caption.trim(),
          sortOrder: idx + 1,
        }));

      await saveInvitationWithChildren(inv, validEvents, validGallery);
      onSaved(inv.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invitation');
    } finally {
      setSaving(false);
    }
  };

  const previewInvitationObj: InvitationRecord = {
    ...buildInvitationPayload('published'),
    ownerUid: 'preview',
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
      {/* Wizard Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-stone-50/70">
        <div>
          <p className="text-xs uppercase tracking-widest text-stone-500">
            {isEditing ? `Editing /invite/${initialInvitation?.slug}` : 'New Client Invitation'}
          </p>
          <h2 className="text-xl font-display-cormorant font-semibold text-stone-900">
            {groomName && brideName ? `${groomName} & ${brideName}` : 'Invitation Builder'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('draft')}
            className="px-3.5 py-2 text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave('published')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#881337] rounded-lg hover:bg-[#6D0F2C] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Publish Live
          </button>
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="px-6 py-3 border-b border-stone-200 bg-white overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {STEPS.map((label, idx) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(idx)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                step === idx
                  ? 'bg-stone-900 text-white'
                  : idx < step
                    ? 'bg-stone-100 text-stone-800 hover:bg-stone-200'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Step Body */}
      <div className="p-6">
        {/* STEP 1: Couple Details */}
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Link to Client Record (Optional)</label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    const selected = clients.find((c) => c.id === e.target.value);
                    setClientId(e.target.value);
                    if (selected && !groomName && !brideName) {
                      handleCoupleNameChange(selected.groomName, selected.brideName);
                    }
                  }}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                >
                  <option value="">Standalone Invitation</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.groomName} & {c.brideName} ({c.city || c.primaryContactName || 'Client'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Groom Name *</label>
                  <input
                    type="text"
                    value={groomName}
                    onChange={(e) => handleCoupleNameChange(e.target.value, brideName)}
                    placeholder="Amit"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bride Name *</label>
                  <input
                    type="text"
                    value={brideName}
                    onChange={(e) => handleCoupleNameChange(groomName, e.target.value)}
                    placeholder="Gauri"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Groom Name (हिन्दी)</label>
                  <input
                    type="text"
                    value={groomNameHi}
                    onChange={(e) => setGroomNameHi(e.target.value)}
                    placeholder="अमित"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bride Name (हिन्दी)</label>
                  <input
                    type="text"
                    value={brideNameHi}
                    onChange={(e) => setBrideNameHi(e.target.value)}
                    placeholder="गौरी"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Permanent Invitation URL Slug *
                </label>
                <div className="flex items-center rounded-xl border border-stone-200 overflow-hidden bg-stone-50">
                  <span className="px-3 py-2 text-xs font-mono-tabular text-stone-500 border-r border-stone-200">
                    {studioSettings.websiteDomain || 'invite.capturestudio.in'}/
                  </span>
                  <input
                    type="text"
                    disabled={isEditing}
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    placeholder="amit-gauri"
                    className="flex-1 px-3 py-2 text-sm font-mono-tabular bg-white focus:outline-none disabled:bg-stone-100 disabled:text-stone-500"
                  />
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  {isEditing ? 'Slug is permanent after creation so shared links never break.' : 'Lowercase letters, numbers, and hyphens only.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Wedding Date *</label>
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => setWeddingDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Muhurat / Time</label>
                  <input
                    type="text"
                    value={weddingTime}
                    onChange={(e) => setWeddingTime(e.target.value)}
                    placeholder="07:30 PM"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as InvitationLanguage)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                  >
                    <option value="both">Bilingual (EN + HI)</option>
                    <option value="en">English Only</option>
                    <option value="hi">Hindi Only (हिन्दी)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Couple Story</label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  value={coupleStory}
                  onChange={(e) => setCoupleStory(e.target.value)}
                  placeholder="How they met and their journey together..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>
            </div>

            <div className="space-y-5">
              <PhotoUploadInput
                label="Couple Hero Photo"
                value={couplePhotoUrl}
                onChange={setCouplePhotoUrl}
                aspectHint="Recommended 3:4 or 4:5"
              />
              <PhotoUploadInput
                label="Groom Portrait Photo"
                value={groomPhotoUrl}
                onChange={setGroomPhotoUrl}
                aspectHint="Square 1:1"
              />
              <PhotoUploadInput
                label="Bride Portrait Photo"
                value={bridePhotoUrl}
                onChange={setBridePhotoUrl}
                aspectHint="Square 1:1"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Groom Intro Bio</label>
                  <textarea
                    rows={2}
                    maxLength={600}
                    value={groomBio}
                    onChange={(e) => setGroomBio(e.target.value)}
                    placeholder="Brief introduction..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bride Intro Bio</label>
                  <textarea
                    rows={2}
                    maxLength={600}
                    value={brideBio}
                    onChange={(e) => setBrideBio(e.target.value)}
                    placeholder="Brief introduction..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Family Details */}
        {step === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Groom’s Parents</label>
                  <input
                    type="text"
                    value={groomParents}
                    onChange={(e) => setGroomParents(e.target.value)}
                    placeholder="Smt. Kavita & Shri Mahendra Deshmukh"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bride’s Parents</label>
                  <input
                    type="text"
                    value={brideParents}
                    onChange={(e) => setBrideParents(e.target.value)}
                    placeholder="Smt. Sunita & Shri Rajeshwar Verma"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Groom’s Grandparents</label>
                  <input
                    type="text"
                    value={groomGrandparents}
                    onChange={(e) => setGroomGrandparents(e.target.value)}
                    placeholder="Smt. Rukmani & Shri Ramchandra Deshmukh"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Bride’s Grandparents</label>
                  <input
                    type="text"
                    value={brideGrandparents}
                    onChange={(e) => setBrideGrandparents(e.target.value)}
                    placeholder="Late Smt. Shanta & Shri Harishchandra Verma"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Gotra & Origin (Optional)</label>
                <input
                  type="text"
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                  placeholder="Kashyap Gotra · Rajnandgaon"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Family Invitation Message (English)</label>
                <textarea
                  rows={3}
                  value={familyMessage}
                  onChange={(e) => setFamilyMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Family Invitation Message (हिन्दी)</label>
                <textarea
                  rows={3}
                  value={familyMessageHi}
                  onChange={(e) => setFamilyMessageHi(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ganeshVandana}
                    onChange={(e) => setGaneshVandana(e.target.checked)}
                  />
                  Include Ganesh Vandana Invocation Header
                </label>
                {ganeshVandana && (
                  <textarea
                    rows={2}
                    value={ganeshVandanaText}
                    onChange={(e) => setGaneshVandanaText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200 bg-white"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Primary Wedding Venue Name</label>
                <input
                  type="text"
                  value={primaryVenueName}
                  onChange={(e) => setPrimaryVenueName(e.target.value)}
                  placeholder="Royal Heritage Courtyard & Lawns"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Primary Venue Address</label>
                <input
                  type="text"
                  value={primaryVenueAddress}
                  onChange={(e) => setPrimaryVenueAddress(e.target.value)}
                  placeholder="G.E. Road, Rajnandgaon, Chhattisgarh"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Primary Venue Google Maps URL</label>
                <input
                  type="url"
                  value={primaryMapUrl}
                  onChange={(e) => setPrimaryMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/?q=Rajnandgaon"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Family Compliments (Comma-separated)</label>
                <input
                  type="text"
                  value={complimentsText}
                  onChange={(e) => setComplimentsText(e.target.value)}
                  placeholder="Deshmukh Parivar, Verma Family, All Relatives"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Thank-You Closing Note</label>
                <textarea
                  rows={2}
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Unlimited Wedding Events */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Wedding Ceremonies & Functions</h3>
                <p className="text-xs text-stone-500">Add unlimited wedding functions with venue maps and schedules.</p>
              </div>
              <button
                type="button"
                onClick={addEvent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Event
              </button>
            </div>

            <div className="space-y-4">
              {events.map((evt, idx) => (
                <div key={evt.id} className="p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Event 0{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEvents((prev) => prev.filter((_, i) => i !== idx))}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={evt.title}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                        )
                      }
                      placeholder="Event Title (e.g. Sangeet Sandhya) *"
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                    />
                    <input
                      type="text"
                      value={evt.titleHi}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, titleHi: e.target.value } : item))
                        )
                      }
                      placeholder="Hindi Title (e.g. संगीत संध्या)"
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                    />
                    <input
                      type="date"
                      value={evt.eventDate}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, eventDate: e.target.value } : item))
                        )
                      }
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                    />
                    <input
                      type="text"
                      value={evt.eventTime}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, eventTime: e.target.value } : item))
                        )
                      }
                      placeholder="Time (e.g. 07:00 PM onwards)"
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                    />
                    <input
                      type="text"
                      value={evt.venue}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, venue: e.target.value } : item))
                        )
                      }
                      placeholder="Venue Name"
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                    />
                    <input
                      type="text"
                      value={evt.venueAddress}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, venueAddress: e.target.value } : item))
                        )
                      }
                      placeholder="Venue Address"
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white"
                    />
                    <input
                      type="url"
                      value={evt.googleMapsUrl}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, googleMapsUrl: e.target.value } : item))
                        )
                      }
                      placeholder="Google Maps URL"
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white md:col-span-2"
                    />
                    <textarea
                      rows={2}
                      value={evt.description}
                      onChange={(e) =>
                        setEvents((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item))
                        )
                      }
                      placeholder="Event notes or dress code..."
                      className="px-3.5 py-2 text-sm rounded-xl border border-stone-200 bg-white md:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Photo Gallery with Drag-and-Drop Reordering */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Wedding Photo Gallery</h3>
                <p className="text-xs text-stone-500">
                  Upload multiple photos, drag cards to reorder, replace images, or add captions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleGalleryMultiUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={galleryUploading}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 disabled:opacity-50"
                >
                  {galleryUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Upload Multiple Photos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setGallery((prev) => [
                      ...prev,
                      {
                        id: `gal-${Date.now()}`,
                        imageUrl: CURATED_STUDIO_IMAGES.floralArch,
                        caption: 'Ceremony details',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Add Studio Sample
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gallery.map((photo, idx) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) {
                      moveGalleryItem(dragIndex, idx);
                      setDragIndex(null);
                    }
                  }}
                  className={`p-3 rounded-2xl border bg-white space-y-2.5 transition-all ${
                    dragIndex === idx ? 'border-stone-900 opacity-60' : 'border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1 font-medium cursor-grab">
                      <GripVertical className="w-3.5 h-3.5" />
                      Slide {idx + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveGalleryItem(idx, idx - 1)}
                        className="p-1 rounded hover:bg-stone-100 disabled:opacity-30"
                        aria-label="Move photo up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === gallery.length - 1}
                        onClick={() => moveGalleryItem(idx, idx + 1)}
                        className="p-1 rounded hover:bg-stone-100 disabled:opacity-30"
                        aria-label="Move photo down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGallery((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="aspect-[4/3] rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative group">
                    <SafeImage src={photo.imageUrl} alt={photo.caption || `Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    <label className="absolute bottom-2 right-2 px-2.5 py-1 text-[11px] font-medium bg-black/70 text-white rounded-md cursor-pointer hover:bg-black/85">
                      Replace
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void handleReplacePhoto(idx, f);
                        }}
                      />
                    </label>
                  </div>

                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) =>
                      setGallery((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, caption: e.target.value } : item))
                      )
                    }
                    placeholder="Photo caption..."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Design Selection */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-stone-900 mb-3">Theme Preset</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.values(THEME_DEFINITIONS).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleThemeSelect(t.key)}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      theme === t.key
                        ? 'border-stone-900 ring-1 ring-stone-900 bg-stone-50'
                        : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-3">
                      {[t.colors.primary, t.colors.accent, t.colors.secondary, t.colors.background].map((hex, i) => (
                        <span
                          key={i}
                          className="w-5 h-5 rounded-full border border-stone-200"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-semibold text-stone-900">{t.label}</div>
                    <p className="text-xs text-stone-500 mt-1">{t.subtitle}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl border border-stone-200 space-y-4">
                <h4 className="text-sm font-semibold text-stone-900">Custom Palette & Typography</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(['primary', 'secondary', 'accent', 'background'] as const).map((key) => (
                    <label key={key} className="block text-xs text-stone-600 capitalize">
                      {key}
                      <div className="mt-1 flex items-center gap-2 border border-stone-200 rounded-lg px-2 py-1">
                        <input
                          type="color"
                          value={customColors[key]}
                          onChange={(e) => setCustomColors((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="font-mono-tabular text-[11px]">{customColors[key]}</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Typography</label>
                    <select
                      value={typography}
                      onChange={(e) => setTypography(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                    >
                      {TYPOGRAPHY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Opening Animation</label>
                    <select
                      value={animationStyle}
                      onChange={(e) => setAnimationStyle(e.target.value as AnimationStyle)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                    >
                      <option value="envelope">Royal Envelope Seal</option>
                      <option value="petals">Falling Rose Petals</option>
                      <option value="royal-curtain">Floral Reveal</option>
                      <option value="subtle">Immediate Editorial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Ambient Music</label>
                    <select
                      value={musicTrack}
                      onChange={(e) => setMusicTrack(e.target.value as MusicTrack)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                    >
                      <option value="shehnai-bliss">Shehnai Bliss (Raag Bhupali)</option>
                      <option value="flute-serenity">Flute Serenity</option>
                      <option value="royal-sitar">Royal Sitar & Tanpura</option>
                      <option value="none">No Music</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-stone-200">
                <h4 className="text-sm font-semibold text-stone-900 mb-3">Visible Invitation Sections</h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.entries(sectionsEnabled).map(([key, enabled]) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) =>
                          setSectionsEnabled((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Preview & Publish */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-stone-200 bg-stone-50">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-stone-500 uppercase">
                    Invitation Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-stone-500 uppercase">Permanent URL</p>
                  <p className="text-xs font-mono-tabular text-stone-900 mt-1.5">
                    https://{studioSettings.websiteDomain || 'invite.capturestudio.in'}/{slug || 'couple-slug'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                    previewDevice === 'mobile' ? 'bg-stone-900 text-white' : 'text-stone-600'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Mobile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md ${
                    previewDevice === 'desktop' ? 'bg-stone-900 text-white' : 'text-stone-600'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Desktop
                </button>
              </div>
            </div>

            <div className="border border-stone-300 rounded-2xl bg-stone-100 p-4 flex justify-center">
              <div
                className={`bg-white rounded-2xl overflow-y-auto border border-stone-300 shadow-md transition-all ${
                  previewDevice === 'mobile' ? 'w-[390px] max-h-[680px]' : 'w-full max-h-[680px]'
                }`}
              >
                <PublicInvitationView
                  invitation={previewInvitationObj}
                  events={events
                    .filter((e) => e.title.trim())
                    .map((e, i) => ({
                      ...e,
                      invitationId: previewInvitationObj.slug || 'preview',
                      sortOrder: i + 1,
                      isPublic: true,
                      ownerUid: 'preview',
                    }))}
                  gallery={gallery
                    .filter((g) => g.imageUrl.trim())
                    .map((g, i) => ({
                      ...g,
                      invitationId: previewInvitationObj.slug || 'preview',
                      sortOrder: i + 1,
                      isPublic: true,
                      ownerUid: 'preview',
                    }))}
                  studioSettings={studioSettings}
                  isPreviewMode
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="px-6 py-4 border-t border-stone-200 bg-stone-50/70 flex items-center justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-stone-200 bg-white text-stone-700 rounded-lg hover:bg-stone-50 disabled:opacity-40"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Next Step
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave('published')}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-[#881337] text-white rounded-lg hover:bg-[#6D0F2C] disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {saving ? 'Publishing...' : 'Publish Invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
