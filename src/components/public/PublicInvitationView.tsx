import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Languages,
  MapPin,
  MessageSquareHeart,
  Pause,
  Play,
  QrCode,
  Send,
  Share2,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import {
  DEFAULT_SECTIONS_ENABLED,
  DEFAULT_STUDIO_SETTINGS,
  THEME_DEFINITIONS,
  TYPOGRAPHY_OPTIONS,
} from '../../data/presets';
import { ambientMusic } from '../../lib/ambientMusic';
import {
  getGuestPass,
  listPublicWishes,
  submitPublicRsvp,
  submitPublicWish,
} from '../../lib/firestoreService';
import type {
  GalleryPhoto,
  GuestPass,
  GuestWish,
  InvitationRecord,
  RsvpAttendance,
  StudioSettings,
  WeddingEvent,
} from '../../types/wedding';
import { QrCodeModal } from '../common/QrCodeModal';
import { SafeImage } from '../common/SafeImage';
import { WatercolorCanvas3D } from '../common/WatercolorCanvas3D';

interface PublicInvitationViewProps {
  invitation: InvitationRecord;
  events: WeddingEvent[];
  gallery: GalleryPhoto[];
  initialWishes?: GuestWish[];
  studioSettings?: StudioSettings;
  isPreviewMode?: boolean;
  guestQueryName?: string;
  guestPassCode?: string;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const PublicInvitationView: React.FC<PublicInvitationViewProps> = ({
  invitation,
  events,
  gallery,
  initialWishes = [],
  studioSettings = DEFAULT_STUDIO_SETTINGS,
  isPreviewMode = false,
  guestQueryName,
  guestPassCode,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const themeDef = THEME_DEFINITIONS[invitation.theme] || THEME_DEFINITIONS.traditional;
  const colors = invitation.customColors?.primary ? invitation.customColors : themeDef.colors;
  const typographyDef =
    TYPOGRAPHY_OPTIONS.find((t) => t.id === invitation.typography) || TYPOGRAPHY_OPTIONS[0];
  const sections = { ...DEFAULT_SECTIONS_ENABLED, ...(invitation.sectionsEnabled || {}) };

  const [lang, setLang] = useState<'en' | 'hi'>(
    invitation.language === 'hi' ? 'hi' : 'en'
  );
  const [envelopeOpen, setEnvelopeOpen] = useState<boolean>(
    isPreviewMode || invitation.animationStyle === 'subtle'
  );
  const [dateRevealed, setDateRevealed] = useState<boolean>(isPreviewMode);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [guestPass, setGuestPass] = useState<GuestPass | null>(null);

  // Gallery slider & lightbox state
  const [activeSlide, setActiveSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: false });

  // Scroll choreography refs
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroSectionRef,
    offset: ['start start', 'end start'],
  });
  const heroPhotoY = useTransform(heroScroll, [0, 1], [0, prefersReducedMotion ? 0 : 42]);

  const { scrollYProgress: timelineScroll } = useScroll({
    target: timelineRef,
    offset: ['start 80%', 'end 60%'],
  });
  const timelineLineScale = useSpring(timelineScroll, { stiffness: 140, damping: 28 });

  // RSVP form state
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpPhone, setRsvpPhone] = useState('');
  const [rsvpAttendance, setRsvpAttendance] = useState<RsvpAttendance>('attending');
  const [rsvpCount, setRsvpCount] = useState(2);
  const [rsvpEvents, setRsvpEvents] = useState<string[]>([]);
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [shareWishFromRsvp, setShareWishFromRsvp] = useState(true);
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false);
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [rsvpError, setRsvpError] = useState('');

  // Guest wishes board state
  const [wishes, setWishes] = useState<GuestWish[]>(initialWishes);
  const [wishName, setWishName] = useState('');
  const [wishRelation, setWishRelation] = useState('');
  const [wishText, setWishText] = useState('');
  const [wishSubmitting, setWishSubmitting] = useState(false);
  const [wishError, setWishError] = useState('');

  useEffect(() => {
    setWishes(initialWishes);
  }, [initialWishes]);

  useEffect(() => {
    if (guestPassCode && !isPreviewMode) {
      getGuestPass(invitation.slug, guestPassCode).then((pass) => {
        if (pass) setGuestPass(pass);
      });
    }
  }, [guestPassCode, invitation.slug, isPreviewMode]);

  useEffect(() => {
    if (!isPreviewMode && invitation.slug && sections.guestWishes) {
      listPublicWishes(invitation.slug, false)
        .then((docs) => {
          if (docs.length > 0) setWishes(docs);
        })
        .catch(() => {
          // keep initial wishes if unseeded
        });
    }
  }, [invitation.slug, isPreviewMode, sections.guestWishes]);

  useEffect(() => {
    const computeCountdown = () => {
      const target = new Date(`${invitation.weddingDate}T19:00:00`).getTime();
      if (Number.isNaN(target)) return;
      const diff = target - Date.now();
      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, passed: true });
        return;
      }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        passed: false,
      });
    };
    computeCountdown();
    const timer = window.setInterval(computeCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [invitation.weddingDate]);

  useEffect(() => {
    return () => {
      ambientMusic.stop();
    };
  }, []);

  const isExpired = useMemo(() => {
    if (invitation.status === 'expired') return true;
    if (invitation.expiresAt) {
      const exp = new Date(`${invitation.expiresAt}T23:59:59`).getTime();
      if (!Number.isNaN(exp) && Date.now() > exp) return true;
    }
    return false;
  }, [invitation.status, invitation.expiresAt]);

  const personalizedGuest = guestPass?.guestName || guestQueryName || '';
  const monogram = `${invitation.groomName.trim().charAt(0) || 'A'} & ${invitation.brideName.trim().charAt(0) || 'G'}`;

  const toggleMusic = () => {
    if (!invitation.musicTrack || invitation.musicTrack === 'none') return;
    if (musicPlaying) {
      ambientMusic.stop();
      setMusicPlaying(false);
    } else {
      ambientMusic.start(invitation.musicTrack);
      setMusicPlaying(true);
    }
  };

  const handleOpenInvitation = () => {
    setEnvelopeOpen(true);
    if (invitation.musicTrack && invitation.musicTrack !== 'none' && !musicPlaying && !isPreviewMode) {
      ambientMusic.start(invitation.musicTrack);
      setMusicPlaying(true);
    }
  };

  const handleAddToCalendar = () => {
    const dateDigits = invitation.weddingDate.replace(/-/g, '');
    const title = `${invitation.brideName} & ${invitation.groomName} Wedding`;
    const location = `${invitation.primaryVenueName || ''} ${invitation.primaryVenueAddress || ''}`.trim();
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Capture Studio//Digital Wedding Invitation//EN',
      'BEGIN:VEVENT',
      `DTSTART:${dateDigits}T180000`,
      `DTEND:${dateDigits}T233000`,
      `SUMMARY:${title}`,
      `LOCATION:${location}`,
      `DESCRIPTION:Wedding celebration of ${invitation.brideName} & ${invitation.groomName}. Crafted by ${studioSettings.businessName}.`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invitation.slug}-wedding.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsAppShare = () => {
    const shareUrl = `${window.location.origin}/invite/${invitation.slug}`;
    const text = `You are warmly invited to the wedding celebration of ${invitation.brideName} & ${invitation.groomName} on ${formatReadableDate(invitation.weddingDate)}. View our digital invitation: ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpError('');
    if (!rsvpName.trim()) {
      setRsvpError('Please enter your full name.');
      return;
    }
    if (isPreviewMode) {
      setRsvpSubmitted(true);
      return;
    }
    setRsvpSubmitting(true);
    try {
      await submitPublicRsvp(invitation.slug, {
        guestName: rsvpName,
        phone: rsvpPhone,
        attending: rsvpAttendance,
        guestsCount: rsvpAttendance === 'declined' ? 0 : rsvpCount,
        eventsAttending: rsvpEvents,
        message: rsvpMessage,
        shareAsWish: shareWishFromRsvp,
      });
      setRsvpSubmitted(true);
      if (shareWishFromRsvp && rsvpMessage.trim()) {
        const refreshed = await listPublicWishes(invitation.slug, false);
        setWishes(refreshed);
      }
    } catch (err) {
      setRsvpError(err instanceof Error ? err.message : 'Unable to submit RSVP right now.');
    } finally {
      setRsvpSubmitting(false);
    }
  };

  const handleWishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWishError('');
    if (!wishName.trim() || !wishText.trim()) {
      setWishError('Please share both your name and blessing message.');
      return;
    }
    if (isPreviewMode) {
      setWishes((prev) => [
        {
          id: `preview-${Date.now()}`,
          invitationId: invitation.slug,
          guestName: wishName,
          cityOrRelation: wishRelation,
          message: wishText,
          isPublic: true,
        },
        ...prev,
      ]);
      setWishName('');
      setWishRelation('');
      setWishText('');
      return;
    }
    setWishSubmitting(true);
    try {
      await submitPublicWish(invitation.slug, {
        guestName: wishName,
        cityOrRelation: wishRelation,
        message: wishText,
      });
      const refreshed = await listPublicWishes(invitation.slug, false);
      setWishes(refreshed);
      setWishName('');
      setWishRelation('');
      setWishText('');
    } catch (err) {
      setWishError(err instanceof Error ? err.message : 'Could not post blessing.');
    } finally {
      setWishSubmitting(false);
    }
  };

  const toggleEventSelection = (title: string) => {
    setRsvpEvents((prev) =>
      prev.includes(title) ? prev.filter((item) => item !== title) : [...prev, title]
    );
  };

  // Expired Notice State
  if (isExpired && !isPreviewMode) {
    return (
      <div
        className={`min-h-screen relative flex flex-col items-center justify-center p-6 text-center ${typographyDef.bodyClass}`}
        style={{ color: themeDef.textPrimary }}
      >
        <WatercolorCanvas3D
          primaryColor={colors.primary}
          secondaryColor={colors.secondary}
          accentColor={colors.accent}
          backgroundColor={colors.background}
          showPetals={false}
        />
        <div
          className="relative z-10 max-w-lg w-full p-10 rounded-2xl border"
          style={{ backgroundColor: `${colors.secondary}EB`, borderColor: themeDef.borderSubtle }}
        >
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: colors.accent }}>
            Celebration Concluded
          </p>
          <h1 className={`text-4xl font-semibold mb-4 ${typographyDef.displayClass}`}>
            {invitation.brideName} & {invitation.groomName}
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: themeDef.textMuted }}>
            This digital wedding invitation has reached its scheduled expiry date ({invitation.expiresAt || invitation.weddingDate}). Thank you for being part of the celebration.
          </p>
          <div className="pt-6 border-t text-xs" style={{ borderColor: themeDef.borderSubtle, color: themeDef.textMuted }}>
            Crafted by <strong style={{ color: colors.primary }}>{studioSettings.businessName}</strong> · {studioSettings.address}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden ${typographyDef.bodyClass}`}
      style={{ color: themeDef.textPrimary }}
    >
      {/* 3D Interactive Watercolor & Floating Petals Canvas */}
      {!isPreviewMode && (
        <WatercolorCanvas3D
          primaryColor={colors.primary}
          secondaryColor={colors.secondary}
          accentColor={colors.accent}
          backgroundColor={colors.background}
          showPetals={invitation.animationStyle !== 'subtle'}
        />
      )}

      {/* Preview mode watercolor backdrop */}
      {isPreviewMode && (
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at 20% 20%, ${colors.secondary} 0%, ${colors.background} 55%, ${colors.primary}15 100%)`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Gilded Scroll Progress Hairline */}
      {!isPreviewMode && (
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left pointer-events-none"
          style={{
            scaleX: smoothProgress,
            backgroundColor: colors.primary,
          }}
          aria-hidden="true"
        />
      )}

      {/* 1. Tactile Wax-Sealed Royal Envelope / Floral Curtain Cover */}
      <AnimatePresence>
        {!envelopeOpen && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.03 }}
            transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backgroundColor: colors.secondary }}
          >
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
              className="max-w-md w-full text-center p-8 sm:p-11 rounded-3xl border shadow-2xl relative overflow-hidden"
              style={{ backgroundColor: colors.background, borderColor: themeDef.borderSubtle }}
            >
              {/* Sculptural Monogram Wax Crest */}
              <div
                className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center border-2 p-1"
                style={{ borderColor: colors.accent }}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-lg font-semibold tracking-wider"
                  style={{ backgroundColor: colors.primary, color: '#FFFFFF' }}
                >
                  <span className={typographyDef.displayClass}>{monogram}</span>
                </div>
              </div>

              <p className="text-xs uppercase tracking-[0.26em] mb-2.5" style={{ color: colors.accent }}>
                {lang === 'hi' ? 'शुभ विवाह निमंत्रण' : 'Auspicious Wedding Invitation'}
              </p>

              {personalizedGuest && (
                <p className="text-sm font-medium mb-3" style={{ color: colors.primary }}>
                  {lang === 'hi' ? `सादर आमंत्रण: ${personalizedGuest}` : `Warmly Inviting: ${personalizedGuest}`}
                </p>
              )}

              <h1 className={`text-4xl sm:text-5xl font-semibold tracking-tight mb-3 ${typographyDef.displayClass}`}>
                {lang === 'hi' && invitation.groomNameHi ? invitation.groomNameHi : invitation.groomName}
                <span className="mx-2.5 font-normal italic" style={{ color: colors.accent }}>&</span>
                {lang === 'hi' && invitation.brideNameHi ? invitation.brideNameHi : invitation.brideName}
              </h1>

              <p className="text-sm mb-8" style={{ color: themeDef.textMuted }}>
                {formatReadableDate(invitation.weddingDate)}
              </p>

              <motion.button
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                type="button"
                onClick={handleOpenInvitation}
                className="w-full py-3.5 px-6 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 shadow-md"
                style={{ backgroundColor: colors.primary }}
              >
                <Sparkles className="w-4 h-4" />
                {lang === 'hi' ? 'निमंत्रण खोलें' : 'Break Seal & Open Invitation'}
              </motion.button>

              <p className="text-[11px] mt-6" style={{ color: themeDef.textMuted }}>
                {studioSettings.businessName} · Rajnandgaon
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Sticky Controls (Solid/rgba surface — no backdrop-blur over WebGL) */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: `${colors.background}F2`, borderColor: themeDef.borderSubtle }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-base sm:text-lg font-semibold truncate ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
              {invitation.groomName} & {invitation.brideName}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {invitation.language === 'both' && (
              <button
                type="button"
                onClick={() => setLang((prev) => (prev === 'en' ? 'hi' : 'en'))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap bg-white/80"
                style={{ borderColor: themeDef.borderSubtle, color: themeDef.textPrimary }}
              >
                <Languages className="w-3.5 h-3.5" />
                {lang === 'en' ? 'हिन्दी' : 'English'}
              </button>
            )}

            {invitation.musicTrack && invitation.musicTrack !== 'none' && (
              <button
                type="button"
                onClick={toggleMusic}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: colors.primary }}
                aria-label={musicPlaying ? 'Pause background music' : 'Play background music'}
              >
                {musicPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <Volume2 className="w-3.5 h-3.5 hidden sm:inline" />
                <span>{musicPlaying ? 'Pause' : 'Music'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-20">
        {/* Personalized Guest Welcome Strip */}
        {personalizedGuest && (
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="border-b py-4 px-4 text-center"
            style={{ backgroundColor: `${colors.secondary}EB`, borderColor: themeDef.borderSubtle }}
          >
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.accent }}>
              {lang === 'hi' ? 'विशेष अतिथि आमंत्रण' : 'Personal Invitation'}
            </p>
            <p className={`text-xl font-semibold ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
              {lang === 'hi' ? `सादर आमंत्रित: ${personalizedGuest}` : `With Warmest Regards to ${personalizedGuest}`}
            </p>
            {guestPass?.personalNote && (
              <p className="text-sm mt-1 max-w-xl mx-auto" style={{ color: themeDef.textMuted }}>
                {guestPass.personalNote}
              </p>
            )}
          </motion.section>
        )}

        {/* 2. Ganesh Vandana */}
        {sections.ganeshVandana && invitation.ganeshVandana !== false && (
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="pt-12 pb-6 px-4 text-center max-w-2xl mx-auto"
          >
            <p className="text-2xl sm:text-3xl font-semibold mb-2" style={{ color: colors.primary }}>
              ॐ श्री गणेशाय नमः
            </p>
            <p className="text-sm sm:text-base leading-relaxed italic" style={{ color: themeDef.textMuted }}>
              {invitation.ganeshVandanaText ||
                'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥'}
            </p>
          </motion.section>
        )}

        {/* 3. Hero Banner & Bride/Groom Names with Scroll Parallax */}
        <section ref={heroSectionRef} className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: EASE_OUT_EXPO }}
              className="lg:col-span-7 flex flex-col justify-center text-center lg:text-left py-4"
            >
              <p className="text-xs uppercase tracking-[0.25em] mb-4" style={{ color: colors.accent }}>
                {lang === 'hi' ? 'शुभ परिणयोत्सव' : 'Together With Their Families'}
              </p>
              <h1
                className={`text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.06] mb-5 ${typographyDef.displayClass}`}
                style={{ color: colors.primary }}
              >
                {lang === 'hi' && invitation.groomNameHi ? invitation.groomNameHi : invitation.groomName}
                <span className="block sm:inline mx-3 text-3xl sm:text-5xl italic font-normal" style={{ color: colors.accent }}>
                  &
                </span>
                {lang === 'hi' && invitation.brideNameHi ? invitation.brideNameHi : invitation.brideName}
              </h1>

              <p className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8" style={{ color: themeDef.textMuted }}>
                {lang === 'hi' && invitation.familyMessageHi
                  ? invitation.familyMessageHi
                  : invitation.familyMessage ||
                    'Request the honour of your presence and blessings as we celebrate our wedding ceremony.'}
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                <motion.a
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  href="#rsvp-section"
                  className="px-6 py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-95 whitespace-nowrap shadow-sm"
                  style={{ backgroundColor: colors.primary }}
                >
                  {lang === 'hi' ? 'उपस्थिति की पुष्टि करें (RSVP)' : 'Confirm Attendance (RSVP)'}
                </motion.a>
                <motion.button
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  type="button"
                  onClick={handleAddToCalendar}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-medium border bg-white/80 transition-colors whitespace-nowrap"
                  style={{ borderColor: themeDef.borderSubtle, color: themeDef.textPrimary }}
                >
                  <CalendarPlus className="w-4 h-4" />
                  {lang === 'hi' ? 'कैलेंडर में जोड़ें' : 'Add to Calendar'}
                </motion.button>
              </div>
            </motion.div>

            <div className="lg:col-span-5">
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
                className="h-full min-h-[380px] rounded-3xl overflow-hidden border p-2.5 shadow-lg shadow-stone-900/5"
                style={{ y: heroPhotoY, backgroundColor: `${colors.secondary}E8`, borderColor: themeDef.borderSubtle }}
              >
                <SafeImage
                  src={invitation.couplePhotoUrl}
                  alt={`${invitation.groomName} and ${invitation.brideName}`}
                  fallbackLabel={`${invitation.groomName} & ${invitation.brideName}`}
                  className="w-full h-full min-h-[364px] object-cover rounded-2xl"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* 4 & 5. Interactive Wedding Date Reveal + Live Countdown */}
        {(sections.dateReveal || sections.countdown) && (
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
            className="max-w-4xl mx-auto px-4 sm:px-6 py-10"
          >
            <div
              className="rounded-3xl border p-6 sm:p-10 text-center"
              style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}
            >
              {sections.dateReveal && (
                <div className="mb-8">
                  <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: colors.accent }}>
                    {lang === 'hi' ? 'शुभ विवाह तिथि' : 'Save The Auspicious Date'}
                  </p>
                  {!dateRevealed ? (
                    <motion.button
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                      type="button"
                      onClick={() => setDateRevealed(true)}
                      className="mt-2 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white shadow-sm"
                      style={{ backgroundColor: colors.primary }}
                    >
                      <Sparkles className="w-4 h-4" />
                      {lang === 'hi' ? 'शुभ तिथि देखने के लिए टैप करें' : 'Tap to Reveal Wedding Date'}
                    </motion.button>
                  ) : (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                    >
                      <h2 className={`text-3xl sm:text-4xl font-semibold ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                        {formatReadableDate(invitation.weddingDate)}
                      </h2>
                      {invitation.weddingTime && (
                        <p className="text-sm mt-1.5" style={{ color: themeDef.textMuted }}>
                          {invitation.weddingTime} · {invitation.primaryVenueName}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {sections.countdown && (
                <div className="pt-6 border-t" style={{ borderColor: themeDef.borderSubtle }}>
                  {countdown.passed ? (
                    <p className={`text-xl font-medium ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                      {lang === 'hi' ? 'विवाह उत्सव प्रारंभ हो चुका है!' : 'The Wedding Celebrations Have Begun!'}
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                      {[
                        { label: lang === 'hi' ? 'दिन' : 'Days', val: countdown.days },
                        { label: lang === 'hi' ? 'घंटे' : 'Hours', val: countdown.hours },
                        { label: lang === 'hi' ? 'मिनट' : 'Mins', val: countdown.minutes },
                        { label: lang === 'hi' ? 'सेकंड' : 'Secs', val: countdown.seconds },
                      ].map((unit) => (
                        <div
                          key={unit.label}
                          className="py-3 px-2 rounded-2xl border"
                          style={{ backgroundColor: `${colors.background}F0`, borderColor: themeDef.borderSubtle }}
                        >
                          <div className="text-2xl sm:text-3xl font-semibold font-mono-tabular" style={{ color: colors.primary }}>
                            {String(unit.val).padStart(2, '0')}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: themeDef.textMuted }}>
                            {unit.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* 6. Family Details & Gotra */}
        {sections.familyDetails && (invitation.brideParents || invitation.groomParents) && (
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
            className="max-w-4xl mx-auto px-4 sm:px-6 py-10"
          >
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: colors.accent }}>
                {lang === 'hi' ? 'स्नेहिल पारिवारिक निमंत्रण' : 'With Blessings of Our Elders'}
              </p>
              <h2 className={`text-3xl sm:text-4xl font-semibold ${typographyDef.displayClass}`}>
                {lang === 'hi' ? 'दोनों परिवारों का सादर आमंत्रण' : 'Cordial Family Invitation'}
              </h2>
              {invitation.gotra && (
                <p className="text-xs uppercase tracking-widest mt-2" style={{ color: themeDef.textMuted }}>
                  {invitation.gotra}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invitation.groomParents && (
                <div className="p-6 rounded-2xl border text-center" style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: colors.accent }}>
                    {lang === 'hi' ? 'वर पक्ष' : 'Groom’s Family'}
                  </p>
                  <h3 className={`text-2xl font-semibold mb-2 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                    {invitation.groomName}
                  </h3>
                  <p className="text-sm font-medium mb-1">Son of {invitation.groomParents}</p>
                  {invitation.groomGrandparents && (
                    <p className="text-xs" style={{ color: themeDef.textMuted }}>
                      Grandson of {invitation.groomGrandparents}
                    </p>
                  )}
                </div>
              )}

              {invitation.brideParents && (
                <div className="p-6 rounded-2xl border text-center" style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: colors.accent }}>
                    {lang === 'hi' ? 'वधू पक्ष' : 'Bride’s Family'}
                  </p>
                  <h3 className={`text-2xl font-semibold mb-2 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                    {invitation.brideName}
                  </h3>
                  <p className="text-sm font-medium mb-1">Daughter of {invitation.brideParents}</p>
                  {invitation.brideGrandparents && (
                    <p className="text-xs" style={{ color: themeDef.textMuted }}>
                      Granddaughter of {invitation.brideGrandparents}
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* 7 & 8. Couple Introduction & Story */}
        {(sections.coupleIntro || sections.coupleStory) && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            {sections.coupleIntro && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-2xl border"
                  style={{ backgroundColor: `${colors.background}EC`, borderColor: themeDef.borderSubtle }}
                >
                  <SafeImage
                    src={invitation.groomPhotoUrl}
                    alt={invitation.groomName}
                    fallbackLabel={invitation.groomName}
                    className="w-28 h-28 rounded-full object-cover shrink-0 border"
                  />
                  <div className="text-center sm:text-left">
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.accent }}>
                      {lang === 'hi' ? 'वर' : 'The Groom'}
                    </p>
                    <h3 className={`text-2xl font-semibold mb-1.5 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                      {invitation.groomName}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: themeDef.textMuted }}>
                      {invitation.groomBio || 'Stepping into a joyful new chapter surrounded by family and lifelong friends.'}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                  className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-2xl border"
                  style={{ backgroundColor: `${colors.background}EC`, borderColor: themeDef.borderSubtle }}
                >
                  <SafeImage
                    src={invitation.bridePhotoUrl}
                    alt={invitation.brideName}
                    fallbackLabel={invitation.brideName}
                    className="w-28 h-28 rounded-full object-cover shrink-0 border"
                  />
                  <div className="text-center sm:text-left">
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: colors.accent }}>
                      {lang === 'hi' ? 'वधू' : 'The Bride'}
                    </p>
                    <h3 className={`text-2xl font-semibold mb-1.5 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                      {invitation.brideName}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: themeDef.textMuted }}>
                      {invitation.brideBio || 'Celebrating tradition, grace, and the beginning of an unforgettable journey together.'}
                    </p>
                  </div>
                </motion.div>
              </div>
            )}

            {sections.coupleStory && invitation.coupleStory && (
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                className="max-w-3xl mx-auto text-center py-7 px-7 rounded-2xl border"
                style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}
              >
                <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: colors.accent }}>
                  {lang === 'hi' ? 'हमारी कहानी' : 'Our Story'}
                </p>
                <p className="text-base sm:text-lg leading-relaxed italic" style={{ color: themeDef.textPrimary }}>
                  “{invitation.coupleStory}”
                </p>
              </motion.div>
            )}
          </section>
        )}

        {/* 9. Scroll-Driven Wedding Function Timeline */}
        {sections.events && events.length > 0 && (
          <section id="events-section" className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
            <div className="text-center mb-10">
              <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: colors.accent }}>
                {lang === 'hi' ? 'मांगलिक कार्यक्रम' : 'Celebration Itinerary'}
              </p>
              <h2 className={`text-3xl sm:text-4xl font-semibold ${typographyDef.displayClass}`}>
                {lang === 'hi' ? 'विवाह समारोह की रूपरेखा' : 'Wedding Functions'}
              </h2>
            </div>

            <div ref={timelineRef} className="relative pl-6 sm:pl-9 space-y-6">
              {/* Vertical Scroll-Drawn Gilded Thread */}
              <div
                className="absolute left-2 sm:left-3.5 top-2 bottom-2 w-px opacity-25"
                style={{ backgroundColor: colors.accent }}
                aria-hidden="true"
              />
              <motion.div
                className="absolute left-2 sm:left-3.5 top-2 bottom-2 w-[2px] origin-top"
                style={{
                  scaleY: prefersReducedMotion ? 1 : timelineLineScale,
                  backgroundColor: colors.primary,
                }}
                aria-hidden="true"
              />

              {events.map((evt, index) => (
                <motion.div
                  key={evt.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.06, ease: EASE_OUT_EXPO }}
                  className="relative p-6 sm:p-7 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                  style={{ backgroundColor: `${colors.background}F0`, borderColor: themeDef.borderSubtle }}
                >
                  {/* Node Marker */}
                  <span
                    className="absolute -left-[22px] sm:-left-[28px] top-7 w-3.5 h-3.5 rounded-full border-2"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.primary,
                    }}
                    aria-hidden="true"
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider" style={{ color: colors.accent }}>
                      <span className="font-mono-tabular">0{index + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatReadableDate(evt.eventDate)}</span>
                    </div>
                    <h3 className={`text-2xl font-semibold ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                      {lang === 'hi' && evt.titleHi ? evt.titleHi : evt.title}
                    </h3>
                    {evt.description && (
                      <p className="text-sm max-w-xl leading-relaxed" style={{ color: themeDef.textMuted }}>
                        {evt.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs" style={{ color: themeDef.textPrimary }}>
                      {evt.eventTime && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" style={{ color: colors.accent }} />
                          {evt.eventTime}
                        </span>
                      )}
                      {evt.venue && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" style={{ color: colors.accent }} />
                          {evt.venue}
                        </span>
                      )}
                    </div>
                  </div>

                  {evt.googleMapsUrl && (
                    <a
                      href={evt.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border shrink-0 transition-colors whitespace-nowrap"
                      style={{ borderColor: colors.primary, color: colors.primary }}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      {lang === 'hi' ? 'मैप देखें' : 'Directions'}
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* 10. Swipeable Photo Gallery Slider */}
        {sections.gallery && gallery.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: colors.accent }}>
                {lang === 'hi' ? 'स्मृति झरोखा' : 'Captured Moments'}
              </p>
              <h2 className={`text-3xl sm:text-4xl font-semibold ${typographyDef.displayClass}`}>
                {lang === 'hi' ? 'फोटो गैलरी' : 'Photo Gallery'}
              </h2>
            </div>

            <div className="relative rounded-3xl overflow-hidden border" style={{ backgroundColor: colors.secondary, borderColor: themeDef.borderSubtle }}>
              <motion.div
                drag={gallery.length > 1 ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, info) => {
                  if (info.offset.x < -50) {
                    setActiveSlide((prev) => (prev + 1) % gallery.length);
                  } else if (info.offset.x > 50) {
                    setActiveSlide((prev) => (prev - 1 + gallery.length) % gallery.length);
                  }
                }}
                className="aspect-[16/10] sm:aspect-[16/9] cursor-pointer relative select-none"
                onClick={() => setLightboxOpen(true)}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={gallery[activeSlide]?.id || activeSlide}
                    initial={prefersReducedMotion ? false : { opacity: 0.4, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0.4 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className="w-full h-full"
                  >
                    <SafeImage
                      src={gallery[activeSlide]?.imageUrl}
                      alt={gallery[activeSlide]?.caption || 'Wedding gallery photograph'}
                      className="w-full h-full object-cover"
                    />
                  </motion.div>
                </AnimatePresence>
                {gallery[activeSlide]?.caption && (
                  <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                    <p className="text-sm font-medium">{gallery[activeSlide].caption}</p>
                  </div>
                )}
              </motion.div>

              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveSlide((prev) => (prev - 1 + gallery.length) % gallery.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 text-stone-900 flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlide((prev) => (prev + 1) % gallery.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 text-stone-900 flex items-center justify-center shadow-md hover:bg-white transition-colors"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="flex items-center justify-center gap-2.5 mt-4 overflow-x-auto pb-2">
                {gallery.map((photo, idx) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                      idx === activeSlide ? 'opacity-100 scale-105' : 'opacity-55 hover:opacity-85'
                    }`}
                    style={{ borderColor: idx === activeSlide ? colors.primary : 'transparent' }}
                    aria-label={`View photo ${idx + 1}`}
                  >
                    <SafeImage src={photo.imageUrl} alt={photo.caption || `Gallery thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 11. Primary Venue & Google Maps Navigation */}
        {sections.venueMap && invitation.primaryVenueName && (
          <motion.section
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="max-w-4xl mx-auto px-4 sm:px-6 py-8"
          >
            <div
              className="p-7 sm:p-9 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
              style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.22em] mb-1.5" style={{ color: colors.accent }}>
                  {lang === 'hi' ? 'विवाह स्थल' : 'Main Wedding Venue'}
                </p>
                <h3 className={`text-2xl sm:text-3xl font-semibold mb-1.5 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                  {invitation.primaryVenueName}
                </h3>
                <p className="text-sm leading-relaxed max-w-xl" style={{ color: themeDef.textMuted }}>
                  {invitation.primaryVenueAddress}
                </p>
              </div>
              {invitation.primaryMapUrl && (
                <a
                  href={invitation.primaryMapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: colors.primary }}
                >
                  <MapPin className="w-4 h-4" />
                  {lang === 'hi' ? 'गूगल मैप पर खोलें' : 'Open in Google Maps'}
                </a>
              )}
            </div>
          </motion.section>
        )}

        {/* 12 & 13. RSVP Confirmation Form & Guest Message Board */}
        {(sections.rsvp || sections.guestWishes) && (
          <section id="rsvp-section" className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* RSVP Form */}
              {sections.rsvp && (
                <div className="p-6 sm:p-8 rounded-3xl border" style={{ backgroundColor: `${colors.background}F2`, borderColor: themeDef.borderSubtle }}>
                  <p className="text-xs uppercase tracking-[0.22em] mb-1.5" style={{ color: colors.accent }}>
                    {lang === 'hi' ? 'कृपया उत्तर दें' : 'RSVP Confirmation'}
                  </p>
                  <h2 className={`text-3xl font-semibold mb-2 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                    {lang === 'hi' ? 'अपनी उपस्थिति दर्ज करें' : 'Will You Join Us?'}
                  </h2>
                  <p className="text-sm mb-6" style={{ color: themeDef.textMuted }}>
                    Kindly confirm your attendance so our families can welcome you comfortably.
                  </p>

                  {rsvpSubmitted ? (
                    <div className="p-6 rounded-2xl border text-center" style={{ backgroundColor: colors.secondary, borderColor: themeDef.borderSubtle }}>
                      <Heart className="w-8 h-8 mx-auto mb-3" style={{ color: colors.primary }} />
                      <h3 className={`text-2xl font-semibold mb-1 ${typographyDef.displayClass}`}>
                        Thank You, {rsvpName}!
                      </h3>
                      <p className="text-sm mb-4" style={{ color: themeDef.textMuted }}>
                        Your RSVP has been recorded securely for {invitation.groomName} & {invitation.brideName}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRsvpSubmitted(false);
                          setRsvpName('');
                          setRsvpPhone('');
                          setRsvpMessage('');
                        }}
                        className="text-xs font-medium underline"
                        style={{ color: colors.primary }}
                      >
                        Submit another response
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRsvpSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={rsvpName}
                          onChange={(e) => setRsvpName(e.target.value)}
                          placeholder="e.g. Rajesh & Meera Sharma"
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2"
                          style={{ borderColor: themeDef.borderSubtle }}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Phone (Private to Family)</label>
                          <input
                            type="tel"
                            maxLength={40}
                            value={rsvpPhone}
                            onChange={(e) => setRsvpPhone(e.target.value)}
                            placeholder="+91 98..."
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none"
                            style={{ borderColor: themeDef.borderSubtle }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Guests Count</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            disabled={rsvpAttendance === 'declined'}
                            value={rsvpCount}
                            onChange={(e) => setRsvpCount(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white tabular-nums focus:outline-none"
                            style={{ borderColor: themeDef.borderSubtle }}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5">Attendance</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { val: 'attending' as const, label: 'Joyfully Attending' },
                            { val: 'maybe' as const, label: 'Tentative' },
                            { val: 'declined' as const, label: 'Regretfully No' },
                          ].map((opt) => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setRsvpAttendance(opt.val)}
                              className="py-2 px-2 text-xs font-medium rounded-xl border transition-colors"
                              style={{
                                backgroundColor: rsvpAttendance === opt.val ? colors.primary : 'transparent',
                                color: rsvpAttendance === opt.val ? '#FFFFFF' : themeDef.textPrimary,
                                borderColor: rsvpAttendance === opt.val ? colors.primary : themeDef.borderSubtle,
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {events.length > 0 && rsvpAttendance !== 'declined' && (
                        <div>
                          <label className="block text-xs font-medium mb-1.5">Events Attending</label>
                          <div className="flex flex-wrap gap-2">
                            {events.map((evt) => {
                              const active = rsvpEvents.includes(evt.title);
                              return (
                                <button
                                  key={evt.id}
                                  type="button"
                                  onClick={() => toggleEventSelection(evt.title)}
                                  className="px-3 py-1.5 text-xs rounded-lg border transition-colors"
                                  style={{
                                    backgroundColor: active ? colors.secondary : 'transparent',
                                    borderColor: active ? colors.primary : themeDef.borderSubtle,
                                    color: active ? colors.primary : themeDef.textMuted,
                                  }}
                                >
                                  {evt.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium mb-1">Warm Message or Note</label>
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={rsvpMessage}
                          onChange={(e) => setRsvpMessage(e.target.value)}
                          placeholder="Share a blessing for the couple..."
                          className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white focus:outline-none"
                          style={{ borderColor: themeDef.borderSubtle }}
                        />
                      </div>

                      {sections.guestWishes && (
                        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: themeDef.textMuted }}>
                          <input
                            type="checkbox"
                            checked={shareWishFromRsvp}
                            onChange={(e) => setShareWishFromRsvp(e.target.checked)}
                          />
                          Also post my blessing note on the public guest board (phone stays private)
                        </label>
                      )}

                      {rsvpError && <p className="text-xs text-red-700">{rsvpError}</p>}

                      <button
                        type="submit"
                        disabled={rsvpSubmitting}
                        className="w-full py-3 px-5 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <Send className="w-4 h-4" />
                        {rsvpSubmitting ? 'Sending RSVP...' : 'Confirm RSVP'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Public Guest Blessings / Message Board */}
              {sections.guestWishes && (
                <div className="p-6 sm:p-8 rounded-3xl border flex flex-col" style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}>
                  <p className="text-xs uppercase tracking-[0.22em] mb-1.5" style={{ color: colors.accent }}>
                    {lang === 'hi' ? 'शुभकामनाएँ' : 'Guest Message Board'}
                  </p>
                  <h2 className={`text-3xl font-semibold mb-4 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
                    {lang === 'hi' ? 'वर-वधू को आशीर्वाद दें' : 'Blessings & Wishes'}
                  </h2>

                  <form onSubmit={handleWishSubmit} className="space-y-3 pb-5 mb-5 border-b" style={{ borderColor: themeDef.borderSubtle }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={wishName}
                        onChange={(e) => setWishName(e.target.value)}
                        placeholder="Your Name *"
                        className="px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none"
                        style={{ borderColor: themeDef.borderSubtle }}
                      />
                      <input
                        type="text"
                        maxLength={120}
                        value={wishRelation}
                        onChange={(e) => setWishRelation(e.target.value)}
                        placeholder="City or Relation (optional)"
                        className="px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none"
                        style={{ borderColor: themeDef.borderSubtle }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        maxLength={500}
                        value={wishText}
                        onChange={(e) => setWishText(e.target.value)}
                        placeholder="Write a heartfelt wish..."
                        className="flex-1 px-3.5 py-2 text-sm rounded-xl border bg-white focus:outline-none"
                        style={{ borderColor: themeDef.borderSubtle }}
                      />
                      <button
                        type="submit"
                        disabled={wishSubmitting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0 whitespace-nowrap"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <MessageSquareHeart className="w-4 h-4 inline mr-1" />
                        Post
                      </button>
                    </div>
                    {wishError && <p className="text-xs text-red-700">{wishError}</p>}
                  </form>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {wishes.length === 0 ? (
                      <p className="text-sm italic py-6 text-center" style={{ color: themeDef.textMuted }}>
                        Be the first to leave a blessing for {invitation.groomName} & {invitation.brideName}.
                      </p>
                    ) : (
                      wishes.map((w) => (
                        <div
                          key={w.id}
                          className="p-4 rounded-2xl border"
                          style={{ backgroundColor: `${colors.background}F4`, borderColor: themeDef.borderSubtle }}
                        >
                          <p className="text-sm leading-relaxed mb-2">“{w.message}”</p>
                          <div className="text-xs flex items-center gap-2" style={{ color: themeDef.textMuted }}>
                            <strong style={{ color: colors.primary }}>{w.guestName}</strong>
                            {w.cityOrRelation && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{w.cityOrRelation}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 14. WhatsApp Share & QR Code Actions */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#15803D] hover:bg-[#166534] transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4" />
              Share via WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setQrOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border bg-white/80 transition-colors whitespace-nowrap"
              style={{ borderColor: themeDef.borderSubtle, color: themeDef.textPrimary }}
            >
              <QrCode className="w-4 h-4" />
              Invitation QR Pass
            </button>
          </div>
        </section>

        {/* 15. Family Compliments & Thank-You Closing */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center">
          {sections.compliments && invitation.familyCompliments && invitation.familyCompliments.length > 0 && (
            <div className="mb-10 pb-8 border-b" style={{ borderColor: themeDef.borderSubtle }}>
              <p className="text-xs uppercase tracking-[0.22em] mb-3" style={{ color: colors.accent }}>
                {lang === 'hi' ? 'दर्शनाभिलाषी एवं विनीत' : 'With Best Compliments From'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium" style={{ color: themeDef.textPrimary }}>
                {invitation.familyCompliments.map((item, idx) => (
                  <React.Fragment key={item}>
                    <span>{item}</span>
                    {idx < (invitation.familyCompliments?.length || 0) - 1 && (
                      <span aria-hidden="true" style={{ color: colors.accent }}>·</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <p className={`text-2xl sm:text-3xl font-semibold mb-3 ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
            {lang === 'hi' ? 'आपकी उपस्थिति की प्रतीक्षा में' : 'With Love & Gratitude'}
          </p>
          <p className="text-sm sm:text-base leading-relaxed max-w-xl mx-auto" style={{ color: themeDef.textMuted }}>
            {invitation.thankYouMessage ||
              'We eagerly await the joy of celebrating these sacred moments together with you and your family.'}
          </p>
        </section>
      </main>

      {/* 16. Capture Studio Branding Footer */}
      <footer className="relative z-10 border-t py-8 px-4 text-center" style={{ backgroundColor: `${colors.secondary}EC`, borderColor: themeDef.borderSubtle }}>
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-2">
          {studioSettings.logoUrl && (
            <SafeImage
              src={studioSettings.logoUrl}
              alt={studioSettings.businessName}
              className="h-10 w-auto object-contain mb-1"
            />
          )}
          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: colors.accent }}>
            Digital Invitation Crafted By
          </p>
          <a href="/" className={`text-xl font-semibold ${typographyDef.displayClass}`} style={{ color: colors.primary }}>
            {studioSettings.businessName}
          </a>
          <p className="text-xs max-w-md" style={{ color: themeDef.textMuted }}>
            {studioSettings.address}
          </p>
          {(studioSettings.phonePrimary || studioSettings.email) && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-1" style={{ color: themeDef.textMuted }}>
              {studioSettings.phonePrimary && <span>{studioSettings.phonePrimary}</span>}
              {studioSettings.phonePrimary && studioSettings.email && <span aria-hidden="true">·</span>}
              {studioSettings.email && <span>{studioSettings.email}</span>}
            </div>
          )}
        </div>
      </footer>

      {/* Lightbox Modal */}
      {lightboxOpen && gallery[activeSlide] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close photo lightbox"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl w-full max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <SafeImage
              src={gallery[activeSlide].imageUrl}
              alt={gallery[activeSlide].caption || 'Wedding photograph'}
              className="max-h-[75vh] w-auto object-contain rounded-xl"
            />
            {gallery[activeSlide].caption && (
              <p className="text-white/90 text-sm mt-3 text-center">{gallery[activeSlide].caption}</p>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QrCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        slug={invitation.slug}
        coupleTitle={`${invitation.groomName} & ${invitation.brideName}`}
        customDomain={studioSettings.websiteDomain}
        guestName={personalizedGuest || undefined}
        passCode={guestPassCode}
      />
    </div>
  );
};
