import * as React from 'react';
import { useState } from 'react';
import { Download, ExternalLink, Info, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimeImage } from '../types';

interface ImageCardProps {
  image: AnimeImage;
  index: number;
}

const ImageCard: React.FC<ImageCardProps> = ({ image, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleDownload = async (e: React.UIEvent) => {
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
        className={`w-full h-auto min-h-[300px] object-cover transition-opacity duration-300 ease-out ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
        crossOrigin="anonymous"
      />

      {/* Overlay - Always visible Download Button */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none flex flex-col justify-end p-4">
        <div className="pointer-events-auto flex items-end justify-between w-full">
          {/* Artist Info */}
          <div className="flex flex-col gap-1 max-w-[70%]">
            <span className="text-white/80 font-medium text-xs truncate drop-shadow-md">
              {image.artist_name || ''}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {image.source_url && (
              <a
                href={image.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-xl text-white transition-all shadow-sm"
                title="Source"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white rounded-xl shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all disabled:opacity-50"
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
      </div>
    </motion.div>
  );
};
export default ImageCard;
