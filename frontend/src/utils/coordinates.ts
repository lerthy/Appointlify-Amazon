/**
 * Extracts coordinates from a Google Maps URL
 * Supports various Google Maps URL formats:
 * - https://www.google.com/maps/place/.../@lat,lng,zoom/...
 * - https://maps.google.com/?q=lat,lng
 * - https://www.google.com/maps/search/?api=1&query=lat,lng
 * 
 * @param url - The Google Maps URL
 * @returns Object with lat and lng as strings, or null if not found
 */
export function extractCoordinates(url: string): { lat: string; lng: string } | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Pattern 1: @lat,lng format (most common in place URLs)
  // Example: https://www.google.com/maps/place/.../@42.6517112,21.1566974,17z/...
  const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const atMatch = url.match(atPattern);
  if (atMatch) {
    return {
      lat: atMatch[1],
      lng: atMatch[2]
    };
  }

  // Pattern 2: q=lat,lng format
  // Example: https://maps.google.com/?q=42.6517112,21.1566974
  const qPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const qMatch = url.match(qPattern);
  if (qMatch) {
    return {
      lat: qMatch[1],
      lng: qMatch[2]
    };
  }

  // Pattern 3: query=lat,lng format
  // Example: https://www.google.com/maps/search/?api=1&query=42.6517112,21.1566974
  const queryPattern = /[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const queryMatch = url.match(queryPattern);
  if (queryMatch) {
    return {
      lat: queryMatch[1],
      lng: queryMatch[2]
    };
  }

  // Pattern 4: ll=lat,lng format (legacy)
  const llPattern = /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
  const llMatch = url.match(llPattern);
  if (llMatch) {
    return {
      lat: llMatch[1],
      lng: llMatch[2]
    };
  }

  return null;
}

/**
 * Validates if coordinates are valid
 * @param coords - Object with lat and lng
 * @returns true if coordinates are valid
 */
export function isValidCoordinates(coords: { lat: string; lng: string } | null): boolean {
  if (!coords) return false;
  
  const lat = parseFloat(coords.lat);
  const lng = parseFloat(coords.lng);
  
  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}







