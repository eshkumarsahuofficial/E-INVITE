import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');
const ALLOWED_ADMIN_EMAIL = 'ESH20162@gmail.com';

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface VerifiedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json()) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    };
    const user = data.users?.[0];
    if (!user?.localId || !user?.email || !user.emailVerified) return null;
    return {
      uid: user.localId,
      email: user.email,
      emailVerified: Boolean(user.emailVerified),
    };
  } catch (err) {
    console.error('Token lookup failed:', err);
    return null;
  }
}

interface AuthedRequest extends Request {
  authUser?: VerifiedUser;
}

async function requireStudioAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Invalid or unverified token' });
    return;
  }
  // Verify either bootstrap admin or admin doc in Firestore
  if (user.email !== ALLOWED_ADMIN_EMAIL) {
    try {
      const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
      const adminDocResp = await fetch(
        `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/admins/${encodeURIComponent(user.uid)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!adminDocResp.ok) {
        res.status(403).json({ error: 'Forbidden: Studio admin privileges required' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Forbidden: Admin verification failed' });
      return;
    }
  }
  req.authUser = user;
  next();
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

interface FirestoreFieldValue {
  stringValue?: string;
  booleanValue?: boolean;
}

async function fetchPublicInvitationMeta(slug: string): Promise<{
  title: string;
  description: string;
  image: string;
} | null> {
  if (!/^[a-z0-9-]+$/.test(slug) || slug === 'admin' || slug === 'api' || slug === 'uploads') {
    return null;
  }
  try {
    const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${dbId}/documents/invitations/${encodeURIComponent(slug)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const doc = (await resp.json()) as {
      fields?: Record<string, FirestoreFieldValue>;
    };
    const fields = doc.fields;
    if (!fields) return null;
    const status = fields.status?.stringValue;
    const isArchived = fields.isArchived?.booleanValue;
    if (status !== 'published' || isArchived) return null;

    const bride = fields.brideName?.stringValue || 'Bride';
    const groom = fields.groomName?.stringValue || 'Groom';
    const weddingDate = fields.weddingDate?.stringValue || '';
    const venue = fields.primaryVenueName?.stringValue || 'Wedding Celebration';
    const image =
      fields.couplePhotoUrl?.stringValue ||
      '/src/assets/images/couple_amit_gauri_1794986674257.jpg';

    return {
      title: `${bride} & ${groom} — Wedding Invitation | Capture Studio`,
      description: `You are cordially invited to the wedding celebration of ${bride} & ${groom}${weddingDate ? ` on ${weddingDate}` : ''} at ${venue}. Crafted by Capture Studio.`,
      image,
    };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Serve uploaded media securely with cache headers
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '7d',
      fallthrough: false,
    })
  );

  // Error handler for missing uploads
  app.use('/uploads', (_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    res.status(404).json({ error: 'Media asset not found' });
  });

  // Secure image upload endpoint (Base64 image payload, verified Firebase admin token)
  app.post('/api/uploads', requireStudioAdmin, (req: AuthedRequest, res: Response) => {
    try {
      const { filename, mimeType, dataBase64 } = req.body as {
        filename?: string;
        mimeType?: string;
        dataBase64?: string;
      };

      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };

      if (!mimeType || !mimeToExt[mimeType]) {
        res.status(400).json({ error: 'Unsupported file type. Upload JPG, PNG, or WebP images.' });
        return;
      }

      if (!dataBase64 || typeof dataBase64 !== 'string') {
        res.status(400).json({ error: 'Missing image data payload.' });
        return;
      }

      const rawBase64 = dataBase64.includes(',') ? dataBase64.split(',')[1] : dataBase64;
      const buffer = Buffer.from(rawBase64, 'base64');

      if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
        res.status(400).json({ error: 'Image size must be between 1 byte and 5 MB.' });
        return;
      }

      const safeBase = (filename || 'studio-photo')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 32)
        .replace(/^-|-$/g, '') || 'photo';

      const ext = mimeToExt[mimeType];
      const finalName = `${safeBase}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const targetPath = path.join(UPLOADS_DIR, finalName);

      fs.writeFileSync(targetPath, buffer);

      res.status(201).json({
        filename: finalName,
        url: `/uploads/${finalName}`,
        sizeBytes: buffer.length,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to store uploaded photo.' });
    }
  });

  // List uploaded studio media
  app.get('/api/uploads', requireStudioAdmin, (_req: AuthedRequest, res: Response) => {
    try {
      const files = fs
        .readdirSync(UPLOADS_DIR)
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .map((f) => {
          const stat = fs.statSync(path.join(UPLOADS_DIR, f));
          return {
            filename: f,
            url: `/uploads/${f}`,
            sizeBytes: stat.size,
            uploadedAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
      res.json({ files });
    } catch (err) {
      console.error('List uploads error:', err);
      res.status(500).json({ error: 'Failed to list studio media.' });
    }
  });

  // Delete an uploaded studio photo
  app.delete('/api/uploads/:filename', requireStudioAdmin, (req: AuthedRequest, res: Response) => {
    const rawName = String(req.params.filename || '');
    const cleanName = path.basename(rawName);
    if (!/^[a-z0-9._-]+$/i.test(cleanName)) {
      res.status(400).json({ error: 'Invalid filename.' });
      return;
    }
    const targetPath = path.join(UPLOADS_DIR, cleanName);
    if (!fs.existsSync(targetPath)) {
      res.status(404).json({ error: 'File not found.' });
      return;
    }
    fs.unlinkSync(targetPath);
    res.json({ deleted: cleanName });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);

        const cleanPath = url.split('?')[0].replace(/^\/+|\/+$/g, '');
        const inviteMatch = cleanPath.match(/^(?:invite\/)?([a-z0-9-]+)$/);
        if (inviteMatch && inviteMatch[1] && inviteMatch[1] !== 'admin') {
          const meta = await fetchPublicInvitationMeta(inviteMatch[1]);
          if (meta) {
            template = template
              .replace(/<title>.*?<\/title>/, `<title>${escapeHtmlAttr(meta.title)}</title>`)
              .replace(
                /<meta property="og:title" content=".*?" \/>/,
                `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
              )
              .replace(
                /<meta property="og:description" content=".*?" \/>/,
                `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
              )
              .replace(
                /<meta property="og:image" content=".*?" \/>/,
                `<meta property="og:image" content="${escapeHtmlAttr(meta.image)}" />`
              );
          }
        }

        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));

    app.get('*', async (req: Request, res: Response) => {
      let template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
      const cleanPath = req.originalUrl.split('?')[0].replace(/^\/+|\/+$/g, '');
      const inviteMatch = cleanPath.match(/^(?:invite\/)?([a-z0-9-]+)$/);
      if (inviteMatch && inviteMatch[1] && inviteMatch[1] !== 'admin') {
        const meta = await fetchPublicInvitationMeta(inviteMatch[1]);
        if (meta) {
          template = template
            .replace(/<title>.*?<\/title>/, `<title>${escapeHtmlAttr(meta.title)}</title>`)
            .replace(
              /<meta property="og:title" content=".*?" \/>/,
              `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
            )
            .replace(
              /<meta property="og:description" content=".*?" \/>/,
              `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
            )
            .replace(
              /<meta property="og:image" content=".*?" \/>/,
              `<meta property="og:image" content="${escapeHtmlAttr(meta.image)}" />`
            );
        }
      }
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Capture Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Capture Studio server:', err);
  process.exit(1);
});
