# Google Maps Integration Issues - Technical Analysis & Fix Plan

## Overview
The restaurant details page is experiencing two primary issues:
1. **Location map not displaying properly** - Shows "Oops! Something went wrong" error
2. **Business hours showing "Hours not available"** - Missing proper hours data structure

## Problem Analysis

### 1. API Key Issues
**Status**: ❌ **CRITICAL ISSUE IDENTIFIED**
- **Client-side**: Hardcoded API key `AIzaSyCPTS0slU5KnKal2T_fWtO7XaGAYM78_5U` in `client/src/utils/loadGoogleMaps.ts`
- **Console Error**: "Google Maps JavaScript API error: ExpiredKeyMapError" 
- **Server-side**: Using `process.env.GOOGLE_MAPS_API_KEY` environment variable (working correctly)
- **Root Cause**: The hardcoded client-side API key has expired, causing map initialization failures

### 2. Data Flow Problems
**Status**: ❌ **MISSING COORDINATE DATA**

#### Current Data Structure Issues:
- **AI Concierge Service** (`server/aiConciergeService.ts`):
  - ✅ Fetches place details from Google Places API including `location: { latitude, longitude }`
  - ❌ **BUG**: Does NOT include coordinates in the `RestaurantRecommendation` object passed to frontend
  - ❌ **BUG**: Opening hours structure is incomplete (`open_now` only, missing full schedule)

#### Restaurant Data Missing Fields:
```typescript
// Current enriched restaurant structure (INCOMPLETE)
const enrichedRestaurant: RestaurantRecommendation = {
  // ... other fields
  openingHours: details.regularOpeningHours ? {
    open_now: details.regularOpeningHours.openNow  // ❌ INCOMPLETE
  } : null,
  // ❌ MISSING: latitude/longitude coordinates
  // ❌ MISSING: Full opening hours structure
};
```

### 3. Component Integration Issues
**Status**: ❌ **TYPE MISMATCHES**

#### GoogleMapComponent Problems:
- **RestaurantInfo Component** (`client/src/components/RestaurantInfo.tsx` line 400):
  - Passing invalid `address` prop to `GoogleMapComponent`
  - `GoogleMapComponent` expects `center: {lat, lng}` and `markers` array
  - ❌ No geocoding functionality to convert address to coordinates

#### TypeScript Errors:
1. Line 400: `address` property doesn't exist on `GoogleMapComponentProps`
2. Line 183: `getWebsiteLinkText()` expects 0 arguments, receiving 1
3. Lines 318/288-377: Type mismatches with groups data and React nodes

