import fs from 'fs';
import path from 'path';

// Helper to get local images from JSON or directory
export function getLocalImages() {
  try {
    const imageListPath = path.join(process.cwd(), 'app', 'data', 'image-list.json');
    if (fs.existsSync(imageListPath)) {
      return JSON.parse(fs.readFileSync(imageListPath, 'utf8'));
    }
    
    // Fallback to reading from public directory
    const publicDir = path.join(process.cwd(), 'public');
    const imageDir = path.join(publicDir, 'images', 'hp-art-grid-collection');
    if (!fs.existsSync(imageDir)) return [];
    
    const files = fs.readdirSync(imageDir);
    return files
      .filter(file => ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(path.extname(file).toLowerCase()))
      .map(file => ({
        name: file,
        url: `/images/hp-art-grid-collection/${file}`,
        source: 'local',
      }));
  } catch (error) {
    console.error('Error getting local images:', error);
    return [];
  }
}

// Helper to fetch external images from self-replicating-art API
export async function getExternalImages() {
  try {
    const response = await fetch('https://self-replicating-art.vercel.app/api/daily', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];
    
    const apiData = await response.json();
    if (!Array.isArray(apiData)) return [];
    
    return apiData.map(item => ({
      name: item.date || 'Unknown Date',
      url: `https://self-replicating-art.vercel.app${item.url}`,
      date: item.date,
      source: 'self-replicating-art',
    }));
  } catch (error) {
    console.error('Error fetching external images:', error);
    return [];
  }
}

export async function getAllImages() {
  try {
    const [localImages, externalImages] = await Promise.all([
      getLocalImages(),
      getExternalImages()
    ]);

    return {
      images: [...localImages, ...externalImages],
      counts: {
        local: localImages.length,
        external: externalImages.length,
        total: localImages.length + externalImages.length,
      },
    };
  } catch (error) {
    console.error('Error in getAllImages:', error);
    throw error;
  }
}
