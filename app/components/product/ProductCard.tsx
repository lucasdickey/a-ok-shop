'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShopifyProduct } from '@/app/lib/shopify';

type ProductCardProps = {
  product: ShopifyProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { handle, title, priceRange, images, options, variants, productType, tags } = product;
  
  const price = parseFloat(priceRange.minVariantPrice.amount);
  const imageUrl = images.edges[0]?.node.url || '/images/product-placeholder.jpg';
  const imageAlt = images.edges[0]?.node.altText || title;
  
  // Determine product type for styling
  let cardType = '';
  let bgColor = '';
  let textColor = 'white';
  let priceColor = '#FCEFB9'; // Default yellow highlight
  let sizeBgColor = 'rgba(255, 255, 255, 0.1)';
  let sizeBorderColor = '#F5F2DC';
  let sizeTextColor = 'white';
  
  if (productType.toLowerCase().includes('hoodie') || tags.some(tag => tag.toLowerCase().includes('hoodie'))) {
    cardType = 'hoodie';
    bgColor = '#F5F2DC'; // Bone White
    textColor = '#1F1F1F';
    priceColor = '#8B1E24';
    sizeBgColor = 'rgba(0, 0, 0, 0.1)';
    sizeBorderColor = '#1F1F1F';
    sizeTextColor = '#1F1F1F';
  } else if (productType.toLowerCase().includes('hat') || tags.some(tag => tag.toLowerCase().includes('hat'))) {
    cardType = 'hat';
    bgColor = '#8B1E24'; // Dark Maroon for hats
  } else {
    // Default to t-shirt
    cardType = 't-shirt';
    bgColor = '#2C2C2C'; // Black for t-shirts
  }
  
  // Extract size information - only include S, M, L, XL
  const standardSizes = ['S', 'M', 'L', 'XL'];
  let sizeValues: string[] = [];
  
  // First try to get size options from the product options
  const sizeOption = options?.find(option => 
    option.name.toLowerCase() === 'size'
  );
  
  if (sizeOption && sizeOption.values.length > 0) {
    // Filter to only include standard sizes
    sizeValues = sizeOption.values.filter(size => standardSizes.includes(size));
  }
  
  // If no size options found, try to extract from variants
  if (sizeValues.length === 0 && variants?.edges) {
    const sizeSet = new Set<string>();
    
    variants.edges.forEach(({ node }) => {
      if (node.selectedOptions) {
        const sizeOption = node.selectedOptions.find((opt: any) => 
          opt.name.toLowerCase() === 'size'
        );
        
        if (sizeOption && standardSizes.includes(sizeOption.value)) {
          sizeSet.add(sizeOption.value);
        } else if (standardSizes.includes(node.title)) {
          // If variant title is a standard size
          sizeSet.add(node.title);
        }
      }
    });
    
    sizeValues = Array.from(sizeSet);
  }
  
  // If still no size values and this is a clothing item, use all standard sizes as a fallback
  // Always include all standard sizes for clothing items since "continue selling when out of stock" is enabled
  if (cardType === 't-shirt' || cardType === 'hoodie') {
    sizeValues = [...standardSizes];
  }
  
  // Sort sizes in the standard order
  sizeValues.sort((a, b) => {
    return standardSizes.indexOf(a) - standardSizes.indexOf(b);
  });
  
  const hasSizes = sizeValues.length > 0;

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
    color: textColor
  };

  const priceStyle = {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: priceColor,
    marginBottom: '1rem'
  };

  const sizeOptionsStyle = {
    display: 'flex',
    gap: '0.5rem',
    marginTop: 'auto'
  };

  const sizeButtonStyle = {
    backgroundColor: sizeBgColor,
    border: `1px solid ${sizeBorderColor}`,
    color: sizeTextColor,
    padding: '0.25rem 0.6rem',
    borderRadius: '50px',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer'
  };

  const imageContainerStyle = {
    position: 'relative' as 'relative',
    aspectRatio: '1/1' as '1/1',
    overflow: 'hidden',
    borderRadius: '8px',
    border: '1px solid #1F1F1F',
    marginBottom: '1rem',
    width: '100%'
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
        <div style={imageContainerStyle}>
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
          
          {/* Display available sizes if present */}
          {hasSizes && (
            <div style={sizeOptionsStyle}>
              {sizeValues.map((size) => (
                <span key={size} style={sizeButtonStyle}>
                  {size}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
