import { Toy } from '@/src/types/toy';

export const toys: Toy[] = [
  {
    id: 'opal-tadpole',
    title: 'Opal Tadpole',
    description: 'Tiny 4K webcam that clips to your laptop screen',
    imageUrl: '/images/affiliate-art/opal-tadpole.jpg',
    amazonUrl: 'https://amzn.to/4eO3d0P',
    category: 'Cameras',
    price: '$175'
  },
  {
    id: 'nova-wave-2',
    title: 'Nova Wave 2',
    description: 'AI-powered light that adapts to your circadian rhythm',
    imageUrl: '/images/affiliate-art/nova-wave-2.jpg',
    amazonUrl: 'https://amzn.to/4lrKRoN',
    category: 'Lighting',
    price: '$199'
  },
  {
    id: 'focusrite-scarlett-2i2',
    title: 'Focusrite Scarlett 2i2',
    description: 'USB audio interface for recording with professional sound quality',
    imageUrl: '/images/affiliate-art/focusrite-scarlett-2i2.jpg',
    amazonUrl: 'https://amzn.to/4lVDupz',
    category: 'Audio Interfaces',
    price: '$139'
  },
  {
    id: 'aiaiai-tma2-headphones',
    title: 'AIAIAI TMA-2 DJ Wireless Headphones',
    description: 'Professional wireless DJ headphones with high isolation',
    imageUrl: '/images/affiliate-art/aiaiai-tma2-headphones.jpg',
    amazonUrl: 'https://amzn.to/3Tx9jJ5',
    category: 'Audio',
    price: '$299'
  },
  {
    id: 'akai-lpd8',
    title: 'AKAI Professional LPD8',
    description: 'Compact USB MIDI pad controller for beat making',
    imageUrl: '/images/affiliate-art/akai-lpd8.jpg',
    amazonUrl: 'https://amzn.to/4kAcMSg',
    category: 'Music Gear',
    price: '$59'
  },
  {
    id: 'desk-clamp-power-strip',
    title: 'Desk Clamp Power Strip',
    description: 'Mountable power strip that clamps to your desk edge',
    imageUrl: '/images/affiliate-art/desk-clamp-power-strip.jpg',
    amazonUrl: 'https://amzn.to/4liQ1TX',
    category: 'Office',
    price: '$35'
  },
  {
    id: 'maschine-mikro-mk3',
    title: 'Native Instruments Maschine Mikro Mk3',
    description: 'Compact drum machine and sampler controller',
    imageUrl: '/images/affiliate-art/maschine-mikro-mk3.jpg',
    amazonUrl: 'https://amzn.to/44YxbeY',
    category: 'Music Gear',
    price: '$229'
  },
  {
    id: 'shure-mv7i',
    title: 'Shure MV7i Smart Microphone',
    description: 'USB microphone with built-in audio interface for podcasting',
    imageUrl: '/images/affiliate-art/shure-mv7i.jpg',
    amazonUrl: 'https://amzn.to/4lpE3bl',
    category: 'Audio',
    price: '$329'
  }
];

export function getToyById(id: string): Toy | undefined {
  return toys.find(toy => toy.id === id);
}

export function getToysByCategory(category: string): Toy[] {
  return toys.filter(toy => toy.category === category);
}

export function getAllCategories(): string[] {
  const categories = new Set(toys.map(toy => toy.category).filter(Boolean) as string[]);
  return Array.from(categories).sort();
}