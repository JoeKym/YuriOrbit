import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';

type MediaType = 'movie' | 'tv';

interface OverrideItem {
  title?: string;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

type OverrideMap = Record<string, OverrideItem>;

const SETTINGS_KEY = 'gl_overrides';

export function GLOverridesTab() {
  const [items, setItems] = useState<OverrideMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('movie');
  const [tmdbId, setTmdbId] = useState('');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.settings();
    if (result.ok && result.data) {
      const row = result.data.settings.find((setting) => setting.key === SETTINGS_KEY);
      setItems(row?.value && typeof row.value === 'object' ? (row.value as OverrideMap) : {});
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveAll = async (next: OverrideMap) => {
    setSaving(true);
    setError(null);
    const result = await adminApi.saveSetting(SETTINGS_KEY, next);
    setSaving(false);
    if (result.ok) setItems(next);
    else setError(result.error);
  };

  const handleSave = async () => {
    const id = tmdbId.trim();
    setNotice(null);
    setError(null);
    if (!/^[0-9]+$/.test(id)) {
      setError('TMDB id must be numeric (for example 290098).');
      return;
    }

    const key = `${mediaType}:${id}`;
    const next: OverrideMap = {
      ...items,
      [key]: {
        title: title.trim() || items[key]?.title,
        note: note.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
    };
    await saveAll(next);
    setNotice(`Saved GL override for ${key}.`);
    setTmdbId('');
    setTitle('');
    setNote('');
  };

  const handleDelete = async (key: string) => {
    if (!window.confirm(`Remove the GL override for ${key}?`)) return;
    const next = { ...items };
    delete next[key];
    await saveAll(next);
    setNotice(`Removed ${key}.`);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(items)
      .sort((a, b) => (b[1].updatedAt || '').localeCompare(a[1].updatedAt || ''))
      .filter(([key, item]) => !q || `${key} ${item.title || ''} ${item.note || ''}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-100">
          <BadgeCheck className="h-4 w-4 text-rose-400" /> GL overrides for TMDB
        </h2>
        <p className="mb-4 text-xs text-ink-400">
          Search confirms ambiguous TMDB matches with keywords, so a real GL title with incomplete keywords can be
          hidden. Add its numeric TMDB id here to treat it as confirmed GL-related in TMDB search, discovery,
          creator credits and direct lookups. Changes reach visitors after the override cache refreshes (about 15
          seconds) or on reload.
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">
            {error}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Media type</label>
            <select
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as MediaType)}
              className="input-field text-xs"
            >
              <option value="movie">Movie</option>
              <option value="tv">TV / drama</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">TMDB id</label>
            <input
              value={tmdbId}
              onChange={(event) => setTmdbId(event.target.value)}
              placeholder="290098"
              className="input-field font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Title (optional)</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="The Handmaiden"
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Note (optional)</label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Why this is GL"
              className="input-field text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Save override
          </button>
          {notice && <span className="text-xs text-success-400">{notice}</span>}
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 p-4">
          <h3 className="text-sm font-semibold text-ink-100">Active overrides</h3>
          <div className="relative ml-auto min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter overrides…"
              className="input-field py-2 pl-9 text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-6 text-xs text-ink-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading overrides…
          </div>
        ) : list.length === 0 ? (
          <p className="p-6 text-xs text-ink-400">No GL overrides yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-800 bg-ink-850/60 text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">TMDB ref</th>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Note</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5 text-right font-medium" />
                </tr>
              </thead>
              <tbody>
                {list.map(([key, item]) => (
                  <tr key={key} className="border-b border-ink-800/60 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-ink-300">{key}</td>
                    <td className="px-4 py-2.5 text-ink-200">{item.title || '—'}</td>
                    <td className="max-w-[260px] truncate px-4 py-2.5 text-ink-400" title={item.note}>
                      {item.note || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[11px] text-ink-500">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(key)}
                        disabled={saving}
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400 disabled:opacity-40"
                        title="Remove override"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900/50 p-4 text-[11px] text-ink-400">
        Overrides only apply to TMDB records and are checked before keyword confirmation. Use this for genuine GL
        titles with missing keywords, not to admit unrelated titles; content moderation remains the tool for hiding
        unwanted entries.
      </div>
    </div>
  );
}
