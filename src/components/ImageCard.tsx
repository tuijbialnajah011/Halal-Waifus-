import { useState } from 'react';
import { Download, ExternalLink, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimeImage } from '../types';

interface ImageCardProps {
  image: AnimeImage;
  index: number;
}

export default function ImageCard({ image, index }: ImageCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloading) return;
    
    setIsDownloading(true);
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      // Extract filename from URL or generate one
      const filename = image.url.split('/').pop() || `anime-pic-${Date.now()}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed, opening in new tab', error);
      window.open(image.url, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
      className="masonry-item relative group rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(!isHovered)}
    >
      {/* Loading Skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-neutral-800 animate-pulse flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-6 h-6 text-neutral-600 animate-spin" />
        </div>
      )}

      {/* Main Image */}
      <img
        src={image.url}
        alt={`Anime Art by ${image.artist_name || 'Unknown'}`}
        className={`w-full h-auto min-h-[300px] object-cover transition-transform duration-700 ease-out ${isHovered ? 'scale-105' : 'scale-100'} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
        crossOrigin="anonymous"
      />

      {/* Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none flex flex-col justify-end p-4"
          >
            <div className="pointer-events-auto flex items-end justify-between w-full">
              {/* Artist Info */}
              <div className="flex flex-col gap-1 max-w-[70%]">
                <span className="text-white font-medium text-sm truncate drop-shadow-md">
                  {image.artist_name || 'Unknown Artist'}
                </span>
                {image.source_url && (
                  <a
                    href={image.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-300 text-xs hover:text-white flex items-center gap-1 w-fit transition-colors drop-shadow-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Source
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <a
                  href={image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all transform hover:scale-105 active:scale-95"
                  onClick={(e) => !e.ctrlKey && e.stopPropagation()}
                  title="Open original"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="p-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  title="Download Image"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
