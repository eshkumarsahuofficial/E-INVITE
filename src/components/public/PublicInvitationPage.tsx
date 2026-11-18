import React, { useEffect, useState } from 'react';
import {
  DEFAULT_STUDIO_SETTINGS,
  SHOWCASE_EVENTS,
  SHOWCASE_GALLERY,
  SHOWCASE_INVITATION,
  SHOWCASE_WISHES,
} from '../../data/presets';
import {
  getInvitationBySlug,
  getStudioSettings,
  listEvents,
  listGallery,
  listPublicWishes,
} from '../../lib/firestoreService';
import type {
  GalleryPhoto,
  GuestWish,
  InvitationRecord,
  StudioSettings,
  WeddingEvent,
} from '../../types/wedding';
import { PublicInvitationView } from './PublicInvitationView';

interface PublicInvitationPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

export const PublicInvitationPage: React.FC<PublicInvitationPageProps> = ({
  slug,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationRecord | null>(null);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [wishes, setWishes] = useState<GuestWish[]>([]);
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [notFound, setNotFound] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const guestQueryName = searchParams.get('guest') || undefined;
  const guestPassCode = searchParams.get('g') || undefined;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    async function load() {
      try {
        const [invDoc, settings] = await Promise.all([
          getInvitationBySlug(slug).catch(() => null),
          getStudioSettings().catch(() => DEFAULT_STUDIO_SETTINGS),
        ]);

        if (!active) return;
        setStudioSettings(settings);

        if (invDoc && !invDoc.isArchived && (invDoc.status === 'published' || invDoc.status === 'expired')) {
          const [evts, gal, wishDocs] = await Promise.all([
            listEvents(slug, false).catch(() => []),
            listGallery(slug, false).catch(() => []),
            listPublicWishes(slug, false).catch(() => []),
          ]);
          if (!active) return;
          setInvitation(invDoc);
          setEvents(evts);
          setGallery(gal);
          setWishes(wishDocs);
          document.title = `${invDoc.groomName} & ${invDoc.brideName} — Wedding Invitation | ${settings.businessName}`;
          setLoading(false);
          return;
        }

        // Fallback showcase for flagship /invite/amit-gauri prior to first admin seed
        if (slug === 'amit-gauri') {
          setInvitation(SHOWCASE_INVITATION);
          setEvents(SHOWCASE_EVENTS);
          setGallery(SHOWCASE_GALLERY);
          setWishes(SHOWCASE_WISHES);
          document.title = `${SHOWCASE_INVITATION.groomName} & ${SHOWCASE_INVITATION.brideName} — Wedding Invitation | ${settings.businessName}`;
          setLoading(false);
          return;
        }

        setNotFound(true);
        setLoading(false);
      } catch {
        if (slug === 'amit-gauri') {
          setInvitation(SHOWCASE_INVITATION);
          setEvents(SHOWCASE_EVENTS);
          setGallery(SHOWCASE_GALLERY);
          setWishes(SHOWCASE_WISHES);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-[#881337]">Capture Studio</p>
          <p className="text-lg font-display-cormorant text-stone-700">Preparing wedding invitation...</p>
        </div>
      </div>
    );
  }

  if (notFound || !invitation) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Capture Studio</p>
          <h1 className="text-3xl font-display-cormorant font-semibold text-stone-900 mb-2">
            Invitation Unavailable
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            The invitation <span className="font-mono-tabular">/invite/{slug}</span> is either still in draft, archived, or does not exist.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Capture Studio Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/invite/amit-gauri')}
              className="px-4 py-2 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50"
            >
              View Sample Invite
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicInvitationView
      invitation={invitation}
      events={events}
      gallery={gallery}
      initialWishes={wishes}
      studioSettings={studioSettings}
      guestQueryName={guestQueryName}
      guestPassCode={guestPassCode}
    />
  );
};
