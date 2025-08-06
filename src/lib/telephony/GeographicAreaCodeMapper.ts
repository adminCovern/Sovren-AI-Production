/**
 * Geographic Area Code Mapping Service
 * Maps user locations to appropriate area codes for phone number provisioning
 */

export interface GeographicLocation {
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface AreaCodeInfo {
  areaCode: string;
  region: string;
  state: string;
  majorCities: string[];
  timezone: string;
  priority: number; // 1 = primary, 2 = secondary, etc.
}

export class GeographicAreaCodeMapper {
  private areaCodeDatabase: Map<string, AreaCodeInfo[]> = new Map();

  constructor() {
    this.initializeAreaCodeDatabase();
  }

  /**
   * Get area codes for a geographic location, ordered by preference
   */
  public async getAreaCodesForLocation(location: GeographicLocation): Promise<AreaCodeInfo[]> {
    try {
      // Parse location string if needed
      const parsedLocation = await this.parseLocationString(location);
      
      // Get area codes for state/region
      const stateCodes = this.areaCodeDatabase.get(parsedLocation.state?.toUpperCase()) || [];
      
      // Filter and sort by proximity to city
      const sortedCodes = await this.sortByProximity(stateCodes, parsedLocation);
      
      console.log(`📍 Found ${sortedCodes.length} area codes for ${parsedLocation.city}, ${parsedLocation.state}`);
      return sortedCodes;
      
    } catch (error) {
      console.error('Failed to get area codes for location:', error);
      // Fallback to default area codes
      return this.getDefaultAreaCodes();
    }
  }

  /**
   * Parse location string into structured format
   */
  private async parseLocationString(location: GeographicLocation): Promise<GeographicLocation> {
    // If already structured, return as-is
    if (location.state && location.city) {
      return location;
    }

    // Parse common formats like "Atlanta, GA" or "New York, NY"
    if (typeof location === 'string') {
      const parts = location.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        return {
          city: parts[0],
          state: parts[1],
          country: parts[2] || 'US'
        };
      }
    }

    return location;
  }

  /**
   * Sort area codes by proximity to user's city
   */
  private async sortByProximity(areaCodes: AreaCodeInfo[], location: GeographicLocation): Promise<AreaCodeInfo[]> {
    if (!location.city) {
      return areaCodes.sort((a, b) => a.priority - b.priority);
    }

    // Sort by whether the city is in majorCities list, then by priority
    return areaCodes.sort((a, b) => {
      const aCityMatch = a.majorCities.some(city => 
        city.toLowerCase().includes(location.city!.toLowerCase()) ||
        location.city!.toLowerCase().includes(city.toLowerCase())
      );
      const bCityMatch = b.majorCities.some(city => 
        city.toLowerCase().includes(location.city!.toLowerCase()) ||
        location.city!.toLowerCase().includes(city.toLowerCase())
      );

      if (aCityMatch && !bCityMatch) return -1;
      if (!aCityMatch && bCityMatch) return 1;
      
      return a.priority - b.priority;
    });
  }

