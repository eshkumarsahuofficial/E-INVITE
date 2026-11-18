import React, { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowRight, ExternalLink, MapPin, Phone, QrCode, Sparkles } from 'lucide-react';
import {
  CURATED_STUDIO_IMAGES,
  DEFAULT_STUDIO_SETTINGS,
  THEME_DEFINITIONS,
} from '../../data/presets';
import { getStudioSettings } from '../../lib/firestoreService';
import type { StudioSettings, ThemeKey } from '../../types/wedding';
import { QrCodeModal } from '../common/QrCodeModal';
import { SafeImage } from '../common/SafeImage';
import { WatercolorCanvas3D } from '../common/WatercolorCanvas3D';

interface StudioHomePageProps {
  onNavigate: (path: string) => void;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const StudioHomePage: React.FC<StudioHomePageProps> = ({ onNavigate }) => {
  const prefersReducedMotion = useReducedMotion();
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>('traditional');
  const [qrOpen, setQrOpen] = useState(false);

  const heroRef = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const mandapParallaxY = useTransform(heroScroll, [0, 1], [0, prefersReducedMotion ? 0 : 48]);
  const portraitParallaxY = useTransform(heroScroll, [0, 1], [0, prefersReducedMotion ? 0 : -36]);

  useEffect(() => {
    getStudioSettings()
      .then((s) => setSettings(s))
      .catch(() => {
        // fallback to default
      });
  }, []);

  const activeTheme = THEME_DEFINITIONS[selectedTheme];

  return (
    <div className="min-h-screen relative text-[#1C1917] font-body-jakarta">
      {/* 3D Interactive Watercolor & Gilded Petal Canvas */}
      <WatercolorCanvas3D
        primaryColor={activeTheme.colors.primary}
        secondaryColor={activeTheme.colors.secondary}
        accentColor={activeTheme.colors.accent}
        backgroundColor={activeTheme.colors.background}
        showPetals
      />

      {/* Gilded Scroll Progress Hairline */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-50 origin-left pointer-events-none"
        style={{
          scaleX: smoothProgress,
          backgroundColor: activeTheme.colors.primary,
        }}
        aria-hidden="true"
      />

      {/* Strict 3-Zone Top Bar Contract (No backdrop-blur over active WebGL canvas) */}
      <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 border-b border-stone-200/80">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="text-2xl font-display-cormorant font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0"
          >
            {settings.businessName}
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
            <a href="#showcase" className="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0">
              Showcase
            </a>
            <a href="#themes" className="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0">
              Themes
            </a>
            <a href="#capabilities" className="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0">
              Capabilities
            </a>
            <a href="#contact" className="hover:text-stone-900 transition-colors whitespace-nowrap shrink-0">
              Contact
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#881337] rounded-lg hover:bg-[#6D0F2C] transition-colors whitespace-nowrap shrink-0"
            >
              Admin Console
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Editorial Hero Split with Parallax & Staggered Reveals */}
        <section ref={heroRef} id="showcase" className="max-w-7xl mx-auto px-6 pt-12 pb-20 lg:pt-20 lg:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
              className="lg:col-span-6 flex flex-col justify-center space-y-6"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-[#881337] font-medium">
                Digital Wedding Stationery · Rajnandgaon, Chhattisgarh
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-display-cormorant font-semibold tracking-tight leading-[1.06] text-stone-900">
                Bespoke Digital Wedding Invitations, Crafted Like Fine Art
              </h1>

              <p className="text-base text-stone-700 leading-relaxed max-w-xl">
                {settings.businessName} empowers couples and wedding studios to publish permanent, bilingual Hindi & English digital invitations with 3D watercolor artistry, ceremonial timelines, Google Maps navigation, and private RSVP tracking.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <motion.a
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  href="/invite/amit-gauri"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('/invite/amit-gauri');
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-[#881337] rounded-xl hover:bg-[#6D0F2C] transition-colors whitespace-nowrap shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Preview Amit & Gauri Invite
                </motion.a>
                <motion.button
                  whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  type="button"
                  onClick={() => setQrOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium border border-stone-300 text-stone-800 bg-white/90 rounded-xl hover:bg-white transition-colors whitespace-nowrap"
                >
                  <QrCode className="w-4 h-4" />
                  Scan Sample QR
                </motion.button>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3 text-xs text-stone-600">
                <span className="font-mono-tabular">invite.capturestudio.in/amit-gauri</span>
                <span aria-hidden="true">·</span>
                <span>Bilingual EN / हिन्दी</span>
                <span aria-hidden="true">·</span>
                <span>WhatsApp & QR Ready</span>
              </div>
            </motion.div>

            <div className="lg:col-span-6 relative">
              <motion.div
                style={{ y: mandapParallaxY }}
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.85, ease: EASE_OUT_EXPO }}
                className="h-full min-h-[380px] lg:min-h-[470px] rounded-3xl overflow-hidden border border-stone-200/90 bg-white/90 p-2.5 shadow-lg shadow-stone-900/5"
              >
                <SafeImage
                  src={CURATED_STUDIO_IMAGES.mandapHero}
                  alt="Luxury Indian wedding mandap floral arch"
                  className="w-full h-full min-h-[360px] object-cover rounded-2xl"
                />
              </motion.div>

              {/* Floating Editorial Couple Frame with Counter-Parallax */}
              <motion.div
                style={{ y: portraitParallaxY }}
                initial={prefersReducedMotion ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.9, delay: 0.15, ease: EASE_OUT_EXPO }}
                className="hidden sm:block absolute -bottom-8 -left-6 w-44 rounded-2xl overflow-hidden border border-stone-200 bg-white p-1.5 shadow-xl shadow-stone-900/10"
              >
                <div className="aspect-[3/4] rounded-xl overflow-hidden">
                  <SafeImage
                    src={CURATED_STUDIO_IMAGES.couplePortrait}
                    alt="Amit & Gauri editorial wedding portrait"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-2 py-2 flex items-center justify-between text-[11px] text-stone-600">
                  <span className="font-display-cormorant text-sm font-semibold text-stone-900">Amit & Gauri</span>
                  <span>Feb 2027</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Signature 3D Watercolor Theme Atelier */}
        <section id="themes" className="border-y border-stone-200/80 bg-white/75 py-20">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
              className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-stone-500 mb-2">
                  Live Watercolor Atelier
                </p>
                <h2 className="text-3xl sm:text-4xl font-display-cormorant font-semibold text-stone-900">
                  Four Signature Wedding Aesthetics
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200/70">
                {Object.values(THEME_DEFINITIONS).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedTheme(t.key)}
                    className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      selectedTheme === t.key
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTheme}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
                    className="h-full rounded-3xl border p-8 sm:p-10 flex flex-col justify-between"
                    style={{
                      backgroundColor: activeTheme.colors.secondary,
                      borderColor: activeTheme.borderSubtle,
                      color: activeTheme.textPrimary,
                    }}
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] mb-3" style={{ color: activeTheme.colors.accent }}>
                        {activeTheme.label} Palette · Live 3D Backdrop Active
                      </p>
                      <h3 className={`text-4xl sm:text-5xl font-semibold mb-4 ${activeTheme.displayFontClass}`} style={{ color: activeTheme.colors.primary }}>
                        Amit & Gauri
                      </h3>
                      <p className="text-sm leading-relaxed max-w-md mb-6" style={{ color: activeTheme.textMuted }}>
                        {activeTheme.subtitle}. Includes Ganesh Vandana, interactive date reveal, live countdown, multi-event itinerary, and private RSVP tracking.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t" style={{ borderColor: activeTheme.borderSubtle }}>
                      <div className="flex items-center gap-2">
                        {[
                          activeTheme.colors.primary,
                          activeTheme.colors.accent,
                          activeTheme.colors.secondary,
                          activeTheme.colors.background,
                        ].map((hex, i) => (
                          <span
                            key={i}
                            className="w-7 h-7 rounded-full border border-stone-300"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                      <a
                        href="/invite/amit-gauri"
                        onClick={(e) => {
                          e.preventDefault();
                          onNavigate('/invite/amit-gauri');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                        style={{ color: activeTheme.colors.primary }}
                      >
                        Open Live Invitation
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <motion.div
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl overflow-hidden border border-stone-200 aspect-[3/4] bg-white p-1.5"
                >
                  <SafeImage
                    src={CURATED_STUDIO_IMAGES.bridePortrait}
                    alt="Indian bridal editorial portrait"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </motion.div>
                <motion.div
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl overflow-hidden border border-stone-200 aspect-[3/4] bg-white p-1.5"
                >
                  <SafeImage
                    src={CURATED_STUDIO_IMAGES.floralArch}
                    alt="Crimson roses and brass urlis decor"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Scroll-Choreographed Capabilities Showcase */}
        <section id="capabilities" className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#881337]">
                Studio Architecture
              </p>
              <h2 className="text-3xl sm:text-4xl font-display-cormorant font-semibold text-stone-900">
                One Studio Console, Unlimited Client Websites
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed max-w-md">
                Every invitation is dynamically rendered from structured database records—no duplicate code per client, instant live updates, and permanent URLs tailored for WhatsApp previews.
              </p>
            </div>

            <div className="lg:col-span-7 space-y-5">
              {[
                {
                  num: '01.',
                  title: '6-Step Invitation Builder',
                  desc: 'Enter couple details, family elders, gotra, unlimited ceremonies, drag-and-drop galleries, and publish to a permanent couple URL.',
                },
                {
                  num: '02.',
                  title: 'Bilingual Hindi & English',
                  desc: 'Seamless Devanagari Hindi and English support including Ganesh Vandana, bilingual event cards, and live language switching.',
                },
                {
                  num: '03.',
                  title: 'Guest Links & QR Passes',
                  desc: 'Create personalized invitation URLs for VIP families, download high-resolution QR codes, and share on WhatsApp in one tap.',
                },
                {
                  num: '04.',
                  title: 'Private RSVP & Wishes',
                  desc: 'Attendance counts and guest phone numbers stay strictly private to studio admins while public wishes appear on the blessing board.',
                },
              ].map((item, idx) => (
                <motion.div
                  key={item.num}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: idx * 0.06, ease: EASE_OUT_EXPO }}
                  className="p-7 rounded-2xl border border-stone-200/90 bg-white/90 space-y-2"
                >
                  <span className="text-xs font-mono-tabular font-semibold text-[#881337]">{item.num}</span>
                  <h3 className="text-xl font-display-cormorant font-semibold text-stone-900">{item.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact & Studio Address */}
        <section id="contact" className="max-w-7xl mx-auto px-6 pb-20">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
            className="bg-stone-900 text-stone-100 rounded-3xl p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8"
          >
            <div className="space-y-3 max-w-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-amber-300">
                Visit Capture Studio
              </p>
              <h2 className="text-3xl sm:text-4xl font-display-cormorant font-semibold text-white">
                {settings.businessName}
              </h2>
              <p className="text-sm text-stone-300 flex items-start gap-2 leading-relaxed">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-amber-300" />
                <span>{settings.address}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300 pt-1">
                {settings.phonePrimary && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-300" />
                    {settings.phonePrimary}
                  </span>
                )}
                {settings.email && <span>{settings.email}</span>}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold bg-white text-stone-900 rounded-xl hover:bg-stone-100 transition-colors whitespace-nowrap"
              >
                Open Admin Console
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="/invite/amit-gauri"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/invite/amit-gauri');
                }}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium border border-stone-700 text-stone-200 rounded-xl hover:bg-stone-800 transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-4 h-4" />
                View Sample Invite
              </a>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-stone-200/80 bg-[#FAF8F5]/90 py-8 px-6 text-center text-xs text-stone-500">
        <p>
          © {new Date().getFullYear()} {settings.businessName} · {settings.address}
        </p>
      </footer>

      <QrCodeModal
        isOpen={qrOpen}
        onClose={() => setQrOpen(false)}
        slug="amit-gauri"
        coupleTitle="Amit & Gauri"
        customDomain={settings.websiteDomain}
      />
    </div>
  );
};