### 4. Missing Geocoding Service
**Status**: ❌ **FUNCTIONALITY GAP**
- No client-side geocoding service found (`client/src/services/geocoding.ts` doesn't exist)
- Server has geocoding in `server/routes.ts` but not exposed as utility
- No address-to-coordinates conversion for map display

## Google Places API Data Structure Analysis

### Available Data from Google Places API:
```typescript
interface PlaceDetails {
  // ✅ AVAILABLE - Currently used
  id: string;
  displayName: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  
  // ❌ AVAILABLE BUT NOT USED - Missing coordinates
  location?: {
    latitude: number;   // ← CRITICAL for map display
    longitude: number;  // ← CRITICAL for map display
  };
  
  // ❌ AVAILABLE BUT INCOMPLETE - Missing full hours structure
  regularOpeningHours?: {
    openNow?: boolean;
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close: { day: number; hour: number; minute: number };
    }>;
    weekdayDescriptions?: string[];  // ← CRITICAL for hours display
  };
}
```

## Fix Plan

### Phase 1: API Key Management ⚡ **URGENT**
**Priority**: CRITICAL - Fixes immediate map loading errors

1. **Standardize API Key Usage**:
   - Remove hardcoded API key from `client/src/utils/loadGoogleMaps.ts`
   - Use environment variable approach consistently
   - Add API key validation and error handling

2. **Update loadGoogleMaps.ts**:
   ```typescript
   // Replace hardcoded key with environment variable or server-provided key
   const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 
                  await fetchApiKeyFromServer();
   ```

### Phase 2: Data Structure Enhancement 🔧
**Priority**: HIGH - Enables proper map and hours display

1. **Enhance AI Concierge Service** (`server/aiConciergeService.ts`):
   ```typescript
   // Add missing fields to RestaurantRecommendation
   const enrichedRestaurant: RestaurantRecommendation = {
     // ... existing fields
     
     // ✅ ADD: Coordinates for map display
     latitude: details.location?.latitude,
     longitude: details.location?.longitude,
     
     // ✅ ADD: Complete opening hours structure
     openingHours: details.regularOpeningHours ? {
       open_now: details.regularOpeningHours.openNow,
       weekdayDescriptions: details.regularOpeningHours.weekdayDescriptions,
       periods: details.regularOpeningHours.periods
     } : null,
   };
   ```

2. **Update Restaurant Interface** (`client/src/pages/RestaurantDetails.tsx`):
   ```typescript
   interface Restaurant {
     // ... existing fields
     latitude?: number;    // ✅ ADD
     longitude?: number;   // ✅ ADD
     openingHours?: {      // ✅ ENHANCE
       open_now?: boolean;
       weekdayDescriptions?: string[];
       periods?: Array<{
         open: { day: number; hour: number; minute: number };
         close: { day: number; hour: number; minute: number };
       }>;
     };
   }
   ```

### Phase 3: Component Integration Fixes 🏗️
**Priority**: HIGH - Connects data to display components

1. **Fix RestaurantInfo Component** (`client/src/components/RestaurantInfo.tsx`):
   ```typescript
   // Replace line 396-402 with proper coordinate handling
   {displayAddress && restaurant.latitude && restaurant.longitude ? (
     <GoogleMapComponent
       center={{ lat: restaurant.latitude, lng: restaurant.longitude }}
       markers={[{
         position: { lat: restaurant.latitude, lng: restaurant.longitude },
         title: restaurant.name,
         info: `${restaurant.name}<br/>${displayAddress}`
       }]}
       zoom={15}
       className="w-full h-64 rounded-lg"
     />
   ) : (
     // Fallback with geocoding or placeholder
   )}
   ```

2. **Enhance Hours Display**:
   ```typescript
   function formatBusinessHours(openingHours: any): string {
     if (!openingHours?.weekdayDescriptions) return 'Hours not available';
     return openingHours.weekdayDescriptions.join('\n');
   }
   ```

### Phase 4: Geocoding Fallback Service 🗺️
**Priority**: MEDIUM - Provides backup for missing coordinates

1. **Create Geocoding Utility** (`client/src/services/geocoding.ts`):
   ```typescript
   export class GeocodingService {
     static async geocodeAddress(address: string): Promise<{lat: number, lng: number} | null> {
       // Use Google Geocoding API to convert address to coordinates
       // Fallback for restaurants without coordinate data
     }
   }
   ```

### Phase 5: Error Handling & Validation 🛡️
**Priority**: MEDIUM - Improves reliability

1. **Add Map Error Handling**:
   - Graceful fallback when coordinates unavailable
   - Retry logic for failed geocoding requests
   - User-friendly error messages

2. **Validate Data Flow**:
   - Ensure coordinate data persists through sessionStorage
   - Add type guards for required fields
   - Log missing data for debugging

## Implementation Sequence

1. ⚡ **Fix API key** (immediate - solves "ExpiredKeyMapError")
2. 🔧 **Add coordinates to data flow** (AI Concierge → Restaurant object)
3. 🔧 **Enhance opening hours structure** (complete weekdayDescriptions)
4. 🏗️ **Update RestaurantInfo component** (use coordinates for map)
5. 🏗️ **Fix TypeScript errors** (proper prop types)
6. 🗺️ **Add geocoding fallback** (for edge cases)
7. 🛡️ **Improve error handling** (user experience)

## Expected Results

### After Fix:
- ✅ **Location Map**: Displays restaurant location with proper marker
- ✅ **Business Hours**: Shows complete weekly schedule from Google Places data
- ✅ **Error Resolution**: No more "ExpiredKeyMapError" or map loading failures
- ✅ **Type Safety**: All TypeScript errors resolved
- ✅ **Data Flow**: Complete restaurant data including coordinates and hours

### Technical Validation:
1. Restaurant details page loads map with correct coordinates
2. Business hours section displays full weekly schedule
3. Map marker shows restaurant name and address in info window
4. No console errors related to Google Maps API
5. Proper fallback handling when coordinate data unavailable

## Risk Assessment

### Low Risk Changes:
- API key standardization
- Data structure enhancement
- Component prop fixes

### Medium Risk Areas:
- sessionStorage data format changes (may affect existing cached data)
- Google Maps API quota usage (additional geocoding calls)

### Mitigation Strategies:
- Clear sessionStorage cache after data structure changes
- Implement rate limiting for geocoding requests  
- Add feature flags for new functionality rollout

---

*This analysis identifies the root causes of both the map display and business hours issues, providing a comprehensive fix plan that addresses API key management, data flow problems, and component integration issues.*