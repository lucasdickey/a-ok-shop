import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getProductByHandle } from '@/app/lib/shopify';
import AddToCartButton from '@/app/components/product/AddToCartButton';
import SizeSelector from '@/app/components/product/SizeSelector';

export const dynamic = 'force-dynamic';

export default async function ProductPage({
  params,
}: {
  params: { handle: string };
}) {
  const product = await getProductByHandle(params.handle);

  if (!product) {
    notFound();
  }

  const images = product.images.edges.map(({ node }) => ({
    url: node.url,
    alt: node.altText || product.title,
  }));

  const variants = product.variants.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    price: parseFloat(node.price.amount),
    available: node.availableForSale,
    selectedOptions: node.selectedOptions,
  }));

  const defaultVariant = variants[0];
  const price = parseFloat(product.priceRange.minVariantPrice.amount);
  
  // Check if this product has size options
  const sizeOption = product.options?.find(option => 
    option.name.toLowerCase() === 'size'
  );
  
  const hasSizeOptions = !!sizeOption && sizeOption.values.length > 0;
  
  // Check if this is a clothing item (shirt or hoodie)
  const isClothingItem = product.productType.toLowerCase().includes('t-shirt') || 
                         product.productType.toLowerCase().includes('hoodie') ||
                         product.tags.some(tag => 
                           tag.toLowerCase().includes('t-shirt') || 
                           tag.toLowerCase().includes('tshirt') || 
                           tag.toLowerCase().includes('hoodie')
                         );

  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary-light">
            <Image
              src={images[0]?.url || '/product-placeholder.jpg'}
              alt={images[0]?.alt || product.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1).map((image, index) => (
                <div key={index} className="relative aspect-square overflow-hidden rounded-lg bg-secondary-light">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          
          <div className="mt-4">
            <p className="text-2xl font-medium text-primary">
              ${price.toFixed(2)}
            </p>
          </div>

          {isClothingItem && hasSizeOptions && (
            <div className="mt-6">
              <SizeSelector 
                sizeOptions={sizeOption.values} 
                variants={variants}
                productId={product.id}
                productTitle={product.title}
                productPrice={price}
                productImage={images[0]?.url || '/product-placeholder.jpg'}
              />
            </div>
          )}

          {!isClothingItem && variants.length > 1 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium">Variants</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    className="rounded-md border border-secondary px-3 py-1 text-sm hover:bg-secondary-light"
                  >
                    {variant.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isClothingItem && (
            <div className="mt-6">
              <AddToCartButton
                product={{
                  id: product.id,
                  title: product.title,
                  price: price,
                  image: images[0]?.url || '/product-placeholder.jpg',
                  variantId: defaultVariant.id,
                }}
              />
            </div>
          )}

          <div className="mt-8 prose prose-sm max-w-none">
            <h3 className="text-lg font-medium">Description</h3>
            <div dangerouslySetInnerHTML={{ __html: product.description }} />
          </div>

          {product.tags.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium">Tags</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
