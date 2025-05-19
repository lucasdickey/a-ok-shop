// Sample test data for gallery
const testImages = [
  {
    name: 'Test Image 1',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    source: 'local'
  },
  {
    name: 'Test Image 2',
    url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    source: 'local'
  },
  {
    name: 'Daily Art 1',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    source: 'self-replicating-art',
    date: '2023-01-01'
  },
  {
    name: 'Daily Art 2',
    url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
    source: 'self-replicating-art',
    date: '2023-01-02'
  }
];

export const getTestImages = () => ({
  images: testImages,
  counts: {
    local: testImages.filter(img => img.source === 'local').length,
    external: testImages.filter(img => img.source === 'self-replicating-art').length,
    total: testImages.length
  }
});

export default testImages;
