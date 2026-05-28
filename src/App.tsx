import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Loader2, ArrowUpCircle, DownloadCloud, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ImageCard from './components/ImageCard';
import { Category, AnimeImage } from './types';

const SFW_CATEGORIES: { id: Category; label: string }[] = [
  { id: 'waifu', label: 'Waifu' },
  { id: 'husbando', label: 'Husbando' },
  { id: 'kitsune', label: 'Kitsune' },
  { id: 'neko', label: 'Neko' },
  { id: 'maid', label: 'Maid' },
  { id: 'swimsuit', label: 'Swimsuit' },
  { id: 'uniform', label: 'Uniform' },
];

const NSFW_CATEGORIES: { id: Category; label: string }[] = [
  { id: 'waifu', label: 'Waifu' },
  { id: 'neko', label: 'Neko' },
  { id: 'trap', label: 'Trap' },
  { id: 'blowjob', label: 'Blowjob' },
  { id: 'boobs', label: 'Boobs' },
  { id: 'ass', label: 'Ass' },
  { id: 'yuri', label: 'Yuri' },
  { id: 'hentai', label: 'Hentai' },
  { id: 'ecchi', label: 'Ecchi' },
];

const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  timestamp: number;
  data: AnimeImage[];
}

const getCacheKey = (cat: string, nsfw: boolean, pov: boolean) => `hwaifus_cache_${cat}_${nsfw}_${pov}`;

