import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Link2, Loader2, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { adminApi, type SlugRedirect } from '@/lib/admin/api';
import { useDebounce } from '@/hooks/useDebounce';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMPTY_FORM = { alias: '', canonical: '', provider: '', providerId: '' };

export function SlugRedirectsTab() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SlugRedirect[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingAlias, setEditingAlias] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.slugRedirects({ q: debounced, page, perPage });
    if (result.ok && result.data) {
      setRows(result.data.redirects);
      setTotal(result.data.total);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingAlias(null);
  };

  const handleSave = async () => {
    const alias = form.alias.trim().toLowerCase();
    const canonical = form.canonical.trim().toLowerCase();
    setError(null);
    setNotice(null);

    if (!SLUG_PATTERN.test(alias) || !SLUG_PATTERN.test(canonical)) {
      setError('Slugs may only contain lowercase letters, numbers and single hyphens.');
      return;
    }
    if (alias === canonical) {
      setError('An alias cannot point at itself.');
      return;
    }

    setSaving(true);
    const result = await adminApi.saveSlugRedirect({
      aliasSlug: alias,
      canonicalSlug: canonical,
      provider: form.provider.trim() || undefined,
      providerId: form.providerId.trim() || undefined,
    });
    setSaving(false);

    if (result.ok) {
      setNotice(`Saved ${alias} → ${canonical}.`);
      resetForm();
      load();
    } else {
      setError(result.error);
    }
  };

  const handleEdit = (row: SlugRedirect) => {
    setEditingAlias(row.alias_slug);
    setForm({
      alias: row.alias_slug,
      canonical: row.canonical_slug,
      provider: row.provider ?? '',
      providerId: row.provider_id ?? '',
    });
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (row: SlugRedirect) => {
    if (!window.confirm(`Delete the redirect from "${row.alias_slug}" to "${row.canonical_slug}"?`)) return;
    const result = await adminApi.deleteSlugRedirect(row.alias_slug);
    if (result.ok) {
      if (editingAlias === row.alias_slug) resetForm();
      setNotice(`Deleted ${row.alias_slug}.`);
      load();
    } else {
      setError(result.error);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const editing = Boolean(editingAlias);

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Link2 className="h-4 w-4 text-rose-400" />
          {editing ? 'Correct a slug redirect' : 'Add a slug redirect'}
        </h2>
        <p className="mb-4 text-xs text-ink-400">
          Old URLs and canonical URLs are lowercase slugs. Every page follows these mappings, so correcting one here
          changes the destination on every device. Mappings cannot point at themselves or form a loop.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-micro text-ink-400">Old slug (alias)</label>
            <input
              value={form.alias}
              onChange={(event) => setForm((prev) => ({ ...prev, alias: event.target.value }))}
              placeholder="old-title-slug"
              disabled={editing}
              className="input-field py-2 font-mono text-xs disabled:opacity-60"
            />
          </div>
          <div>
            <label className="mb-1 block text-micro text-ink-400">Canonical slug</label>
            <input
              value={form.canonical}
              onChange={(event) => setForm((prev) => ({ ...prev, canonical: event.target.value }))}
              placeholder="current-title-slug"
              className="input-field py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-micro text-ink-400">Provider (optional)</label>
            <input
              value={form.provider}
              onChange={(event) => setForm((prev) => ({ ...prev, provider: event.target.value }))}
              placeholder="ANILIST"
              className="input-field py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-micro text-ink-400">Provider id (optional)</label>
            <input
              value={form.providerId}
              onChange={(event) => setForm((prev) => ({ ...prev, providerId: event.target.value }))}
              placeholder="113813"
              className="input-field py-2 font-mono text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="btn-primary py-2 text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {editing ? 'Save changes' : 'Add redirect'}
          </button>
          {editing && (
            <button onClick={resetForm} className="btn-ghost py-2 text-xs">
              <X className="h-3.5 w-3.5" /> Cancel edit
            </button>
          )}
          <span className="text-micro text-ink-400">Alias is the key, so rename by deleting and adding a new mapping.</span>
        </div>

        {notice && <p className="mt-3 text-xs text-success-400">{notice}</p>}
        {error && (
          <p className="mt-3 rounded-lg border border-error-500/30 bg-error-500/5 p-2 text-xs text-error-300">{error}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search aliases or canonical slugs…"
            className="input-field py-2 pl-9 text-xs"
          />
        </div>
        <span className="text-xs text-ink-400">{total} mappings</span>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-800 bg-ink-850/60 text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Alias</th>
                <th className="px-4 py-2.5 font-medium">Canonical</th>
                <th className="px-4 py-2.5 font-medium">Provider ref</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading redirects…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    No slug redirects match this search.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.alias_slug} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/40">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-micro text-ink-400">{row.alias_slug}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-micro text-ink-200">
                        <ArrowRight className="h-3 w-3 text-ink-400" />
                        {row.canonical_slug}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {row.provider ? (
                        <div className="flex flex-col">
                          <span className="text-micro font-medium text-ink-300">{row.provider}</span>
                          <span className="font-mono text-micro text-ink-400">{row.provider_id || 'no id'}</span>
                        </div>
                      ) : (
                        <span className="text-micro text-ink-400">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-micro text-ink-400">
                      {row.updated_at ? new Date(row.updated_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(row)}
                          title="Edit mapping"
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          title="Delete mapping"
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Page {page} of {lastPage}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
            disabled={page >= lastPage || loading}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
