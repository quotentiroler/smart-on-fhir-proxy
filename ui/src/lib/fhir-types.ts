// FHIR Types and Utilities for Dynamic Version Support

// FHIR Resource Types that can be linked to Person
export type LinkedResourceType = 'Patient' | 'Practitioner' | 'RelatedPerson';

// Identity Assurance Levels as per FHIR spec
export type AssuranceLevel = 'level1' | 'level2' | 'level3' | 'level4';

// Person Link interface - represents a link to another resource on the same FHIR server
export interface PersonLink {
  id: string;
  target: {
    resourceType: LinkedResourceType;
    reference: string;
    display?: string;
  };
  assurance: AssuranceLevel;
  created: string;
  notes?: string;
}

// Server information interface (matching backend structure)
export interface FhirServerInfo {
  identifier: string;
  displayName: string;
  baseUrl: string;
  status: 'healthy' | 'degraded' | 'error';
  accessible: boolean;
  version: string; // FHIR version like "R4", "R5", etc.
  serverName: string;
  serverVersion?: string;
}

// PersonResource interface that works with server's FHIR version
export interface PersonResource {
  id?: string;
  resourceType?: 'Person';
  serverInfo: FhirServerInfo;
  display: string;
  name?: Array<{
    family?: string;
    given?: string[];
    text?: string;
  }>;
  links: PersonLink[];
}

// Helper function to get version-specific capabilities
export function getFhirVersionCapabilities(version: string) {
  return {
    version,
    supportsAssuranceLevel: true,
    supportsPersonLinks: true,
    maxAssuranceLevel: 'level4' as AssuranceLevel,
    supportedResourceTypes: ['Patient', 'Practitioner', 'RelatedPerson'] as LinkedResourceType[],
  };
}

// Helper function to validate FHIR resource reference format
export function validateFhirReference(reference: string, resourceType: LinkedResourceType): boolean {
  const pattern = new RegExp(`^${resourceType}/[A-Za-z0-9\\-\\.]{1,64}$`);
  return pattern.test(reference);
}

// Helper function to format display name from FHIR name
export function formatFhirName(name?: Array<{ family?: string; given?: string[]; text?: string }>): string {
  if (!name || name.length === 0) {
    return 'Unknown Person';
  }

  const primaryName = name[0];
  
  if (primaryName.text) {
    return primaryName.text;
  }
  
  const parts: string[] = [];
  if (primaryName.given && primaryName.given.length > 0) {
    parts.push(...primaryName.given);
  }
  if (primaryName.family) {
    parts.push(primaryName.family);
  }
  
  return parts.length > 0 ? parts.join(' ') : 'Unknown Person';
}

// Helper function to create a FHIR-compliant Person resource
export function createPersonResource(
  serverInfo: FhirServerInfo,
  personData: Partial<PersonResource>
): PersonResource {
  return {
    id: personData.id || `person-${Date.now()}`,
    resourceType: 'Person',
    serverInfo,
    display: personData.display || formatFhirName(personData.name),
    name: personData.name || [],
    links: personData.links || [],
    ...personData,
  };
}