const getCachedImages = (cat: string, nsfw: boolean, pov: boolean): AnimeImage[] | null => {
  try {
    const key = getCacheKey(cat, nsfw, pov);
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

const setCachedImages = (cat: string, nsfw: boolean, pov: boolean, data: AnimeImage[]) => {
  try {
    const key = getCacheKey(cat, nsfw, pov);
    const entry: CacheEntry = {
      timestamp: Date.now(),
      data
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        // Find and remove the oldest cache entry
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('hwaifus_cache_')) {
            try {
              const item = localStorage.getItem(k);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp < oldestTime) {
                  oldestTime = parsed.timestamp;
                  oldestKey = k;
                }
              }
            } catch (err) {}
          }
        }
        
        if (oldestKey) {
          localStorage.removeItem(oldestKey);
          // Try setting again after clearing space
          try {
            localStorage.setItem(key, JSON.stringify(entry));
          } catch (retryErr) {
            console.warn('Still out of quota after clearing oldest item', retryErr);
          }
        }
      } else {
        console.warn('LocalStorage error:', e);
      }
    }
  } catch (e) {
    console.warn('Cache construction error:', e);
  }
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('waifu');
  const [isNsfw, setIsNsfw] = useState(false);
  const [isPov, setIsPov] = useState(false);
  const [images, setImages] = useState<AnimeImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const clearCache = () => {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('hwaifus_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      setImages([]);
      setError("Cache cleared successfully!");
      setTimeout(() => setError(null), 3000);
      window.location.reload(); // optionally reload to fetch fresh
    } catch (e) {
      console.error(e);
    }
  };

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

  const fetchImages = async (category: Category, nsfw: boolean, pov: boolean, append = false) => {
    setLoading(true);
    setError(null);
    try {
      if (!append) {
        const cached = getCachedImages(category, nsfw, pov);
        if (cached && cached.length > 0) {
          setImages(cached);
          setLoading(false);
          return;
        }
      }

      const promises: Promise<Response>[] = [];
      let newImageUrls: string[] = [];

      // Helper to fetch via proxy (bypasses CORS restrictions)
      const fetchViaProxy = async (url: string, config?: any) => {
        return fetch('/api/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, config }),
        });
      };

      // Danbooru tag mapping (Supports everything)
      let tag = '1girl';
      if (category === 'neko') tag = 'cat_girl';
      else if (category === 'kitsune') tag = 'fox_girl';
      else if (category === 'husbando') tag = '1boy';
      else if (category === 'maid') tag = 'maid';
      else if (category === 'swimsuit') tag = 'swimsuit';
      else if (category === 'uniform') tag = 'school_uniform';
      else if (category === 'trap') {
        const trapTags = ['trap', 'crossdressing', 'femboy', 'otoko_no_ko'];
        tag = trapTags[Math.floor(Math.random() * trapTags.length)];
      }
      else if (category === 'blowjob') tag = 'fellatio';
      else if (category === 'boobs') tag = 'breasts';
      else if (category === 'ass') tag = 'ass';
      else if (category === 'yuri') tag = 'yuri';
      else if (category === 'hentai') tag = 'completely_nude';
      else if (category === 'ecchi') tag = 'ecchi';
      
      let maxPage = 100;
      if (pov) {
        tag += '+pov';
        maxPage = 10;
      } else {
        if (category === 'trap') maxPage = 200;
        if (category === 'yuri' || category === 'husbando') maxPage = 50;
      }
      
      const page = Math.floor(Math.random() * maxPage) + 1;
      
      promises.push(
        fetchViaProxy(`https://danbooru.donmai.us/posts.json?limit=${pov ? '60' : '40'}&page=${page}&tags=rating:${nsfw ? 'explicit' : 'general'}+${tag}`)
      );

      // Waifu.pics mapping
      if (!pov) {
        const waifuPicsCategories = nsfw 
          ? ['waifu', 'neko', 'trap', 'blowjob']
          : ['waifu', 'neko', 'shinobu', 'megumin']; // we can use 'waifu' or 'neko' for others as fallback
        
        let wpCategory = category;
        if (!waifuPicsCategories.includes(category)) {
          wpCategory = 'waifu'; // fallback
        }

        promises.push(
          fetchViaProxy(`https://api.waifu.pics/many/${nsfw ? 'nsfw' : 'sfw'}/${wpCategory}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exclude: [] })
          })
        );
      }

      // Yande.re mapping (NSFW)
      if (nsfw) {
        let tag = '1girl'; // fallback
        if (category === 'neko') tag = 'cat_girl';
        else if (category === 'trap') tag = 'trap';
        else if (category === 'blowjob') tag = 'fellatio';
        else if (category === 'boobs') tag = 'breasts';
        else if (category === 'ass') tag = 'ass';

        let maxPage = 50;
        if (pov) {
          tag += '+pov';
          maxPage = 5;
        } else {
          if (category === 'trap') maxPage = 10;
        }

        const page = Math.floor(Math.random() * maxPage) + 1;
        promises.push(
            fetchViaProxy(`https://yande.re/post.json?limit=${pov ? '60' : '40'}&page=${page}&tags=rating:explicit+${tag}`)
        );
      }

      // Safebooru mapping (SFW only)
      if (!nsfw) {
        let tag = '1girl'; // fallback
        if (category === 'neko') tag = 'cat_girl';
        else if (category === 'kitsune') tag = 'fox_girl';
        else if (category === 'husbando') tag = '1boy';
        else if (category === 'maid') tag = 'maid';
        else if (category === 'swimsuit') tag = 'swimsuit';
        else if (category === 'uniform') tag = 'school_uniform';
        else if (category === 'trap') {
          const trapTags = ['trap', 'crossdressing', 'femboy', 'otoko_no_ko'];
          tag = trapTags[Math.floor(Math.random() * trapTags.length)];
        }

        let maxPage = 100;
        if (pov) {
          tag += '+pov';
          maxPage = 10;
        } else if (category === 'trap') {
          maxPage = 100;
        }

        const page = Math.floor(Math.random() * maxPage);
        promises.push(
            fetchViaProxy(`https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=${pov ? '60' : '40'}&pid=${page}&tags=${tag}`)
        );
      }

      // Nekos.best mapping (SFW only)
      if (!nsfw && !pov) {
        const nbCategories = ['waifu', 'neko', 'kitsune', 'husbando'];
        if (nbCategories.includes(category)) {
          promises.push(fetchViaProxy(`https://nekos.best/api/v2/${category}?amount=20`));
        } else {
          promises.push(fetchViaProxy(`https://nekos.best/api/v2/waifu?amount=20`));
        }
      }

      // Waifu.im mapping
      if (!pov) {
        let wiTags = '';
        if (nsfw) {
           if (category === 'waifu' || category === 'hentai') wiTags = 'hentai';
           else if (category === 'ecchi') wiTags = 'ecchi';
           else if (category === 'blowjob') wiTags = 'oral';
        } else {
           if (category === 'maid') wiTags = 'maid';
           else if (category === 'uniform') wiTags = 'uniform';
           else if (category === 'waifu') wiTags = 'waifu';
        }
        if (wiTags) {
           promises.push(fetchViaProxy(`https://api.waifu.im/search?is_nsfw=${nsfw}&included_tags=${wiTags}&many=true`));
        }
      }

      const results = await Promise.allSettled(promises);

      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        if (res.status === 'fulfilled' && res.value.ok) {
          try {
            // Because proxy returns res.url as '/api/proxy', we need to get the original url from the request body or we can check which promise it is.
            // But we know the order of promises. Wait, let's keep original url somehow or just try to see data shape.
            const data = await res.value.json();
            
            if (Array.isArray(data)) {
              // Usually boorus return arrays
              const booruUrls = data
                .map((post: any) => {
                  let fileUrl = post.large_file_url || post.file_url;
                  if (!fileUrl && post.image && post.directory) { // safebooru fields mapping
                      fileUrl = `https://safebooru.org/images/${post.directory}/${post.image}`;
                  }
                  
                  let sampleUrl = post.file_url || post.large_file_url;
                  if (!sampleUrl && post.image && post.directory) {
                      sampleUrl = `https://safebooru.org/samples/${post.directory}/sample_${post.image.replace('.png','.jpg')}`;
                  }
                  
                  if (!fileUrl && post.jpeg_url) { // yandere fields mapping
                      fileUrl = post.jpeg_url || post.file_url;
                  }
                  if (!sampleUrl && post.sample_url) {
                      sampleUrl = post.sample_url || post.file_url;
                  }

                  if (!append) return fileUrl || sampleUrl;
                  return Math.random() > 0.5 ? (fileUrl || sampleUrl) : (sampleUrl || fileUrl);
                })
                .filter((url: string) => url && !url.endsWith('.mp4') && !url.endsWith('.webm'));
              newImageUrls = [...newImageUrls, ...booruUrls];
            } else if (data.files && Array.isArray(data.files)) { // waifu.pics
              newImageUrls = [...newImageUrls, ...data.files];
            } else if (data.results && Array.isArray(data.results)) { // nekos.best
              newImageUrls = [...newImageUrls, ...data.results.map((r: any) => r.url)];
            } else if (data.images && Array.isArray(data.images)) { // waifu.im
              newImageUrls = [...newImageUrls, ...data.images.map((img: any) => img.url)];
            }
          } catch (e) {}
        }
      }

      if (newImageUrls.length === 0) {
        throw new Error('Failed to fetch images from sources.');
      }

      newImageUrls = Array.from(new Set(newImageUrls));
      newImageUrls = newImageUrls.sort(() => Math.random() - 0.5).slice(0, 40); // max 40 images
      const newImages = newImageUrls.map((url: string) => ({ url }));

      setImages(prev => {
        let updated;
        if (append) {
          const prevUrls = new Set(prev.map(img => img.url));
          const uniqueNewImages = newImages.filter(img => !prevUrls.has(img.url));
          updated = [...prev, ...uniqueNewImages];
        } else {
          updated = newImages;
        }
        setCachedImages(category, nsfw, pov, updated);
        return updated;
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & category switch
  useEffect(() => {
    if (!getCachedImages(activeCategory, isNsfw, isPov)) {
      setImages([]);
    }
    fetchImages(activeCategory, isNsfw, isPov, false);
  }, [activeCategory, isNsfw, isPov]);

  // Handle scroll to show/hide "Scroll to Top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
      
      // Auto load more when scrolling near bottom
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 800 &&
        !loading
      ) {
        fetchImages(activeCategory, isNsfw, isPov, true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeCategory, isNsfw, isPov, loading]);

  const loadMore = () => {
    if (!loading) fetchImages(activeCategory, isNsfw, isPov, true);
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

            <button
              onClick={clearCache}
              className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs sm:text-sm font-medium rounded-full transition-all transform hover:scale-105 active:scale-95"
              title="Clear Cache"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline font-bold tracking-wide">Clear Cache</span>
            </button>

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
          <div className="flex items-center justify-center mb-8 gap-4">
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

            {/* POV Toggle */}
            <div className="flex items-center p-[2px] bg-neutral-900 rounded-full border border-neutral-800 shadow-inner cursor-pointer" onClick={() => {
              setIsPov(!isPov);
            }}>
              <div className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
                  isPov
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-[0_0_15px_rgba(192,38,211,0.4)] transform scale-[1.02]'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}>
                <span className="relative z-10 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full border-2 border-current transition-colors ${isPov ? 'bg-white' : 'bg-transparent'}`} />
                  POV
                </span>
              </div>
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
              onClick={() => fetchImages(activeCategory, isNsfw, isPov, true)}
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
