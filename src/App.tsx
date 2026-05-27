import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Loader2, ArrowUpCircle, DownloadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageCard from './components/ImageCard';
import { Category, AnimeImage } from './types';

const SFW_CATEGORIES: { id: Category; label: string }[] = [
  { id: 'waifu', label: 'Waifu' },
  { id: 'husbando', label: 'Husbando' },
  { id: 'kitsune', label: 'Kitsune' },
  { id: 'neko', label: 'Neko' },
];

const NSFW_CATEGORIES: { id: Category; label: string }[] = [
  { id: 'waifu', label: 'Waifu' },
  { id: 'neko', label: 'Neko' },
  { id: 'trap', label: 'Trap' },
  { id: 'blowjob', label: 'Blowjob' },
];

const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CacheEntry {
  timestamp: number;
  data: AnimeImage[];
}

const getCacheKey = (cat: string, nsfw: boolean) => `hwaifus_cache_${cat}_${nsfw}`;

const getCachedImages = (cat: string, nsfw: boolean): AnimeImage[] | null => {
  try {
    const key = getCacheKey(cat, nsfw);
    const item = localStorage.getItem(key);
    if (!item) return null;
    const entry: CacheEntry = JSON.parse(item);
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch (e) {
    return null;
  }
};

const setCachedImages = (cat: string, nsfw: boolean, data: AnimeImage[]) => {
  try {
    const key = getCacheKey(cat, nsfw);
    const entry: CacheEntry = {
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('LocalStorage quota exceeded or error:', e);
  }
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('waifu');
  const [isNsfw, setIsNsfw] = useState(false);
  const [images, setImages] = useState<AnimeImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1280) setColumns(4);
      else if (window.innerWidth >= 1024) setColumns(3);
      else if (window.innerWidth >= 640) setColumns(2);
      else setColumns(1);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const fetchImages = async (category: Category, nsfw: boolean, append = false) => {
    setLoading(true);
    setError(null);
    try {
      if (!append) {
        const cached = getCachedImages(category, nsfw);
        if (cached && cached.length > 0) {
          setImages(cached);
          setLoading(false);
          return;
        }
      }

      if (nsfw) {
        const requests = Array.from({ length: 15 }).map(() =>
          fetch(`https://api.waifu.pics/nsfw/${category}`).then(res => {
            if (!res.ok) throw new Error('Network error');
            return res.json();
          })
        );
        const results = await Promise.allSettled(requests);
        const dataFiles = results
          .filter((res): res is PromiseFulfilledResult<any> => res.status === 'fulfilled')
          .map(res => res.value.url);
        
        const newImages = dataFiles.map((url: string) => ({ url }));
        setImages(prev => {
          const updated = append ? [...prev, ...newImages] : newImages;
          setCachedImages(category, nsfw, updated);
          return updated;
        });
      } else {
        const res = await fetch(`https://nekos.best/api/v2/${category}?amount=20`);
        if (!res.ok) throw new Error('Failed to fetch images');
        const data = await res.json();
        
        setImages(prev => {
          const updated = append ? [...prev, ...data.results] : data.results;
          setCachedImages(category, nsfw, updated);
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & category switch
  useEffect(() => {
    if (!getCachedImages(activeCategory, isNsfw)) {
      setImages([]);
    }
    fetchImages(activeCategory, isNsfw, false);
  }, [activeCategory, isNsfw]);

  // Handle scroll to show/hide "Scroll to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
      
      // Auto load more when scrolling near bottom
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800 &&
        !loading
      ) {
        fetchImages(activeCategory, isNsfw, true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeCategory, isNsfw, loading]);

  const loadMore = () => {
    if (!loading) fetchImages(activeCategory, isNsfw, true);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-fuchsia-500/30 pb-20">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative">
          
          {/* Left Space for Flex Balance */}
          <div className="flex-1 hidden sm:flex"></div>

          {/* Centered Stylish Logo */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 flex items-center justify-center w-full pointer-events-none">
            <h1 className="text-2xl md:text-3xl font-display font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-pink-400 to-purple-500 drop-shadow-[0_0_15px_rgba(232,121,249,0.3)]">
              Hwaifus
            </h1>
          </div>
          
          {/* Right Actions Menu */}
          <div className="flex-1 flex items-center justify-end gap-3 z-10 w-full sm:w-auto">
            <div className="hidden lg:flex items-center">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-500 font-bold px-4 border-r border-neutral-800">
                Powered by 𝙱𝙹𝙴 ~ Clan
              </span>
            </div>

            <AnimatePresence>
              {isInstallable && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-xs sm:text-sm font-medium rounded-full shadow-[0_0_15px_rgba(192,38,211,0.4)] transition-all transform hover:scale-105 active:scale-95 border border-fuchsia-400/20"
                  title="Install App"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span className="hidden sm:inline font-bold tracking-wide">Install</span>
                </motion.button>
              )}
            </AnimatePresence>

            <div className="flex lg:hidden items-center justify-end">
              <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold pr-1">
                <span className="hidden sm:inline">Powered by </span>𝙱𝙹𝙴
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8">
        {/* Category Navigation */}
        <div className="flex flex-col items-center mb-10 w-full">
          {/* SFW / NSFW Toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center p-1 bg-neutral-900 rounded-full border border-neutral-800 shadow-inner">
              <button
                onClick={() => {
                  if (isNsfw) {
                    setIsNsfw(false);
                    setActiveCategory('waifu');
                  }
                }}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  !isNsfw
                    ? 'bg-neutral-100 text-neutral-950 shadow-sm transform scale-[1.02]'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                SFW
              </button>
              <button
                onClick={() => {
                  if (!isNsfw) {
                    setIsNsfw(true);
                    setActiveCategory('waifu');
                  }
                }}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                  isNsfw
                    ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] transform scale-[1.02]'
                    : 'text-neutral-500 hover:text-red-400'
                }`}
              >
                NSFW
              </button>
            </div>
          </div>

          <div className="w-full relative">
            {/* Fade Edges for Scroll Area */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-neutral-950 to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-neutral-950 to-transparent pointer-events-none z-10" />
            
            {/* Scrollable Row */}
            <div className="flex overflow-x-auto scrollbar-hide py-3 gap-2 px-6 justify-start scroll-smooth items-center">
              {(isNsfw ? NSFW_CATEGORIES : SFW_CATEGORIES).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative ${
                    activeCategory === cat.id
                      ? 'text-white shadow-lg'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                  }`}
                >
                  {activeCategory === cat.id && (
                    <motion.div
                      layoutId="activeCategoryTab"
                      className={`absolute inset-0 rounded-full ${isNsfw ? 'bg-gradient-to-r from-red-600 to-rose-600' : 'bg-gradient-to-r from-fuchsia-600 to-purple-600'}`}
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2 whitespace-nowrap">
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        {error && (
          <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-center mb-8">
            <p>{error}</p>
            <button 
              onClick={() => fetchImages(activeCategory, isNsfw, true)}
              className="mt-2 text-sm underline hover:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
          {Array.from({ length: 4 }).map((_, colIndex) => (
            <div key={colIndex} className={`flex flex-col gap-6 ${colIndex >= columns ? 'hidden' : 'flex'}`}>
              <AnimatePresence mode="popLayout">
                {images
                  .filter((_, idx) => idx % columns === colIndex)
                  .map((img, idx) => (
                  <ImageCard 
                    key={`${img.url}-${idx}`} 
                    image={img} 
                    index={idx} 
                  />
                ))}
              </AnimatePresence>
            </div>
          ))}
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
