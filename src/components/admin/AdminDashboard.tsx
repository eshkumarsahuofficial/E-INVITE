import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  Archive,
  BarChart3,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FolderHeart,
  Image as ImageIcon,
  Layers,
  LogOut,
  MailCheck,
  Palette,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  CURATED_STUDIO_IMAGES,
  DEFAULT_STUDIO_SETTINGS,
  THEME_DEFINITIONS,
} from '../../data/presets';
import { auth, BOOTSTRAP_ADMIN_EMAIL, googleProvider } from '../../lib/firebase';
import {
  deleteClient,
  deleteGuest,
  deleteInvitation,
  deleteStudioUpload,
  deleteWish,
  duplicateInvitation,
  getStudioSettings,
  listClients,
  listEvents,
  listGallery,
  listGuests,
  listInvitationsAdmin,
  listPublicWishes,
  listRsvpsAdmin,
  listStudioUploads,
  listTemplates,
  saveClient,
  saveGuestWithPass,
  saveStudioSettings,
  saveTemplate,
  seedStudioDefaultsIfEmpty,
  updateInvitationStatus,
  uploadStudioImage,
} from '../../lib/firestoreService';
import type {
  ClientRecord,
  GalleryPhoto,
  GuestRecord,
  GuestWish,
  InvitationRecord,
  InvitationStatus,
  RsvpRecord,
  StudioSettings,
  TemplatePreset,
  UploadedMediaFile,
  WeddingEvent,
} from '../../types/wedding';
import { QrCodeModal } from '../common/QrCodeModal';
import { SafeImage } from '../common/SafeImage';
import { InvitationWizard } from './InvitationWizard';
import { PhotoUploadInput } from './PhotoUploadInput';

type AdminTab =
  | 'overview'
  | 'invitations'
  | 'clients'
  | 'rsvps'
  | 'guests'
  | 'templates'
  | 'media'
  | 'settings';

interface AdminDashboardProps {
  onNavigate: (path: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');

  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Core Data
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(DEFAULT_STUDIO_SETTINGS);
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [templates, setTemplates] = useState<TemplatePreset[]>([]);
  const [uploads, setUploads] = useState<UploadedMediaFile[]>([]);

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InvitationRecord | null>(null);
  const [editingEvents, setEditingEvents] = useState<WeddingEvent[]>([]);
  const [editingGallery, setEditingGallery] = useState<GalleryPhoto[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InvitationStatus | 'archived'>('all');

  // QR Modal
  const [qrTarget, setQrTarget] = useState<{
    slug: string;
    title: string;
    guestName?: string;
    passCode?: string;
  } | null>(null);

  // Selected Invitation for RSVPs / Guests
  const [selectedSlug, setSelectedSlug] = useState('');
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [wishes, setWishes] = useState<GuestWish[]>([]);
  const [guests, setGuests] = useState<GuestRecord[]>([]);

  // Client Modal / Form
  const [clientFormOpen, setClientFormOpen] = useState(false);
  const [clientDraft, setClientDraft] = useState({
    id: '',
    brideName: '',
    groomName: '',
    primaryContactName: '',
    phone: '',
    email: '',
    city: '',
    notes: '',
    status: 'active' as 'active' | 'archived',
  });

  // Guest Form
  const [guestDraft, setGuestDraft] = useState({
    guestName: '',
    familyGroup: '',
    phone: '',
    personalNote: '',
  });

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isVerifiedAdmin = Boolean(
    user && user.emailVerified && user.email === BOOTSTRAP_ADMIN_EMAIL
  );

  const loadWorkspaceData = useCallback(async () => {
    if (!isVerifiedAdmin) return;
    setLoading(true);
    try {
      await seedStudioDefaultsIfEmpty();
      const [settings, invList, clientList, tplList, mediaList] = await Promise.all([
        getStudioSettings(),
        listInvitationsAdmin(),
        listClients(),
        listTemplates(false),
        listStudioUploads(),
      ]);
      setStudioSettings(settings);
      setInvitations(invList);
      setClients(clientList);
      setTemplates(tplList);
      setUploads(mediaList);
      if (invList.length > 0 && !selectedSlug) {
        setSelectedSlug(invList[0].slug);
      }
    } catch (err) {
      console.error('Failed loading admin workspace:', err);
    } finally {
      setLoading(false);
    }
  }, [isVerifiedAdmin, selectedSlug]);

  useEffect(() => {
    void loadWorkspaceData();
  }, [loadWorkspaceData]);

  useEffect(() => {
    if (!isVerifiedAdmin || !selectedSlug) return;
    Promise.all([
      listRsvpsAdmin(selectedSlug),
      listPublicWishes(selectedSlug, true),
      listGuests(selectedSlug),
    ])
      .then(([rsvpDocs, wishDocs, guestDocs]) => {
        setRsvps(rsvpDocs);
        setWishes(wishDocs);
        setGuests(guestDocs);
      })
      .catch((err) => console.error('Failed loading invitation responses:', err));
  }, [isVerifiedAdmin, selectedSlug]);

  const handleSignIn = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed');
    }
  };

