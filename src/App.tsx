import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Image as ImageIcon, Loader2, ArrowUpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageCard from './components/ImageCard';
import { Category, AnimeImage } from './types';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'waifu', label: 'Waifu' },
  { id: 'husbando', label: 'Husbando' },
  { id: 'kitsune', label: 'Kitsune' },
  { id: 'neko', label: 'Neko' },
];

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('waifu');
  const [images, setImages] = useState<AnimeImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const fetchImages = async (category: Category, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://nekos.best/api/v2/${category}?amount=20`);
      if (!res.ok) throw new Error('Failed to fetch images');
      const data = await res.json();
      
      setImages(prev => append ? [...prev, ...data.results] : data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & category switch
  useEffect(() => {
    setImages([]);
    fetchImages(activeCategory, false);
  }, [activeCategory]);

  // Handle scroll to show/hide "Scroll to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
      
      // Auto load more when scrolling near bottom
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800 &&
        !loading
      ) {
        fetchImages(activeCategory, true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeCategory, loading]);

  const loadMore = () => {
    if (!loading) fetchImages(activeCategory, true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-fuchsia-500/30 pb-20">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-xl shadow-[0_0_20px_rgba(217,70,239,0.3)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
              Anime<span className="text-fuchsia-400">Vault</span>
            </h1>
          </div>
          
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-xs text-neutral-500 font-medium px-3">Powered by Nekos.best</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {/* Category Navigation */}
        <div className="flex flex-col items-center mb-10 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">
              Discover Unlimited Art
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base max-w-lg mx-auto">
              Explore thousands of high-quality anime pictures. Download your favorites instantly.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 p-1 bg-neutral-900/50 rounded-2xl border border-neutral-800 backdrop-blur-sm">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative ${
                  activeCategory === cat.id
                    ? 'text-white shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                }`}
              >
                {activeCategory === cat.id && (
                  <motion.div
                    layoutId="activeCategoryTab"
                    className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {error && (
          <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center mb-8">
            <p>{error}</p>
            <button 
              onClick={() => fetchImages(activeCategory, true)}
              className="mt-2 text-sm underline hover:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        <div className="masonry-grid">
          <AnimatePresence mode="popLayout">
            {images.map((img, idx) => (
              <ImageCard 
                key={`${img.url}-${idx}`} 
                image={img} 
                index={idx} 
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Loading State / Load More */}
        <div className="mt-12 flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-fuchsia-500 animate-spin" />
              <span className="text-sm tracking-widest text-fuchsia-500/80 font-medium uppercase font-display animate-pulse">Loading Magic...</span>
            </div>
          ) : (
            images.length > 0 && (
              <button
                onClick={loadMore}
                className="px-8 py-3 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700 text-white rounded-full font-medium transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2"
              >
                <ImageIcon className="w-4 h-4" />
                Load More
              </button>
            )
          )}
        </div>
      </main>

      {/* Floating Scroll Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={scrollToTop}
              className="p-3 bg-neutral-800/80 hover:bg-fuchsia-600 backdrop-blur-md text-white rounded-full shadow-2xl transition-colors group"
            >
              <ArrowUpCircle className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
