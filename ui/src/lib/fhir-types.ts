// FHIR Types for the PersonResourceLinker component
// Imports from available FHIR type libraries based on version

import type { 
  Person as PersonR4, 
  Patient as PatientR4, 
  Practitioner as PractitionerR4, 
  RelatedPerson as RelatedPersonR4,
  Reference as ReferenceR4
} from '@medplum/fhirtypes';

// TODO: support multiple FHIR versions in the future
// TODO: dont use custom types for FHIR resources, use the existing libraries only
// Re-export types with version-agnostic names for FHIR resources
export type Person = PersonR4;
export type Patient = PatientR4;
export type Practitioner = PractitionerR4;
export type RelatedPerson = RelatedPersonR4;
export type Reference = ReferenceR4;

// Custom types for our UI that extend FHIR concepts
export type LinkedResourceType = 'Patient' | 'Practitioner' | 'RelatedPerson';

export type AssuranceLevel = 'level1' | 'level2' | 'level3' | 'level4';

export interface ServerInfo {
  serverName: string;
  version: string;
  baseUrl: string;
  fhirVersion?: string;
}

// Custom PersonLink interface for our UI (not the FHIR PersonLink)
export interface CustomPersonLink {
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

export interface PersonResource {
  id: string;
  display: string;
  serverInfo: ServerInfo;
  links: CustomPersonLink[];
}

// Utility function to validate FHIR reference format
export function validateFhirReference(reference: string, expectedResourceType: LinkedResourceType): boolean {
  if (!reference || !expectedResourceType) {
    return false;
  }

  // Check if reference follows the pattern: ResourceType/id
  const referencePattern = new RegExp(`^${expectedResourceType}\\/[a-zA-Z0-9\\-\\.]+$`);
  return referencePattern.test(reference);
}

// Type mapping for different FHIR versions
// For now, we default to R4 types. In the future, this could be extended
// to support conditional type mapping based on FHIR version