  /**
   * Initialize comprehensive area code database
   */
  private initializeAreaCodeDatabase(): void {
    // Major US states and their area codes
    this.areaCodeDatabase.set('CA', [
      { areaCode: '213', region: 'Los Angeles', state: 'CA', majorCities: ['Los Angeles', 'Downtown LA'], timezone: 'America/Los_Angeles', priority: 1 },
      { areaCode: '310', region: 'West LA', state: 'CA', majorCities: ['Beverly Hills', 'Santa Monica', 'West Hollywood'], timezone: 'America/Los_Angeles', priority: 1 },
      { areaCode: '415', region: 'San Francisco', state: 'CA', majorCities: ['San Francisco'], timezone: 'America/Los_Angeles', priority: 1 },
      { areaCode: '510', region: 'East Bay', state: 'CA', majorCities: ['Oakland', 'Berkeley'], timezone: 'America/Los_Angeles', priority: 2 },
      { areaCode: '650', region: 'Peninsula', state: 'CA', majorCities: ['Palo Alto', 'San Mateo'], timezone: 'America/Los_Angeles', priority: 1 },
      { areaCode: '408', region: 'San Jose', state: 'CA', majorCities: ['San Jose', 'Cupertino'], timezone: 'America/Los_Angeles', priority: 1 }
    ]);

    this.areaCodeDatabase.set('NY', [
      { areaCode: '212', region: 'Manhattan', state: 'NY', majorCities: ['New York', 'Manhattan'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '646', region: 'Manhattan', state: 'NY', majorCities: ['New York', 'Manhattan'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '718', region: 'Outer Boroughs', state: 'NY', majorCities: ['Brooklyn', 'Queens', 'Bronx'], timezone: 'America/New_York', priority: 2 },
      { areaCode: '917', region: 'Mobile/NYC', state: 'NY', majorCities: ['New York'], timezone: 'America/New_York', priority: 2 }
    ]);

    this.areaCodeDatabase.set('TX', [
      { areaCode: '214', region: 'Dallas', state: 'TX', majorCities: ['Dallas'], timezone: 'America/Chicago', priority: 1 },
      { areaCode: '713', region: 'Houston', state: 'TX', majorCities: ['Houston'], timezone: 'America/Chicago', priority: 1 },
      { areaCode: '512', region: 'Austin', state: 'TX', majorCities: ['Austin'], timezone: 'America/Chicago', priority: 1 },
      { areaCode: '210', region: 'San Antonio', state: 'TX', majorCities: ['San Antonio'], timezone: 'America/Chicago', priority: 1 }
    ]);

    this.areaCodeDatabase.set('FL', [
      { areaCode: '305', region: 'Miami', state: 'FL', majorCities: ['Miami'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '407', region: 'Orlando', state: 'FL', majorCities: ['Orlando'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '813', region: 'Tampa', state: 'FL', majorCities: ['Tampa'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '954', region: 'Fort Lauderdale', state: 'FL', majorCities: ['Fort Lauderdale'], timezone: 'America/New_York', priority: 2 }
    ]);

    this.areaCodeDatabase.set('IL', [
      { areaCode: '312', region: 'Chicago', state: 'IL', majorCities: ['Chicago'], timezone: 'America/Chicago', priority: 1 },
      { areaCode: '773', region: 'Chicago', state: 'IL', majorCities: ['Chicago'], timezone: 'America/Chicago', priority: 1 }
    ]);

    this.areaCodeDatabase.set('GA', [
      { areaCode: '404', region: 'Atlanta', state: 'GA', majorCities: ['Atlanta'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '470', region: 'Atlanta Metro', state: 'GA', majorCities: ['Atlanta'], timezone: 'America/New_York', priority: 2 },
      { areaCode: '678', region: 'Atlanta Metro', state: 'GA', majorCities: ['Atlanta'], timezone: 'America/New_York', priority: 2 }
    ]);

    // Add more states as needed...
  }

  /**
   * Get default area codes for fallback
   */
  private getDefaultAreaCodes(): AreaCodeInfo[] {
    return [
      { areaCode: '800', region: 'Toll-Free', state: 'US', majorCities: ['National'], timezone: 'America/New_York', priority: 1 },
      { areaCode: '888', region: 'Toll-Free', state: 'US', majorCities: ['National'], timezone: 'America/New_York', priority: 2 }
    ];
  }

  /**
   * Validate area code availability
   */
  public async validateAreaCode(areaCode: string): Promise<boolean> {
    // Check if area code exists in our database
    for (const [state, codes] of this.areaCodeDatabase.entries()) {
      if (codes.some(code => code.areaCode === areaCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get area code info by code
   */
  public getAreaCodeInfo(areaCode: string): AreaCodeInfo | null {
    for (const [state, codes] of this.areaCodeDatabase.entries()) {
      const found = codes.find(code => code.areaCode === areaCode);
      if (found) return found;
    }
    return null;
  }
}
