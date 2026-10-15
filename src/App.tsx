import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Navbar } from '@/components/navigation/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HomePage } from '@/pages/HomePage';
import { DiscoverPage } from '@/pages/DiscoverPage';
import { CategoryPage } from '@/pages/CategoryPage';
import { TrendingPage } from '@/pages/TrendingPage';
import { GenresPage } from '@/pages/GenresPage';
import { SearchPage } from '@/pages/SearchPage';
import { TitleDetailPage } from '@/pages/TitleDetailPage';
import { ReaderPage } from '@/pages/ReaderPage';
import { WatchPage } from '@/pages/WatchPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AboutPage } from '@/pages/AboutPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AdminPage } from '@/pages/AdminPage';

import { KindeProvider } from '@kinde-oss/kinde-auth-react';

const clean = (val?: string) => (!val || val.trim() === '' || val.trim().toLowerCase() === 'value' ? undefined : val.trim());

const KINDE_CLIENT_ID = clean(import.meta.env.VITE_KINDE_CLIENT_ID) || '488dc9038b0d4282977f5e6e7b3b3d0b';
const KINDE_DOMAIN = clean(import.meta.env.VITE_KINDE_DOMAIN) || 'https://yuriorbit.kinde.com';
const REDIRECT_URI = clean(import.meta.env.VITE_KINDE_REDIRECT_URI) || (typeof window !== 'undefined' ? window.location.origin : '');
const LOGOUT_URI = clean(import.meta.env.VITE_KINDE_LOGOUT_URI) || (typeof window !== 'undefined' ? window.location.origin : '');

export default function App() {
  return (
    <KindeProvider
      clientId={KINDE_CLIENT_ID}
      domain={KINDE_DOMAIN}
      redirectUri={REDIRECT_URI}
      logoutUri={LOGOUT_URI}
    >
      <BrowserRouter>
        <ScrollToTop />
        <div className="flex min-h-screen flex-col bg-ink-950">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/manga" element={<CategoryPage contentType="MANGA" title="GL Manga" />} />
            <Route path="/manhwa" element={<CategoryPage contentType="MANHWA" title="GL Manhwa" />} />
            <Route path="/manhua" element={<CategoryPage contentType="MANHUA" title="GL Manhua" />} />
            <Route path="/webtoons" element={<CategoryPage contentType="WEBTOON" title="GL Webtoons" />} />
            <Route path="/novels" element={<CategoryPage contentType="LIGHT_NOVEL" title="GL Novels" />} />
            <Route path="/movies" element={<CategoryPage contentType="MOVIE" title="GL Movies" />} />
            <Route path="/dramas" element={<CategoryPage contentType="TV" title="GL Dramas & Series" />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/genres" element={<GenresPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/title/:id" element={<TitleDetailPage />} />
            <Route path="/read/:id" element={<ReaderPage />} />
            <Route path="/watch/:id" element={<WatchPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  </KindeProvider>
  );
}
