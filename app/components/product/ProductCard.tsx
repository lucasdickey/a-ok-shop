'use client';

import Link from 'next/link';
import Image from 'next/image';
// Updated to work with database structure
type ProductCardProps = {
  product: any; // Use any for now, can be typed later
};

export default function ProductCard({ product }: ProductCardProps) {
  const { handle, title, minPrice, maxPrice, images, productType, tags } = product;
  
  const price = minPrice ? parseFloat(minPrice.toString()) : 0;
  const imageUrl = images?.[0]?.url || '/images/product-placeholder.jpg';
  const imageAlt = images?.[0]?.altText || title;
  
  // Determine product type for styling
  let cardType = '';
  let bgColor = '';
  let textColor = 'white';
  let priceColor = '#FCEFB9'; // Default yellow highlight
  let sizeBgColor = 'rgba(255, 255, 255, 0.1)';
  let sizeBorderColor = '#F5F2DC';
  let sizeTextColor = 'white';
  
  if (productType?.toLowerCase().includes('hoodie') || tags?.some((tag: string) => tag.toLowerCase().includes('hoodie'))) {
    cardType = 'hoodie';
    bgColor = '#F5F2DC'; // Bone White
    textColor = '#1F1F1F';
    priceColor = '#8B1E24';
    sizeBgColor = 'rgba(0, 0, 0, 0.1)';
    sizeBorderColor = '#1F1F1F';
    sizeTextColor = '#1F1F1F';
  } else if (productType?.toLowerCase().includes('hat') || tags?.some((tag: string) => tag.toLowerCase().includes('hat'))) {
    cardType = 'hat';
    bgColor = '#8B1E24'; // Dark Maroon for hats
  } else {
    // Default to t-shirt
    cardType = 't-shirt';
    bgColor = '#2C2C2C'; // Black for t-shirts
  }
  
  // Size options are handled on individual product pages

  // Card styles
  const cardStyle = {
    backgroundColor: bgColor,
    color: textColor,
    border: '2px solid #1F1F1F',
    borderRadius: '12px',
    padding: '1.25rem 1rem',
    display: 'flex',
    flexDirection: 'column' as 'column',
    justifyContent: 'space-between',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    fontFamily: "'Space Grotesk', sans-serif",
    height: '100%',
    cursor: 'pointer',
    maxWidth: '100%'
  };

  const titleStyle = {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.3,
    marginBottom: '0.5rem',
    color: textColor,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '0.01em'
  };

  const priceStyle = {
    fontSize: '1.25rem',
    fontWeight: 500,
    color: priceColor,
    marginBottom: '1rem',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '0.02em'
  };

  const sizeOptionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    marginTop: 'auto',
    flexWrap: 'wrap' as 'wrap'
  };

  const sizeButtonStyle = {
    backgroundColor: sizeBgColor,
    border: `1px solid ${sizeBorderColor}`,
    color: sizeTextColor,
    padding: '0.25rem 0.6rem',
    borderRadius: '50px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease, background-color 0.2s ease, font-weight 0.2s ease',
    fontFamily: "'Space Grotesk', sans-serif",
    minWidth: '2rem',
    textAlign: 'center' as 'center'
  };

  const imageContainerStyle = {
    position: 'relative' as 'relative',
    aspectRatio: '1/1' as '1/1',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '1px solid #1F1F1F',
    marginBottom: '1rem',
    width: '100%',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    backgroundColor: '#f8f8f8'
  };

  return (
    <Link 
      href={`/products/${handle}`} 
      aria-label={`View ${title} details`}
      style={{
        textDecoration: 'none',
        color: 'inherit'
      }}
    >
      <div 
        style={cardStyle}
      >
        <div style={imageContainerStyle} className="image-container-hover">
          {imageUrl.startsWith('http') ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              style={{
                objectFit: 'cover',
                transition: 'transform 0.3s ease'
              }}
              className="product-image-hover"
            />
          ) : (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'gray',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <span style={{
                color: 'gray',
                fontSize: '1rem'
              }}>{title}</span>
            </div>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1
        }}>
          <h3 style={titleStyle}>{title}</h3>
          <p style={priceStyle}>${price.toFixed(2)}</p>
          
          {/* Size options removed from product list view */}
        </div>
      </div>
    </Link>
  );
}
