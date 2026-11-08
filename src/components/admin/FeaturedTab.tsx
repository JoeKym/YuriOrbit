import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { adminApi, type FeaturedTitle } from '@/lib/admin/api';
import { getTitleById, searchGLTitles } from '@/lib/providers';
import { extractTitleId } from '@/lib/catalog/identity';
import { getFallbackCover } from '@/lib/utils/format';

export function FeaturedTab() {
  const [items, setItems] = useState<FeaturedTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [titleId, setTitleId] = useState('');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
    coverImage?: string;
    contentType: string;
  } | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.featured();
    if (result.ok && result.data) setItems(result.data.featured);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLookup = async () => {
    const id = extractTitleId(titleId);
    if (!id) return;

    setLooking(true);
    setMessage(null);

    let found = await getTitleById(id);

    // Not a known id? Treat the input as a title and take the best match.
    if (!found) {
      const result = await searchGLTitles({ query: id.replace(/[-_]+/g, ' ') }, 1, 6);
      found = result.items[0] ?? null;
    }

    setLooking(false);

    if (found) {
      setPreview({
        id: found.id,
        title: found.title,
        coverImage: found.coverImage,
        contentType: found.contentType,
      });
    } else {
      setPreview(null);
      setMessage('Could not resolve that title. Paste a YuriOrbit link, or type the title name.');
    }
  };

  const handleAdd = async () => {
    if (!preview) {
      setMessage('Look up a title first.');
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await adminApi.addFeatured({
      titleId: preview.id,
      title: preview.title,
      coverImage: preview.coverImage,
      note: note.trim() || undefined,
      contentType: preview.contentType,
    });
    setSaving(false);
    if (result.ok) {
      setTitleId('');
      setNote('');
      setPreview(null);
      setMessage('Added to Editor\u2019s Picks.');
      load();
    } else {
      setMessage(result.error);
    }
  };

  const handleRemove = async (item: FeaturedTitle) => {
    if (!window.confirm(`Remove "${item.title}" from Editor\u2019s Picks?`)) return;
    const result = await adminApi.removeFeatured(item.id);
    if (result.ok) load();
    else window.alert(result.error);
  };

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Sparkles className="h-4 w-4 text-rose-400" /> Pin a title to the homepage
        </h2>
        <p className="mb-4 text-xs text-ink-400">
          Picks appear in an Editor&rsquo;s Picks rail on the home page. Paste a YuriOrbit title link or id, for example{' '}
          <code className="rounded bg-ink-850 px-1.5 py-0.5 text-ink-200">/title/yuri-on-ice</code> — or just type the
          title name.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] text-ink-400">Title id</label>
            <input
              value={titleId}
              onChange={(e) => {
                setTitleId(e.target.value);
                setPreview(null);
              }}
              placeholder="/title/yuri-on-ice"
              className="input-field py-2 text-xs"
            />
          </div>
          <button onClick={handleLookup} disabled={looking || !titleId.trim()} className="btn-secondary py-2 text-xs">
            {looking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Look up
          </button>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] text-ink-400">Editor&rsquo;s note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why we love it"
              className="input-field py-2 text-xs"
            />
          </div>
          <button onClick={handleAdd} disabled={saving || !preview} className="btn-primary py-2 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {preview && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-ink-800 bg-ink-850 p-3">
            <img
              src={preview.coverImage || getFallbackCover(preview.title)}
              alt=""
              className="h-16 w-11 rounded object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-100">{preview.title}</p>
              <p className="text-[11px] text-ink-400">{preview.contentType}</p>
            </div>
          </div>
        )}

        {message && <p className="mt-3 text-xs text-ink-300">{message}</p>}
      </div>

      {error && (
        <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>
      )}

      <div className="card-surface overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-xs text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading picks…
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-xs text-ink-400">Nothing pinned yet. The home page rail stays hidden until you add a title.</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 p-3">
                <span className="w-5 text-center text-[11px] text-ink-500">{item.position}</span>
                <img
                  src={item.cover_image || getFallbackCover(item.title)}
                  alt=""
                  className="h-14 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-100">{item.title}</p>
                  <p className="truncate text-[11px] text-ink-500">
                    {item.title_id}
                    {item.note ? ` · ${item.note}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(item)}
                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
