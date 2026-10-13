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

export default function App() {
  return (
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
  );
}
