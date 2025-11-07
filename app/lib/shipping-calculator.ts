/**
 * Shipping Cost Calculator
 *
 * Calculates shipping costs based on destination
 */

import { Address, FulfillmentOption } from './kv';

/**
 * Calculate available shipping options for an address
 *
 * TODO: Implement real shipping calculation (use Shippo API or static rates)
 */
export async function calculateShipping(address?: Address): Promise<FulfillmentOption[]> {
  // If no address, return empty array
  if (!address) {
    return [];
  }

  const options: FulfillmentOption[] = [];

  // TODO: Calculate based on address.country
  if (address.country === 'US') {
    // US Standard Shipping
    options.push({
      type: 'shipping',
      id: 'us_standard',
      title: 'Standard Shipping',
      subtitle: '3-7 business days',
      carrier_info: {
        name: 'USPS',
        tracking_available: true
      },
      subtotal: 795, // $7.95
      tax: 0, // Tax calculated separately
      total: 795
    });

    // US Expedited Shipping
    options.push({
      type: 'shipping',
      id: 'us_expedited',
      title: 'Expedited Shipping',
      subtitle: '2-3 business days',
      carrier_info: {
        name: 'FedEx',
        tracking_available: true
      },
      subtotal: 1595, // $15.95
      tax: 0,
      total: 1595
    });
  } else if (address.country === 'CA') {
    // Canada Shipping
    options.push({
      type: 'shipping',
      id: 'ca_standard',
      title: 'International Shipping',
      subtitle: '7-14 business days',
      carrier_info: {
        name: 'USPS',
        tracking_available: true
      },
      subtotal: 1295, // $12.95
      tax: 0,
      total: 1295
    });
  }

  return options;
}
