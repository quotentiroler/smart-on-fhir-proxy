export interface FhirPersonAssociation {
  serverName: string;
  personId: string;
  display?: string;
  created?: string;
}

export interface HealthcareUser {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  organization: string;
  enabled: boolean;
  realmRoles: string[];
  clientRoles: { [client: string]: string[] };
  primaryRole: string;
  fhirPersons: FhirPersonAssociation[];
  createdAt: string;
  lastLogin?: string;
}

export interface FhirServer {
  name: string;
  baseUrl: string;
  enabled: boolean;
}
