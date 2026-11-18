# Capture Studio Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All unspecified Firestore paths are denied read and write access.
2. **Admin-Only Private Collections**: `/clients`, `/admins`, `/invitations/{id}/guests`, and `/invitations/{id}/rsvps` (read/list/update/delete) are strictly restricted to verified studio administrators.
3. **Draft & Archive Protection**: Public visitors can only `get` an invitation at `/invitations/{slug}` if `status == 'published'` and `isArchived == false`. Public visitors cannot `list` all invitations.
4. **Master Gate on Subcollections**: Public `create` on `/rsvps` and `/wishes` verifies via `get()` on the parent `/invitations/{invitationId}` that the invitation exists, is `'published'`, and is not archived.
5. **PII Isolation**: Public guest wishes (`/wishes`) never store `phone` or `email`. Private RSVPs (`/rsvps`) are write-once by public guests and readable only by admins. Personalized links use `/guestPasses` without phone/email.
6. **Temporal Integrity**: Creation and update timestamps (`createdAt`, `updatedAt`) are enforced to equal `request.time`.
7. **Strict Key & Size Boundaries**: Every write validates `keys().hasAll(...)` and `keys().hasOnly(...)` along with explicit `.size()` bounds on all strings and lists.

## 2. Dirty Dozen Adversarial Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Admin Creation**: Unauthenticated user attempts `create` on `/admins/hacker`.
2. **Self-Role Escalation**: Authenticated non-admin user attempts `create` on `/admins/{uid}` with `role: 'owner'`.
3. **Client PII Scraping**: Public or non-admin user attempts `list` or `get` on `/clients/{clientId}`.
4. **RSVP PII Scraping**: Public visitor attempts `list` or `get` on `/invitations/amit-gauri/rsvps`.
5. **Private Guest List Scraping**: Public visitor attempts `list` on `/invitations/amit-gauri/guests`.
6. **Draft Invitation Leak**: Public visitor attempts `get` on `/invitations/draft-couple` where `status == 'draft'`.
7. **Invitation Catalog Scraping**: Public visitor attempts `list` on `/invitations`.
8. **Shadow Field Injection on RSVP**: Public visitor submits RSVP with extra ghost field `isAdmin: true`.
9. **RSVP Status Tampering**: Public visitor attempts `update` or `delete` on an existing `/rsvps/{rsvpId}` document.
10. **Orphaned RSVP Creation**: Public visitor attempts `create` on `/invitations/nonexistent/rsvps/rsvp1`.
11. **Oversized String Poisoning (Denial of Wallet)**: Public visitor attempts `create` on `/wishes` with a 50,000-character `message`.
12. **Client-Spoofed Timestamp**: Public visitor submits `/rsvps` with `createdAt` set to a past timestamp instead of `request.time`.
