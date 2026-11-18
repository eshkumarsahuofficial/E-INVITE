import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { CURATED_STUDIO_IMAGES } from '../../data/presets';
import { uploadStudioImage } from '../../lib/firestoreService';
import { SafeImage } from '../common/SafeImage';

interface PhotoUploadInputProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspectHint?: string;
}

export const PhotoUploadInput: React.FC<PhotoUploadInputProps> = ({
  label,
  value,
  onChange,
  aspectHint,
}) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const res = await uploadStudioImage(file);
      onChange(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone-700">{label}</label>
        {aspectHint && <span className="text-[11px] text-stone-400">{aspectHint}</span>}
      </div>

      <div className="flex items-start gap-3">
        <div className="w-20 h-20 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 shrink-0">
          <SafeImage src={value} alt={label} fallbackLabel="No photo" className="w-full h-full object-cover" />
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>

            <button
              type="button"
              onClick={() => setShowPresets((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors whitespace-nowrap"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              Studio Assets
            </button>

            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition-colors"
                aria-label={`Clear ${label}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste photo URL (/uploads/... or https://...)"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-400"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {showPresets && (
        <div className="p-2.5 rounded-xl border border-stone-200 bg-stone-50 grid grid-cols-5 gap-2">
          {Object.entries(CURATED_STUDIO_IMAGES).map(([key, url]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(url);
                setShowPresets(false);
              }}
              className="aspect-square rounded-lg overflow-hidden border border-stone-200 hover:border-stone-900 transition-colors"
              title={`Use ${key}`}
            >
              <SafeImage src={url} alt={key} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
