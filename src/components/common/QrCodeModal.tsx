import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, X } from 'lucide-react';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  coupleTitle: string;
  customDomain?: string;
  guestName?: string;
  passCode?: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  slug,
  coupleTitle,
  customDomain = 'invite.capturestudio.in',
  guestName,
  passCode,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const querySuffix = passCode
    ? `?g=${encodeURIComponent(passCode)}`
    : guestName
      ? `?guest=${encodeURIComponent(guestName)}`
      : '';

  const liveUrl = `${window.location.origin}/invite/${slug}${querySuffix}`;
  const brandedUrl = `https://${customDomain}/${slug}${querySuffix}`;

  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(liveUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: '#1C1917',
        light: '#FFFDFC',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation failed:', err));
  }, [isOpen, liveUrl]);

  if (!isOpen) return null;

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${slug}-wedding-qr.png`;
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Invitation QR Code"
    >
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <p className="text-xs uppercase tracking-widest text-stone-500">Invitation Share Pass</p>
            <h3 className="text-xl font-display-cormorant font-semibold text-stone-900 mt-0.5">
              {coupleTitle}
            </h3>
            {guestName && (
              <p className="text-xs text-amber-800 mt-1">Personalized for: {guestName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            aria-label="Close QR dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-6 flex flex-col items-center">
          <div className="p-4 bg-[#FFFDFC] border border-stone-200 rounded-xl">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code for ${coupleTitle}`} className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-xs text-stone-400">
                Generating QR...
              </div>
            )}
          </div>
          <p className="text-xs font-mono-tabular text-stone-600 mt-3 text-center break-all">
            {brandedUrl}
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(liveUrl)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors whitespace-nowrap"
            >
              {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedUrl ? 'Copied Live URL' : 'Copy Live Link'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-stone-200 text-stone-800 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              PNG
            </button>
          </div>
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200/80 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Public Invitation
          </a>
        </div>
      </div>
    </div>
  );
};