  const handleOpenNewWizard = () => {
    setEditingInv(null);
    setEditingEvents([]);
    setEditingGallery([]);
    setWizardOpen(true);
  };

  const handleEditInvitation = async (inv: InvitationRecord) => {
    setLoading(true);
    try {
      const [evts, gal] = await Promise.all([
        listEvents(inv.slug, true),
        listGallery(inv.slug, true),
      ]);
      setEditingInv(inv);
      setEditingEvents(evts);
      setEditingGallery(gal);
      setWizardOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (inv: InvitationRecord) => {
    const suffix = Math.random().toString(36).slice(2, 5);
    const nextSlug = `${inv.slug}-${suffix}`;
    try {
      await duplicateInvitation(inv.slug, nextSlug);
      await loadWorkspaceData();
      notify(`Duplicated invitation to /invite/${nextSlug}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Duplicate failed');
    }
  };

  const handleStatusChange = async (
    inv: InvitationRecord,
    updates: Partial<Pick<InvitationRecord, 'status' | 'isArchived'>>
  ) => {
    await updateInvitationStatus(inv.slug, updates);
    await loadWorkspaceData();
    notify(`Updated ${inv.groomName} & ${inv.brideName}`);
  };

  const handleDeleteInvitation = async (inv: InvitationRecord) => {
    await deleteInvitation(inv.slug);
    await loadWorkspaceData();
    notify(`Deleted /invite/${inv.slug}`);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientDraft.brideName.trim() || !clientDraft.groomName.trim()) return;
    const id = clientDraft.id || `client-${Date.now()}`;
    await saveClient({
      ...clientDraft,
      id,
    });
    setClientFormOpen(false);
    setClientDraft({
      id: '',
      brideName: '',
      groomName: '',
      primaryContactName: '',
      phone: '',
      email: '',
      city: '',
      notes: '',
      status: 'active',
    });
    await loadWorkspaceData();
    notify('Client record saved.');
  };

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlug || !guestDraft.guestName.trim()) return;
    const id = `guest-${Date.now()}`;
    const code = `${guestDraft.guestName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 18)}-${Math.random().toString(36).slice(2, 6)}`;
    await saveGuestWithPass(selectedSlug, {
      id,
      guestName: guestDraft.guestName.trim(),
      familyGroup: guestDraft.familyGroup.trim(),
      phone: guestDraft.phone.trim(),
      personalNote: guestDraft.personalNote.trim(),
      inviteCode: code,
    });
    setGuestDraft({ guestName: '', familyGroup: '', phone: '', personalNote: '' });
    const updated = await listGuests(selectedSlug);
    setGuests(updated);
    notify('Personalized guest link created.');
  };

  const handleExportRsvpCsv = () => {
    const header = ['Guest Name', 'Phone', 'Status', 'Guests Count', 'Events', 'Message'];
    const rows = rsvps.map((r) => [
      `"${(r.guestName || '').replace(/"/g, '""')}"`,
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      r.attending,
      String(r.guestsCount),
      `"${(r.eventsAttending || []).join('; ').replace(/"/g, '""')}"`,
      `"${(r.message || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSlug || 'studio'}-rsvps.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBackupJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      studioSettings,
      clients,
      invitations,
      templates,
      uploads,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `capture-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Full JSON backup downloaded.');
  };

  const analytics = useMemo(() => {
    const activeInv = invitations.filter((i) => !i.isArchived);
    return {
      totalClients: clients.filter((c) => c.status === 'active').length,
      totalInvitations: invitations.length,
      published: activeInv.filter((i) => i.status === 'published').length,
      drafts: activeInv.filter((i) => i.status === 'draft').length,
      expired: activeInv.filter((i) => i.status === 'expired').length,
      attendingCount: rsvps
        .filter((r) => r.attending === 'attending')
        .reduce((sum, r) => sum + (r.guestsCount || 0), 0),
    };
  }, [invitations, clients, rsvps]);

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invitations.filter((inv) => {
      if (statusFilter === 'archived' && !inv.isArchived) return false;
      if (statusFilter !== 'all' && statusFilter !== 'archived') {
        if (inv.isArchived || inv.status !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        inv.brideName.toLowerCase().includes(q) ||
        inv.groomName.toLowerCase().includes(q) ||
        inv.slug.toLowerCase().includes(q) ||
        (inv.primaryVenueName || '').toLowerCase().includes(q)
      );
    });
  }, [invitations, searchQuery, statusFilter]);

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.brideName.toLowerCase().includes(q) ||
        c.groomName.toLowerCase().includes(q) ||
        (c.city || '').toLowerCase().includes(q) ||
        (c.primaryContactName || '').toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  // Auth Gate
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-sm text-stone-500">
        Verifying Capture Studio session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#881337] mb-2">Capture Studio</p>
          <h1 className="text-3xl font-display-cormorant font-semibold text-stone-900 mb-2">
            Studio Admin Console
          </h1>
          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            Sign in with your verified Google administrator account to create, publish, and manage client wedding invitations.
          </p>
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {authError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-stone-800 transition-colors"
          >
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full mt-3 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors"
          >
            Return to Public Showcase
          </button>
        </div>
      </div>
    );
  }

  if (!isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8">
          <ShieldAlert className="w-8 h-8 text-amber-700 mb-3" />
          <h1 className="text-2xl font-display-cormorant font-semibold text-stone-900 mb-2">
            Administrator Access Required
          </h1>
          <p className="text-sm text-stone-600 mb-5 leading-relaxed">
            Signed in as <strong>{user.email}</strong>. Private client records, invitations, and RSVPs are restricted to the Capture Studio owner account ({BOOTSTRAP_ADMIN_EMAIL}).
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => signOut(auth)}
              className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-4 py-2 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50"
            >
              Public Showcase
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'invitations', label: 'Invitations', icon: <FolderHeart className="w-4 h-4" /> },
    { id: 'clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
    { id: 'rsvps', label: 'RSVPs & Wishes', icon: <MailCheck className="w-4 h-4" /> },
    { id: 'guests', label: 'Guest Links', icon: <UserPlus className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates', icon: <Palette className="w-4 h-4" /> },
    { id: 'media', label: 'Media & Backup', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'settings', label: 'Studio Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-stone-900 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-stone-200 shrink-0 flex flex-col">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
          <button type="button" onClick={() => onNavigate('/')} className="text-left">
            <span className="text-xl font-display-cormorant font-semibold text-stone-900 block leading-none">
              {studioSettings.businessName}
            </span>
            <span className="text-[11px] text-stone-500 mt-1 block">Studio Management</span>
          </button>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setWizardOpen(false);
                setTab(item.id);
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tab === item.id && !wizardOpen
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="hidden lg:block mt-auto p-4 border-t border-stone-200 space-y-3">
          <div className="text-xs">
            <p className="font-medium text-stone-800 truncate">{user.displayName || 'Studio Owner'}</p>
            <p className="text-stone-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Top Bar */}
        <header className="bg-white border-b border-stone-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-stone-500 flex items-center gap-2">
            <span>Capture Studio</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-stone-900 capitalize">
              {wizardOpen ? 'Invitation Builder' : tab}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {toast && (
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                {toast}
              </span>
            )}
            <button
              type="button"
              onClick={handleOpenNewWizard}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#881337] text-white rounded-lg hover:bg-[#6D0F2C] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Invitation
            </button>
          </div>
        </header>

        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {wizardOpen ? (
            <InvitationWizard
              initialInvitation={editingInv}
              initialEvents={editingEvents}
              initialGallery={editingGallery}
              clients={clients}
              existingSlugs={invitations.map((i) => i.slug)}
              studioSettings={studioSettings}
              onCancel={() => setWizardOpen(false)}
              onSaved={async (savedSlug) => {
                setWizardOpen(false);
                setTab('invitations');
                setSelectedSlug(savedSlug);
                await loadWorkspaceData();
                notify(`Saved /invite/${savedSlug}`);
              }}
            />
          ) : (
            <>
              {/* TAB: OVERVIEW ANALYTICS */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { label: 'Total Clients', val: analytics.totalClients },
                      { label: 'Total Invitations', val: analytics.totalInvitations },
                      { label: 'Published', val: analytics.published },
                      { label: 'Drafts', val: analytics.drafts },
                      { label: 'Expired', val: analytics.expired },
                      { label: 'Confirmed Guests', val: analytics.attendingCount },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white border border-stone-200 rounded-xl p-4">
                        <p className="text-xs text-stone-500">{stat.label}</p>
                        <p className="text-2xl font-semibold font-mono-tabular text-stone-900 mt-1">
                          {stat.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-stone-900">Recent Client Invitations</h2>
                      <button
                        type="button"
                        onClick={() => setTab('invitations')}
                        className="text-xs font-medium text-[#881337] hover:underline"
                      >
                        Manage All
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                          <tr>
                            <th className="py-2.5 px-4 font-medium">Couple</th>
                            <th className="py-2.5 px-4 font-medium">Invitation URL</th>
                            <th className="py-2.5 px-4 font-medium">Wedding Date</th>
                            <th className="py-2.5 px-4 font-medium">Theme</th>
                            <th className="py-2.5 px-4 font-medium">Status</th>
                            <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {invitations.slice(0, 6).map((inv) => (
                            <tr key={inv.slug} className="hover:bg-stone-50/70">
                              <td className="py-3 px-4 font-medium text-stone-900">
                                {inv.groomName} & {inv.brideName}
                              </td>
                              <td className="py-3 px-4 font-mono-tabular text-stone-600">
                                /invite/{inv.slug}
                              </td>
                              <td className="py-3 px-4 font-mono-tabular text-stone-600">
                                {inv.weddingDate}
                              </td>
                              <td className="py-3 px-4 capitalize text-stone-600">{inv.theme}</td>
                              <td className="py-3 px-4 capitalize font-medium text-stone-800">
                                {inv.isArchived ? 'Archived' : inv.status}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleEditInvitation(inv)}
                                  className="text-stone-700 hover:text-stone-900 font-medium"
                                >
                                  Edit
                                </button>
                                <a
                                  href={`/invite/${inv.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#881337] hover:underline font-medium"
                                >
                                  View
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: INVITATIONS */}
              {tab === 'invitations' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-stone-200 rounded-xl p-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by couple name, slug, or venue..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-lg overflow-x-auto">
                      {(['all', 'published', 'draft', 'expired', 'archived'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors whitespace-nowrap ${
                            statusFilter === st ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center text-xs text-stone-500">
                      Loading invitations...
                    </div>
                  ) : filteredInvitations.length === 0 ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center">
                      <p className="text-sm font-medium text-stone-900 mb-1">No invitations match this filter</p>
                      <p className="text-xs text-stone-500 mb-4">Create a bespoke wedding invitation for your next client.</p>
                      <button
                        type="button"
                        onClick={handleOpenNewWizard}
                        className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg"
                      >
                        Create New Invitation
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredInvitations.map((inv) => (
                        <div key={inv.slug} className="bg-white border border-stone-200 rounded-2xl overflow-hidden flex flex-col">
                          <div className="aspect-[16/9] bg-stone-100 relative">
                            <SafeImage
                              src={inv.couplePhotoUrl}
                              alt={`${inv.groomName} & ${inv.brideName}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                                <span className="capitalize">{inv.theme} theme</span>
                                <span className="font-medium text-stone-800 capitalize">
                                  {inv.isArchived ? 'Archived' : inv.status}
                                </span>
                              </div>
                              <h3 className="text-xl font-display-cormorant font-semibold text-stone-900">
                                {inv.groomName} & {inv.brideName}
                              </h3>
                              <p className="text-xs font-mono-tabular text-stone-500 mt-0.5">
                                {studioSettings.websiteDomain || 'invite.capturestudio.in'}/{inv.slug}
                              </p>
                              <p className="text-xs text-stone-500 mt-1">
                                Date: {inv.weddingDate} · {inv.primaryVenueName || 'Venue TBD'}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleEditInvitation(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </button>
                              <a
                                href={`/invite/${inv.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Live
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  setQrTarget({
                                    slug: inv.slug,
                                    title: `${inv.groomName} & ${inv.brideName}`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50"
                              >
                                <QrCode className="w-3 h-3" />
                                QR
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicate(inv)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50"
                                title="Duplicate invitation"
                              >
                                <Copy className="w-3 h-3" />
                                Clone
                              </button>
                              {inv.status !== 'published' ? (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv, { status: 'published', isArchived: false })}
                                  className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
                                >
                                  Publish
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStatusChange(inv, { status: 'expired' })}
                                  className="px-2.5 py-1.5 text-xs font-medium text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-50"
                                >
                                  Expire
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(inv, { isArchived: !inv.isArchived })}
                                className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg"
                                title={inv.isArchived ? 'Restore from archive' : 'Archive'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteInvitation(inv)}
                                className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                                title="Delete invitation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: CLIENTS CRM */}
              {tab === 'clients' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search clients by name or city..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setClientDraft({
                          id: '',
                          brideName: '',
                          groomName: '',
                          primaryContactName: '',
                          phone: '',
                          email: '',
                          city: '',
                          notes: '',
                          status: 'active',
                        });
                        setClientFormOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Client
                    </button>
                  </div>

                  {clientFormOpen && (
                    <form onSubmit={handleSaveClient} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-stone-900">
                        {clientDraft.id ? 'Edit Client Record' : 'New Studio Client'}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          required
                          value={clientDraft.groomName}
                          onChange={(e) => setClientDraft((p) => ({ ...p, groomName: e.target.value }))}
                          placeholder="Groom Name *"
                          className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                        />
                        <input
                          type="text"
                          required
                          value={clientDraft.brideName}
                          onChange={(e) => setClientDraft((p) => ({ ...p, brideName: e.target.value }))}
                          placeholder="Bride Name *"
                          className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                        />
                        <input
                          type="text"
                          value={clientDraft.primaryContactName}
                          onChange={(e) => setClientDraft((p) => ({ ...p, primaryContactName: e.target.value }))}
                          placeholder="Primary Family Contact"
                          className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                        />
                        <input
                          type="tel"
                          value={clientDraft.phone}
                          onChange={(e) => setClientDraft((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="Phone Number"
                          className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                        />
                        <input
                          type="email"
                          value={clientDraft.email}
                          onChange={(e) => setClientDraft((p) => ({ ...p, email: e.target.value }))}
                          placeholder="Email Address"
                          className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                        />
                        <input
                          type="text"
                          value={clientDraft.city}
                          onChange={(e) => setClientDraft((p) => ({ ...p, city: e.target.value }))}
                          placeholder="City (e.g. Rajnandgaon)"
                          className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={clientDraft.notes}
                        onChange={(e) => setClientDraft((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Project notes..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-stone-200"
                      />
                      <div className="flex items-center gap-2">
                        <button type="submit" className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg">
                          Save Client
                        </button>
                        <button
                          type="button"
                          onClick={() => setClientFormOpen(false)}
                          className="px-4 py-2 text-xs border border-stone-200 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                        <tr>
                          <th className="py-3 px-4 font-medium">Couple</th>
                          <th className="py-3 px-4 font-medium">Family Contact</th>
                          <th className="py-3 px-4 font-medium">Phone</th>
                          <th className="py-3 px-4 font-medium">City</th>
                          <th className="py-3 px-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filteredClients.map((c) => (
                          <tr key={c.id} className="hover:bg-stone-50">
                            <td className="py-3 px-4 font-medium text-stone-900">
                              {c.groomName} & {c.brideName}
                            </td>
                            <td className="py-3 px-4 text-stone-600">{c.primaryContactName || '—'}</td>
                            <td className="py-3 px-4 font-mono-tabular text-stone-600">{c.phone || '—'}</td>
                            <td className="py-3 px-4 text-stone-600">{c.city || '—'}</td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setClientDraft({
                                    id: c.id,
                                    brideName: c.brideName,
                                    groomName: c.groomName,
                                    primaryContactName: c.primaryContactName || '',
                                    phone: c.phone || '',
                                    email: c.email || '',
                                    city: c.city || '',
                                    notes: c.notes || '',
                                    status: c.status,
                                  });
                                  setClientFormOpen(true);
                                }}
                                className="text-stone-700 hover:underline font-medium"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteClient(c.id);
                                  await loadWorkspaceData();
                                  notify('Client deleted.');
                                }}
                                className="text-red-600 hover:underline font-medium"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: RSVPs & WISHES */}
              {tab === 'rsvps' && (
                <div className="space-y-5">
                  <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-stone-600">Invitation:</label>
                      <select
                        value={selectedSlug}
                        onChange={(e) => setSelectedSlug(e.target.value)}
                        className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
                      >
                        {invitations.map((i) => (
                          <option key={i.slug} value={i.slug}>
                            {i.groomName} & {i.brideName} (/invite/{i.slug})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportRsvpCsv}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-stone-200 rounded-lg hover:bg-stone-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export RSVPs CSV
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-stone-200 flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Private RSVP Records ({rsvps.length})</h3>
                        <span className="text-xs font-mono-tabular text-stone-500">
                          Confirmed Headcount: {analytics.attendingCount}
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                            <tr>
                              <th className="py-2.5 px-4 font-medium">Guest</th>
                              <th className="py-2.5 px-4 font-medium">Phone</th>
                              <th className="py-2.5 px-4 font-medium">Status</th>
                              <th className="py-2.5 px-4 font-medium">Count</th>
                              <th className="py-2.5 px-4 font-medium">Events</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {rsvps.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-stone-400">
                                  No RSVPs recorded for this invitation yet.
                                </td>
                              </tr>
                            ) : (
                              rsvps.map((r) => (
                                <tr key={r.id}>
                                  <td className="py-3 px-4 font-medium text-stone-900">{r.guestName}</td>
                                  <td className="py-3 px-4 font-mono-tabular text-stone-600">{r.phone || '—'}</td>
                                  <td className="py-3 px-4 capitalize">{r.attending}</td>
                                  <td className="py-3 px-4 font-mono-tabular">{r.guestsCount}</td>
                                  <td className="py-3 px-4 text-stone-600">
                                    {(r.eventsAttending || []).join(', ') || 'All'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
                      <h3 className="text-sm font-semibold">Public Guest Wishes ({wishes.length})</h3>
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
                        {wishes.map((w) => (
                          <div key={w.id} className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <strong className="text-stone-900">{w.guestName}</strong>
                              <button
                                type="button"
                                onClick={async () => {
                                  await deleteWish(selectedSlug, w.id);
                                  setWishes((prev) => prev.filter((item) => item.id !== w.id));
                                }}
                                className="text-stone-400 hover:text-red-600"
                                aria-label="Delete wish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-stone-600">{w.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: GUEST LINKS */}
              {tab === 'guests' && (
                <div className="space-y-5">
                  <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3">
                    <label className="text-xs font-medium text-stone-600">Invitation:</label>
                    <select
                      value={selectedSlug}
                      onChange={(e) => setSelectedSlug(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white"
                    >
                      {invitations.map((i) => (
                        <option key={i.slug} value={i.slug}>
                          {i.groomName} & {i.brideName} (/invite/{i.slug})
                        </option>
                      ))}
                    </select>
                  </div>

                  <form onSubmit={handleAddGuest} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3">
                    <h3 className="text-sm font-semibold">Generate Personalized Guest Invitation Link</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <input
                        type="text"
                        required
                        value={guestDraft.guestName}
                        onChange={(e) => setGuestDraft((p) => ({ ...p, guestName: e.target.value }))}
                        placeholder="Guest / Family Name *"
                        className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                      />
                      <input
                        type="text"
                        value={guestDraft.familyGroup}
                        onChange={(e) => setGuestDraft((p) => ({ ...p, familyGroup: e.target.value }))}
                        placeholder="Group (e.g. Mama Ji Family)"
                        className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                      />
                      <input
                        type="tel"
                        value={guestDraft.phone}
                        onChange={(e) => setGuestDraft((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="WhatsApp Number"
                        className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                      />
                      <input
                        type="text"
                        value={guestDraft.personalNote}
                        onChange={(e) => setGuestDraft((p) => ({ ...p, personalNote: e.target.value }))}
                        placeholder="Personal greeting note"
                        className="px-3 py-2 text-xs rounded-lg border border-stone-200"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg">
                      Create Personalized Link
                    </button>
                  </form>

                  <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 text-stone-500 border-b border-stone-200">
                        <tr>
                          <th className="py-2.5 px-4 font-medium">Guest Name</th>
                          <th className="py-2.5 px-4 font-medium">Group</th>
                          <th className="py-2.5 px-4 font-medium">Personalized URL</th>
                          <th className="py-2.5 px-4 font-medium text-right">Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {guests.map((g) => {
                          const link = `${window.location.origin}/invite/${selectedSlug}?g=${g.inviteCode}`;
                          return (
                            <tr key={g.id}>
                              <td className="py-3 px-4 font-medium text-stone-900">{g.guestName}</td>
                              <td className="py-3 px-4 text-stone-600">{g.familyGroup || '—'}</td>
                              <td className="py-3 px-4 font-mono-tabular text-stone-600 truncate max-w-xs">{link}</td>
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(link);
                                    notify(`Copied link for ${g.guestName}`);
                                  }}
                                  className="text-stone-700 hover:underline font-medium"
                                >
                                  Copy
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setQrTarget({
                                      slug: selectedSlug,
                                      title: `Invitation for ${g.guestName}`,
                                      guestName: g.guestName,
                                      passCode: g.inviteCode,
                                    })
                                  }
                                  className="text-stone-700 hover:underline font-medium"
                                >
                                  QR
                                </button>
                                <a
                                  href={`https://wa.me/${(g.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                                    `Namaste ${g.guestName}, you are warmly invited to our wedding celebration. Open your personal invitation: ${link}`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:underline font-medium"
                                >
                                  <Send className="w-3 h-3 inline mr-0.5" />
                                  WhatsApp
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await deleteGuest(selectedSlug, g.id, g.inviteCode);
                                    setGuests((prev) => prev.filter((item) => item.id !== g.id));
                                  }}
                                  className="text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: TEMPLATES */}
              {tab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-stone-400">
                            {tpl.themeKey} preset
                          </span>
                          <h3 className="text-xl font-display-cormorant font-semibold text-stone-900">
                            {tpl.name}
                          </h3>
                          <p className="text-xs text-stone-500 mt-1">{tpl.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await saveTemplate({ ...tpl, isActive: !tpl.isActive });
                            await loadWorkspaceData();
                            notify(`Updated template ${tpl.name}`);
                          }}
                          className={`px-3 py-1 text-xs font-medium rounded-lg border ${
                            tpl.isActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-stone-50 border-stone-200 text-stone-500'
                          }`}
                        >
                          {tpl.isActive ? 'Active' : 'Hidden'}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <SafeImage
                          src={tpl.previewImageUrl || THEME_DEFINITIONS[tpl.themeKey]?.colors.background}
                          alt={tpl.name}
                          className="w-24 h-16 rounded-lg object-cover border border-stone-200"
                        />
                        <div className="flex items-center gap-2">
                          {[tpl.primaryColor, tpl.secondaryColor, tpl.accentColor, tpl.backgroundColor].map(
                            (c, i) => (
                              <span
                                key={i}
                                className="w-6 h-6 rounded-full border border-stone-200"
                                style={{ backgroundColor: c }}
                                title={c}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: MEDIA GALLERY & BACKUPS */}
              {tab === 'media' && (
                <div className="space-y-5">
                  <div className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-stone-900">Studio Media Library & Backups</h3>
                      <p className="text-xs text-stone-500">
                        Upload verified client photography and download full JSON studio backups.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-lg cursor-pointer hover:bg-stone-800">
                        <Plus className="w-3.5 h-3.5" />
                        Upload Image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            await uploadStudioImage(f);
                            await loadWorkspaceData();
                            notify('Photo uploaded to studio media library.');
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleExportBackupJson}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-stone-200 rounded-lg hover:bg-stone-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download JSON Backup
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Object.entries(CURATED_STUDIO_IMAGES).map(([key, url]) => (
                      <div key={key} className="bg-white border border-stone-200 rounded-xl p-2 space-y-2">
                        <div className="aspect-square rounded-lg overflow-hidden">
                          <SafeImage src={url} alt={key} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                          <span className="truncate">{key}</span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(url);
                              notify('Copied asset URL');
                            }}
                            className="text-stone-800 font-medium hover:underline"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    ))}
                    {uploads.map((file) => (
                      <div key={file.filename} className="bg-white border border-stone-200 rounded-xl p-2 space-y-2">
                        <div className="aspect-square rounded-lg overflow-hidden">
                          <SafeImage src={file.url} alt={file.filename} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
                          <span className="truncate">{file.filename}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard.writeText(file.url);
                                notify('Copied upload URL');
                              }}
                              className="text-stone-800 font-medium hover:underline"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteStudioUpload(file.filename);
                                await loadWorkspaceData();
                                notify('Deleted media file.');
                              }}
                              className="text-red-600"
                              aria-label="Delete uploaded file"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: STUDIO SETTINGS */}
              {tab === 'settings' && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveStudioSettings({
                      businessName: studioSettings.businessName,
                      tagline: studioSettings.tagline,
                      address: studioSettings.address,
                      phonePrimary: studioSettings.phonePrimary,
                      phoneSecondary: studioSettings.phoneSecondary,
                      whatsappNumber: studioSettings.whatsappNumber,
                      email: studioSettings.email,
                      websiteDomain: studioSettings.websiteDomain,
                      logoUrl: studioSettings.logoUrl,
                      defaultLanguage: studioSettings.defaultLanguage,
                    });
                    notify('Studio branding & contact settings saved.');
                  }}
                  className="bg-white border border-stone-200 rounded-2xl p-6 max-w-3xl space-y-5"
                >
                  <div>
                    <h3 className="text-lg font-display-cormorant font-semibold text-stone-900">
                      Capture Studio Branding & Address
                    </h3>
                    <p className="text-xs text-stone-500">
                      Displayed in the footer of every published client wedding invitation.
                    </p>
                  </div>

                  <PhotoUploadInput
                    label="Studio Logo"
                    value={studioSettings.logoUrl || ''}
                    onChange={(url) => setStudioSettings((p) => ({ ...p, logoUrl: url }))}
                    aspectHint="PNG or WebP"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Business Name</label>
                      <input
                        type="text"
                        required
                        value={studioSettings.businessName}
                        onChange={(e) => setStudioSettings((p) => ({ ...p, businessName: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Primary Domain</label>
                      <input
                        type="text"
                        value={studioSettings.websiteDomain || ''}
                        onChange={(e) => setStudioSettings((p) => ({ ...p, websiteDomain: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200 font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Studio Address</label>
                    <input
                      type="text"
                      required
                      value={studioSettings.address}
                      onChange={(e) => setStudioSettings((p) => ({ ...p, address: e.target.value }))}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Primary Phone</label>
                      <input
                        type="text"
                        value={studioSettings.phonePrimary || ''}
                        onChange={(e) => setStudioSettings((p) => ({ ...p, phonePrimary: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">WhatsApp Number</label>
                      <input
                        type="text"
                        value={studioSettings.whatsappNumber || ''}
                        onChange={(e) => setStudioSettings((p) => ({ ...p, whatsappNumber: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">Studio Email</label>
                      <input
                        type="email"
                        value={studioSettings.email || ''}
                        onChange={(e) => setStudioSettings((p) => ({ ...p, email: e.target.value }))}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-200"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Save Studio Settings
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {qrTarget && (
        <QrCodeModal
          isOpen={Boolean(qrTarget)}
          onClose={() => setQrTarget(null)}
          slug={qrTarget.slug}
          coupleTitle={qrTarget.title}
          customDomain={studioSettings.websiteDomain}
          guestName={qrTarget.guestName}
          passCode={qrTarget.passCode}
        />
      )}
    </div>
  );
};
