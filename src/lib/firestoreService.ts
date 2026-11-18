import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  DEFAULT_STUDIO_SETTINGS,
  DEFAULT_TEMPLATES,
  SHOWCASE_EVENTS,
  SHOWCASE_GALLERY,
  SHOWCASE_INVITATION,
  SHOWCASE_WISHES,
} from '../data/presets';
import {
  ClientRecord,
  GalleryPhoto,
  GuestPass,
  GuestRecord,
  GuestWish,
  InvitationRecord,
  RsvpRecord,
  StudioSettings,
  TemplatePreset,
  UploadedMediaFile,
  WeddingEvent,
} from '../types/wedding';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const clean: Record<string, unknown> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) {
      clean[k] = v;
    }
  });
  return clean as T;
}

export async function getStudioSettings(): Promise<StudioSettings> {
  const path = 'studioSettings/default';
  try {
    const snap = await getDoc(doc(db, 'studioSettings', 'default'));
    if (snap.exists()) {
      return snap.data() as StudioSettings;
    }
    return DEFAULT_STUDIO_SETTINGS;
  } catch (error) {
    // Public fallback if unseeded or offline
    console.warn('Using default studio settings:', error);
    return DEFAULT_STUDIO_SETTINGS;
  }
}

export async function saveStudioSettings(
  settings: Omit<StudioSettings, 'id' | 'ownerUid' | 'updatedAt'>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  const path = 'studioSettings/default';
  try {
    const ref = doc(db, 'studioSettings', 'default');
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        ...stripUndefined(settings),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...stripUndefined(settings),
        id: 'default',
        ownerUid: uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listTemplates(activeOnly = false): Promise<TemplatePreset[]> {
  const path = 'templates';
  try {
    const ref = collection(db, 'templates');
    const q = activeOnly ? query(ref, where('isActive', '==', true)) : ref;
    const snap = await getDocs(q);
    if (snap.empty) {
      return DEFAULT_TEMPLATES as TemplatePreset[];
    }
    return snap.docs.map((d) => d.data() as TemplatePreset);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveTemplate(
  template: Omit<TemplatePreset, 'ownerUid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  const path = `templates/${template.id}`;
  try {
    const ref = doc(db, 'templates', template.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const { id: _id, ...updatable } = template;
      await updateDoc(ref, {
        ...stripUndefined(updatable),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...stripUndefined(template),
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listClients(): Promise<ClientRecord[]> {
  const path = 'clients';
  try {
    const snap = await getDocs(collection(db, 'clients'));
    return snap.docs.map((d) => d.data() as ClientRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveClient(
  client: Omit<ClientRecord, 'ownerUid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  const path = `clients/${client.id}`;
  try {
    const ref = doc(db, 'clients', client.id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const { id: _id, ...updatable } = client;
      await updateDoc(ref, {
        ...stripUndefined(updatable),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...stripUndefined(client),
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClient(clientId: string): Promise<void> {
  const path = `clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listInvitationsAdmin(): Promise<InvitationRecord[]> {
  const path = 'invitations';
  try {
    const snap = await getDocs(collection(db, 'invitations'));
    return snap.docs.map((d) => d.data() as InvitationRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getInvitationBySlug(slug: string): Promise<InvitationRecord | null> {
  const path = `invitations/${slug}`;
  try {
    const snap = await getDoc(doc(db, 'invitations', slug));
    if (!snap.exists()) return null;
    return snap.data() as InvitationRecord;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveInvitationWithChildren(
  invitation: Omit<InvitationRecord, 'ownerUid' | 'createdAt' | 'updatedAt'>,
  events: Array<Omit<WeddingEvent, 'invitationId' | 'isPublic' | 'ownerUid' | 'createdAt' | 'updatedAt'>>,
  gallery: Array<Omit<GalleryPhoto, 'invitationId' | 'isPublic' | 'ownerUid' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  const invPath = `invitations/${invitation.slug}`;
  const isPublic = invitation.status === 'published' && !invitation.isArchived;

  try {
    const invRef = doc(db, 'invitations', invitation.slug);
    const existingInv = await getDoc(invRef);

    if (existingInv.exists()) {
      const { id: _id, slug: _slug, ...updatable } = invitation;
      await updateDoc(invRef, {
        ...stripUndefined(updatable),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(invRef, {
        ...stripUndefined(invitation),
        id: invitation.slug,
        slug: invitation.slug,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Sync events subcollection
    const existingEventsSnap = await getDocs(collection(db, 'invitations', invitation.slug, 'events'));
    const keepEventIds = new Set(events.map((e) => e.id));
    for (const d of existingEventsSnap.docs) {
      if (!keepEventIds.has(d.id)) {
        await deleteDoc(d.ref);
      }
    }
    for (let i = 0; i < events.length; i += 1) {
      const evt = events[i];
      const evtRef = doc(db, 'invitations', invitation.slug, 'events', evt.id);
      const prev = existingEventsSnap.docs.find((d) => d.id === evt.id);
      if (prev) {
        const { id: _id, ...evtRest } = evt;
        await updateDoc(evtRef, {
          ...stripUndefined(evtRest),
          sortOrder: i + 1,
          isPublic,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(evtRef, {
          ...stripUndefined(evt),
          invitationId: invitation.slug,
          sortOrder: i + 1,
          isPublic,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Sync galleries subcollection
    const existingGallerySnap = await getDocs(collection(db, 'invitations', invitation.slug, 'galleries'));
    const keepPhotoIds = new Set(gallery.map((g) => g.id));
    for (const d of existingGallerySnap.docs) {
      if (!keepPhotoIds.has(d.id)) {
        await deleteDoc(d.ref);
      }
    }
    for (let i = 0; i < gallery.length; i += 1) {
      const photo = gallery[i];
      const photoRef = doc(db, 'invitations', invitation.slug, 'galleries', photo.id);
      const prev = existingGallerySnap.docs.find((d) => d.id === photo.id);
      if (prev) {
        const { id: _id, ...photoRest } = photo;
        await updateDoc(photoRef, {
          ...stripUndefined(photoRest),
          sortOrder: i + 1,
          isPublic,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(photoRef, {
          ...stripUndefined(photo),
          invitationId: invitation.slug,
          sortOrder: i + 1,
          isPublic,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, invPath);
  }
}

export async function updateInvitationStatus(
  slug: string,
  updates: Partial<Pick<InvitationRecord, 'status' | 'isArchived' | 'expiresAt'>>
): Promise<void> {
  const path = `invitations/${slug}`;
  try {
    const invRef = doc(db, 'invitations', slug);
    const snap = await getDoc(invRef);
    if (!snap.exists()) return;
    const current = snap.data() as InvitationRecord;
    const nextStatus = updates.status ?? current.status;
    const nextArchived = updates.isArchived ?? current.isArchived;
    const isPublic = nextStatus === 'published' && !nextArchived;

    await updateDoc(invRef, {
      ...stripUndefined(updates),
      updatedAt: serverTimestamp(),
    });

    // Propagate visibility to events and gallery subcollections
    const batch = writeBatch(db);
    const eventsSnap = await getDocs(collection(db, 'invitations', slug, 'events'));
    eventsSnap.docs.forEach((d) => {
      batch.update(d.ref, { isPublic, updatedAt: serverTimestamp() });
    });
    const galSnap = await getDocs(collection(db, 'invitations', slug, 'galleries'));
    galSnap.docs.forEach((d) => {
      batch.update(d.ref, { isPublic, updatedAt: serverTimestamp() });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function duplicateInvitation(sourceSlug: string, newSlug: string): Promise<void> {
  const source = await getInvitationBySlug(sourceSlug);
  if (!source) throw new Error('Source invitation not found');
  const events = await listEvents(sourceSlug, true);
  const gallery = await listGallery(sourceSlug, true);

  await saveInvitationWithChildren(
    {
      ...source,
      id: newSlug,
      slug: newSlug,
      status: 'draft',
      isArchived: false,
      brideName: `${source.brideName}`,
      groomName: `${source.groomName} (Copy)`,
    },
    events.map((e, i) => ({
      id: `evt-${Date.now()}-${i}`,
      title: e.title,
      titleHi: e.titleHi,
      eventDate: e.eventDate,
      eventTime: e.eventTime,
      venue: e.venue,
      venueAddress: e.venueAddress,
      googleMapsUrl: e.googleMapsUrl,
      description: e.description,
      sortOrder: e.sortOrder,
    })),
    gallery.map((g, i) => ({
      id: `gal-${Date.now()}-${i}`,
      imageUrl: g.imageUrl,
      caption: g.caption,
      sortOrder: g.sortOrder,
    }))
  );
}

export async function deleteInvitation(slug: string): Promise<void> {
  const path = `invitations/${slug}`;
  try {
    const subcols = ['events', 'galleries', 'guests', 'guestPasses', 'rsvps', 'wishes'];
    for (const sub of subcols) {
      const snap = await getDocs(collection(db, 'invitations', slug, sub));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }
    await deleteDoc(doc(db, 'invitations', slug));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listEvents(slug: string, isAdminView = false): Promise<WeddingEvent[]> {
  const path = `invitations/${slug}/events`;
  try {
    const ref = collection(db, 'invitations', slug, 'events');
    const q = isAdminView
      ? query(ref, orderBy('sortOrder', 'asc'))
      : query(ref, where('isPublic', '==', true), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as WeddingEvent);
  } catch (error) {
    // Fallback without composite index requirement if orderBy + where triggers index wait
    try {
      const ref = collection(db, 'invitations', slug, 'events');
      const q = isAdminView ? ref : query(ref, where('isPublic', '==', true));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => d.data() as WeddingEvent)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (innerErr) {
      handleFirestoreError(innerErr, OperationType.LIST, path);
    }
  }
}

export async function listGallery(slug: string, isAdminView = false): Promise<GalleryPhoto[]> {
  const path = `invitations/${slug}/galleries`;
  try {
    const ref = collection(db, 'invitations', slug, 'galleries');
    const q = isAdminView ? ref : query(ref, where('isPublic', '==', true));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as GalleryPhoto)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function listGuests(slug: string): Promise<GuestRecord[]> {
  const path = `invitations/${slug}/guests`;
  try {
    const snap = await getDocs(collection(db, 'invitations', slug, 'guests'));
    return snap.docs.map((d) => d.data() as GuestRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveGuestWithPass(
  slug: string,
  guest: Omit<GuestRecord, 'invitationId' | 'ownerUid' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Authentication required');
  const path = `invitations/${slug}/guests/${guest.id}`;
  try {
    const guestRef = doc(db, 'invitations', slug, 'guests', guest.id);
    const passRef = doc(db, 'invitations', slug, 'guestPasses', guest.inviteCode);
    const existing = await getDoc(guestRef);

    if (existing.exists()) {
      const { id: _id, ...updatable } = guest;
      await updateDoc(guestRef, {
        ...stripUndefined(updatable),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(guestRef, {
        ...stripUndefined(guest),
        invitationId: slug,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const existingPass = await getDoc(passRef);
    if (existingPass.exists()) {
      await updateDoc(passRef, {
        guestName: guest.guestName,
        personalNote: guest.personalNote || '',
        isPublic: true,
      });
    } else {
      await setDoc(passRef, {
        id: guest.inviteCode,
        invitationId: slug,
        guestName: guest.guestName,
        personalNote: guest.personalNote || '',
        isPublic: true,
        ownerUid: uid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteGuest(slug: string, guestId: string, inviteCode: string): Promise<void> {
  const path = `invitations/${slug}/guests/${guestId}`;
  try {
    await deleteDoc(doc(db, 'invitations', slug, 'guests', guestId));
    await deleteDoc(doc(db, 'invitations', slug, 'guestPasses', inviteCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getGuestPass(slug: string, passId: string): Promise<GuestPass | null> {
  const path = `invitations/${slug}/guestPasses/${passId}`;
  try {
    const snap = await getDoc(doc(db, 'invitations', slug, 'guestPasses', passId));
    if (!snap.exists()) return null;
    return snap.data() as GuestPass;
  } catch {
    return null;
  }
}

export async function listRsvpsAdmin(slug: string): Promise<RsvpRecord[]> {
  const path = `invitations/${slug}/rsvps`;
  try {
    const snap = await getDocs(collection(db, 'invitations', slug, 'rsvps'));
    return snap.docs.map((d) => d.data() as RsvpRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitPublicRsvp(
  slug: string,
  payload: {
    guestName: string;
    phone?: string;
    attending: 'attending' | 'declined' | 'maybe';
    guestsCount: number;
    eventsAttending: string[];
    message?: string;
    shareAsWish?: boolean;
  }
): Promise<void> {
  const rsvpId = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `invitations/${slug}/rsvps/${rsvpId}`;
  try {
    await setDoc(doc(db, 'invitations', slug, 'rsvps', rsvpId), {
      id: rsvpId,
      invitationId: slug,
      guestName: payload.guestName.trim().slice(0, 120),
      phone: (payload.phone || '').trim().slice(0, 40),
      attending: payload.attending,
      guestsCount: Math.max(0, Math.min(30, payload.guestsCount)),
      eventsAttending: payload.eventsAttending.slice(0, 20),
      message: (payload.message || '').trim().slice(0, 600),
      createdAt: serverTimestamp(),
    });

    if (payload.shareAsWish && payload.message?.trim()) {
      const wishId = `wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'invitations', slug, 'wishes', wishId), {
        id: wishId,
        invitationId: slug,
        guestName: payload.guestName.trim().slice(0, 120),
        cityOrRelation: payload.attending === 'attending' ? 'Joining the Celebration' : 'Warm Wishes',
        message: payload.message.trim().slice(0, 500),
        isPublic: true,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listPublicWishes(slug: string, isAdminView = false): Promise<GuestWish[]> {
  const path = `invitations/${slug}/wishes`;
  try {
    const ref = collection(db, 'invitations', slug, 'wishes');
    const q = isAdminView ? ref : query(ref, where('isPublic', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as GuestWish);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function submitPublicWish(
  slug: string,
  payload: { guestName: string; cityOrRelation?: string; message: string }
): Promise<void> {
  const wishId = `wish-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `invitations/${slug}/wishes/${wishId}`;
  try {
    await setDoc(doc(db, 'invitations', slug, 'wishes', wishId), {
      id: wishId,
      invitationId: slug,
      guestName: payload.guestName.trim().slice(0, 120),
      cityOrRelation: (payload.cityOrRelation || '').trim().slice(0, 120),
      message: payload.message.trim().slice(0, 500),
      isPublic: true,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteWish(slug: string, wishId: string): Promise<void> {
  const path = `invitations/${slug}/wishes/${wishId}`;
  try {
    await deleteDoc(doc(db, 'invitations', slug, 'wishes', wishId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedStudioDefaultsIfEmpty(): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    // Ensure studioSettings/default exists
    const settingsRef = doc(db, 'studioSettings', 'default');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        ...DEFAULT_STUDIO_SETTINGS,
        ownerUid: uid,
        updatedAt: serverTimestamp(),
      });
    }

    // Ensure default templates exist
    const templatesSnap = await getDocs(collection(db, 'templates'));
    if (templatesSnap.empty) {
      for (const tpl of DEFAULT_TEMPLATES) {
        await setDoc(doc(db, 'templates', tpl.id), {
          ...tpl,
          ownerUid: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // Ensure showcase client & invitation (amit-gauri) exist if no invitations exist
    const invSnap = await getDocs(collection(db, 'invitations'));
    if (invSnap.empty) {
      await setDoc(doc(db, 'clients', 'client-amit-gauri'), {
        id: 'client-amit-gauri',
        brideName: 'Gauri',
        groomName: 'Amit',
        primaryContactName: 'Shri Mahendra Kumar Deshmukh',
        phone: '+91 98261 44110',
        email: 'amit.deshmukh@example.com',
        city: 'Rajnandgaon, Chhattisgarh',
        notes: 'Flagship Traditional Utsav wedding suite with 4 ceremonies.',
        status: 'active',
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await saveInvitationWithChildren(
        {
          ...SHOWCASE_INVITATION,
        },
        SHOWCASE_EVENTS.map((e) => ({
          id: e.id,
          title: e.title,
          titleHi: e.titleHi,
          eventDate: e.eventDate,
          eventTime: e.eventTime,
          venue: e.venue,
          venueAddress: e.venueAddress,
          googleMapsUrl: e.googleMapsUrl,
          description: e.description,
          sortOrder: e.sortOrder,
        })),
        SHOWCASE_GALLERY.map((g) => ({
          id: g.id,
          imageUrl: g.imageUrl,
          caption: g.caption,
          sortOrder: g.sortOrder,
        }))
      );

      for (const wish of SHOWCASE_WISHES) {
        await setDoc(doc(db, 'invitations', 'amit-gauri', 'wishes', wish.id), {
          ...wish,
          createdAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    console.warn('Auto-seed skipped or partial:', err);
  }
}

export async function uploadStudioImage(file: File): Promise<UploadedMediaFile> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to upload photos.');
  const token = await user.getIdToken();

  const dataBase64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const resp = await fetch('/api/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      dataBase64,
    }),
  });

  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || 'Image upload failed');
  }
  return (await resp.json()) as UploadedMediaFile;
}

export async function listStudioUploads(): Promise<UploadedMediaFile[]> {
  const user = auth.currentUser;
  if (!user) return [];
  const token = await user.getIdToken();
  const resp = await fetch('/api/uploads', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return [];
  const data = (await resp.json()) as { files?: UploadedMediaFile[] };
  return data.files || [];
}

export async function deleteStudioUpload(filename: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  const token = await user.getIdToken();
  const resp = await fetch(`/api/uploads/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || 'Failed to delete media file');
  }
}
