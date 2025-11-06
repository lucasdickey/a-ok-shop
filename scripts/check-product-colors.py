#!/usr/bin/env python3
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables from .env.local file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local'))

def check_product_colors():
    # Get Shopify credentials from environment variables
    store_domain = os.getenv('SHOPIFY_STORE_DOMAIN')
    token = os.getenv('SHOPIFY_STOREFRONT_API_TOKEN')
    
    if not store_domain or not token:
        print("Error: Missing Shopify API credentials. Please check your .env file.")
        return
    
    # Shopify Storefront API endpoint
    endpoint = f"https://{store_domain}/api/2023-07/graphql.json"
    
    # Headers for API request
    headers = {
        'X-Shopify-Storefront-Access-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # GraphQL query to get all products with their options and variants
    query = """
    {
      products(first: 100) {
        edges {
          node {
            id
            title
            handle
            productType
            tags
            options {
              name
              values
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        }
      }
    }
    """
    
    # Make the API request
    try:
        response = requests.post(
            endpoint,
            headers=headers,
            json={"query": query}
        )
        
        response.raise_for_status()  # Raise an exception for HTTP errors
        data = response.json()
        
        # Process the products
        products = data.get('data', {}).get('products', {}).get('edges', [])
        products_with_colors = []
        products_without_colors = []
        
        print(f"Found {len(products)} products total.")
        
        for product_edge in products:
            product = product_edge['node']
            has_color_option = False
            
            # Check in product options
            color_values = []
            for option in product.get('options', []):
                if option['name'].lower() == 'color':
                    has_color_option = True
                    color_values = option['values']
                    products_with_colors.append({
                        'title': product['title'],
                        'handle': product['handle'],
                        'colors': color_values
                    })
                    break
            
            if has_color_option:
                continue
            
            # Check in variants
            color_set = set()
            for variant_edge in product.get('variants', {}).get('edges', []):
                variant = variant_edge['node']
                for option in variant.get('selectedOptions', []):
                    if option['name'].lower() == 'color':
                        color_set.add(option['value'])
            
            if color_set:
                has_color_option = True
                products_with_colors.append({
                    'title': product['title'],
                    'handle': product['handle'],
                    'colors': list(color_set)
                })
                continue
            
            # If no color options found
            if not has_color_option:
                products_without_colors.append({
                    'title': product['title'],
                    'handle': product['handle'],
                    'productType': product['productType'],
                    'tags': product['tags']
                })
        
        # Display results
        print("\n=== Products WITH Color Options ===")
        print(f"Total: {len(products_with_colors)}")
        for product in products_with_colors:
            print(f"- {product['title']} ({product['handle']})")
            print(f"  Colors: {', '.join(product['colors'])}")
        
        print("\n=== Products WITHOUT Color Options ===")
        print(f"Total: {len(products_without_colors)}")
        for product in products_without_colors:
            print(f"- {product['title']} ({product['handle']})")
            print(f"  Type: \"{product['productType']}\", Tags: {', '.join(product['tags'])}")
        
        print("\nSummary:")
        print(f"Total products: {len(products)}")
        print(f"Products with color options: {len(products_with_colors)}")
        print(f"Products without color options: {len(products_without_colors)}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error making API request: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    check_product_colors()
