import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Edit,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Copy,
  MoreHorizontal,
  Target,
  User,
  Users,
  Building,
  Stethoscope,
  FileText,
  Search,
  Shield,
  Database,
  Settings,
  Server
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Common launch intents
const LAUNCH_INTENTS = [
  'patient-chart',
  'patient-demographics',
  'patient-summary',
  'encounter-chart',
  'provider-order',
  'provider-summary',
  'population-health',
  'quality-reporting',
  'care-management',
  'clinical-decision-support'
];

// Common context types
const CONTEXT_TYPES = [
  'Patient',
  'Encounter',
  'Practitioner',
  'Organization',
  'Location',
  'EpisodeOfCare',
  'RelatedPerson'
];

// Launch context configuration interface
interface LaunchContext {
  id: string;
  name: string;
  description: string;
  intent: string;
  fhirContext: {
    type: string;
    reference: string;
    display?: string;
  }[];
  requiredScopes: string[];
  optionalScopes: string[];
  needPatientBanner: boolean;
  needEncounterContext: boolean;
  smartStyleUrl?: string;
  parameters?: Record<string, string>;
  // FHIR server associations
  fhirServerName?: string; // Primary server (for server-specific contexts)
  supportedServers: string[]; // All servers that support this context
  serverScope?: 'global' | 'server-specific'; // Context scope
  createdBy: string;
  createdAt: string;
  lastModified: string;
  isActive: boolean;
}

// Sample FHIR servers for demonstration
const sampleFhirServers = [
  { name: 'Epic Production', baseUrl: 'https://fhir.epic.com/interconnect-fhir-oauth', status: 'active' },
  { name: 'Cerner Sandbox', baseUrl: 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d', status: 'active' },
  { name: 'SMART Health IT', baseUrl: 'https://launch.smarthealthit.org/v/r4/fhir', status: 'active' },
  { name: 'HAPI FHIR Server', baseUrl: 'https://hapi.fhir.org/baseR4', status: 'active' },
  { name: 'Test Server', baseUrl: 'http://localhost:8080/fhir', status: 'development' }
];

// Sample launch contexts for demonstration
const sampleLaunchContexts: LaunchContext[] = [
  {
    id: 'sample-1',
    name: 'Patient Chart Review',
    description: 'Launch context for reviewing a specific patient\'s complete medical chart with full read access',
    intent: 'patient-chart',
    fhirContext: [
      { type: 'Patient', reference: 'Patient/example-patient-123', display: 'John Doe (DOB: 1985-03-15)' }
    ],
    requiredScopes: ['openid', 'profile', 'launch', 'patient/*.read'],
    optionalScopes: ['user/*.read', 'offline_access'],
    needPatientBanner: true,
    needEncounterContext: false,
    smartStyleUrl: 'https://example-ehr.com/smart-styles.json',
    parameters: { theme: 'clinical', view: 'comprehensive' },
    fhirServerName: 'Epic Production',
    supportedServers: ['Epic Production', 'Cerner Sandbox', 'HAPI FHIR Server'],
    serverScope: 'global',
    createdBy: 'Dr. Sarah Johnson',
    createdAt: '2024-01-15T10:30:00Z',
    lastModified: '2024-02-20T14:45:00Z',
    isActive: true
  },
  {
    id: 'sample-2',
    name: 'Emergency Department Triage',
    description: 'Quick patient assessment context for emergency department with encounter-specific information',
    intent: 'encounter-chart',
    fhirContext: [
      { type: 'Patient', reference: 'Patient/emergency-patient-456', display: 'Jane Smith (Emergency)' },
      { type: 'Encounter', reference: 'Encounter/ed-visit-789', display: 'ED Visit - Chest Pain' },
      { type: 'Practitioner', reference: 'Practitioner/dr-wilson-101', display: 'Dr. Michael Wilson' }
    ],
    requiredScopes: ['openid', 'profile', 'launch', 'patient/*.read', 'user/Practitioner.read'],
    optionalScopes: ['patient/*.write', 'user/Observation.write'],
    needPatientBanner: true,
    needEncounterContext: true,
    smartStyleUrl: '',
    parameters: { priority: 'urgent', department: 'emergency' },
    fhirServerName: 'Epic Production',
    supportedServers: ['Epic Production', 'Cerner Sandbox'],
    serverScope: 'server-specific',
    createdBy: 'ED Charge Nurse',
    createdAt: '2024-02-01T08:15:00Z',
    lastModified: '2024-02-15T16:20:00Z',
    isActive: true
  },
  {
    id: 'sample-3',
    name: 'Medication Management',
    description: 'Comprehensive medication review and management for pharmacy consultation',
    intent: 'provider-order',
    fhirContext: [
      { type: 'Patient', reference: 'Patient/med-patient-789', display: 'Robert Chen (Age: 67)' },
      { type: 'Practitioner', reference: 'Practitioner/pharmacist-202', display: 'PharmD Lisa Chang' }
    ],
    requiredScopes: ['openid', 'profile', 'launch', 'patient/MedicationRequest.read', 'patient/MedicationStatement.read', 'user/Practitioner.read'],
    optionalScopes: ['patient/MedicationRequest.write', 'patient/AllergyIntolerance.read', 'offline_access'],
    needPatientBanner: true,
    needEncounterContext: false,
    smartStyleUrl: 'https://pharmacy-ehr.com/medication-styles.json',
    parameters: { focus: 'medications', alerts: 'enabled' },
    fhirServerName: '',
    supportedServers: ['Epic Production', 'Cerner Sandbox', 'SMART Health IT', 'HAPI FHIR Server'],
    serverScope: 'global',
    createdBy: 'Pharmacy Director',
    createdAt: '2024-01-20T13:45:00Z',
    lastModified: '2024-03-01T11:30:00Z',
    isActive: true
  },
  {
    id: 'sample-4',
    name: 'Population Health Dashboard',
    description: 'Aggregate view for monitoring population health metrics and quality measures',
    intent: 'population-health',
    fhirContext: [
      { type: 'Organization', reference: 'Organization/hospital-main', display: 'General Hospital Main Campus' },
      { type: 'Practitioner', reference: 'Practitioner/quality-manager-303', display: 'Dr. Amanda Rodriguez (Quality Manager)' }
    ],
    requiredScopes: ['openid', 'profile', 'launch', 'user/*.read'],
    optionalScopes: ['system/*.read'],
    needPatientBanner: false,
    needEncounterContext: false,
    smartStyleUrl: '',
    parameters: { dashboard: 'quality', timeframe: '30days' },
    fhirServerName: 'Epic Production',
    supportedServers: ['Epic Production'],
    serverScope: 'server-specific',
    createdBy: 'Quality Assurance Team',
    createdAt: '2024-02-10T09:00:00Z',
    lastModified: '2024-02-25T15:15:00Z',
    isActive: true
  },
  {
    id: 'sample-5',
    name: 'Care Team Collaboration',
    description: 'Multi-disciplinary team access for coordinated care planning and communication',
    intent: 'care-management',
    fhirContext: [
      { type: 'Patient', reference: 'Patient/care-patient-321', display: 'Maria Garcia (Diabetes Care Plan)' },
      { type: 'Encounter', reference: 'Encounter/care-visit-654', display: 'Care Plan Review' },
      { type: 'Practitioner', reference: 'Practitioner/care-coordinator-404', display: 'RN Jennifer Adams (Care Coordinator)' }
    ],
    requiredScopes: ['openid', 'profile', 'launch', 'patient/*.read', 'user/CareTeam.read', 'user/CarePlan.read'],
    optionalScopes: ['patient/CarePlan.write', 'patient/Goal.write', 'user/Communication.write'],
    needPatientBanner: true,
    needEncounterContext: true,
    smartStyleUrl: 'https://care-platform.com/team-styles.json',
    parameters: { team: 'diabetes-care', collaboration: 'enabled' },
    fhirServerName: '',
    supportedServers: ['Epic Production', 'Cerner Sandbox', 'SMART Health IT'],
    serverScope: 'global',
    createdBy: 'Care Coordination Team',
    createdAt: '2024-01-25T11:20:00Z',
    lastModified: '2024-02-28T10:45:00Z',
    isActive: true
  },
  {
    id: 'sample-6',
    name: 'Clinical Decision Support',
    description: 'Context for launching clinical decision support tools with real-time patient data integration',
    intent: 'clinical-decision-support',
    fhirContext: [
      { type: 'Patient', reference: 'Patient/cds-patient-987', display: 'David Thompson (Risk Assessment)' },
      { type: 'Practitioner', reference: 'Practitioner/attending-505', display: 'Dr. Kevin Park (Attending Physician)' }
    ],
    requiredScopes: ['openid', 'profile', 'launch', 'patient/Observation.read', 'patient/Condition.read', 'patient/MedicationRequest.read'],
    optionalScopes: ['patient/RiskAssessment.write', 'user/Practitioner.read'],
    needPatientBanner: true,
    needEncounterContext: false,
    smartStyleUrl: '',
    parameters: { cds: 'cardiovascular-risk', alerts: 'high-priority' },
    fhirServerName: 'SMART Health IT',
    supportedServers: ['SMART Health IT', 'HAPI FHIR Server'],
    serverScope: 'server-specific',
    createdBy: 'Clinical Informatics Team',
    createdAt: '2024-02-05T14:30:00Z',
    lastModified: '2024-03-05T12:00:00Z',
    isActive: false
  }
];

export function LaunchContextManager() {
  const { t } = useTranslation();
  const [contexts, setContexts] = useState<LaunchContext[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContext, setEditingContext] = useState<LaunchContext | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    intent: '',
    fhirContext: [{ type: 'Patient', reference: '', display: '' }],
    requiredScopes: ['openid', 'profile', 'launch'],
    optionalScopes: [] as string[],
    needPatientBanner: true,
    needEncounterContext: false,
    smartStyleUrl: '',
    parameters: {},
    // FHIR server associations
    fhirServerName: '',
    supportedServers: [] as string[],
    serverScope: 'global' as 'global' | 'server-specific'
  });

  // Load saved contexts from localStorage or initialize with samples
  useEffect(() => {
    const savedContexts = localStorage.getItem('smart-launch-contexts');
    if (savedContexts) {
      try {
        setContexts(JSON.parse(savedContexts));
      } catch (error) {
        console.error('Failed to parse saved contexts:', error);
        // If parsing fails, initialize with sample data
        setContexts(sampleLaunchContexts);
        localStorage.setItem('smart-launch-contexts', JSON.stringify(sampleLaunchContexts));
      }
    } else {
      // Initialize with sample data if no saved contexts exist
      setContexts(sampleLaunchContexts);
      localStorage.setItem('smart-launch-contexts', JSON.stringify(sampleLaunchContexts));
    }
  }, []);

  // Save contexts to localStorage
  const saveContexts = (newContexts: LaunchContext[]) => {
    localStorage.setItem('smart-launch-contexts', JSON.stringify(newContexts));
    setContexts(newContexts);
  };

  // Filter contexts based on search
  const filteredContexts = contexts.filter(context =>
    context.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    context.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    context.intent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add new context
  const handleAddContext = () => {
    const newContext: LaunchContext = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      intent: formData.intent,
      fhirContext: formData.fhirContext.filter(ctx => ctx.type && ctx.reference),
      requiredScopes: formData.requiredScopes,
      optionalScopes: formData.optionalScopes,
      needPatientBanner: formData.needPatientBanner,
      needEncounterContext: formData.needEncounterContext,
      smartStyleUrl: formData.smartStyleUrl,
      parameters: formData.parameters,
      // FHIR server associations
      fhirServerName: formData.fhirServerName,
      supportedServers: formData.supportedServers || [],
      serverScope: formData.serverScope || 'global',
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      isActive: true
    };

    saveContexts([...contexts, newContext]);
    setShowAddDialog(false);
    resetForm();
  };

  // Edit context
  const handleEditContext = (context: LaunchContext) => {
    setEditingContext(context);
    setFormData({
      name: context.name,
      description: context.description,
      intent: context.intent,
      fhirContext: context.fhirContext.length > 0 ? context.fhirContext.map(ctx => ({
        ...ctx,
        display: ctx.display || ''
      })) : [{ type: 'Patient', reference: '', display: '' }],
      requiredScopes: context.requiredScopes,
      optionalScopes: context.optionalScopes,
      needPatientBanner: context.needPatientBanner,
      needEncounterContext: context.needEncounterContext,
      smartStyleUrl: context.smartStyleUrl || '',
      parameters: context.parameters || {},
      // FHIR server associations
      fhirServerName: context.fhirServerName || '',
      supportedServers: context.supportedServers || [],
      serverScope: context.serverScope || 'global'
    });
    setShowAddDialog(true);
  };

  // Update context
  const handleUpdateContext = () => {
    if (!editingContext) return;

    const updatedContext: LaunchContext = {
      ...editingContext,
      name: formData.name,
      description: formData.description,
      intent: formData.intent,
      fhirContext: formData.fhirContext.filter(ctx => ctx.type && ctx.reference),
      requiredScopes: formData.requiredScopes,
      optionalScopes: formData.optionalScopes,
      needPatientBanner: formData.needPatientBanner,
      needEncounterContext: formData.needEncounterContext,
      smartStyleUrl: formData.smartStyleUrl,
      parameters: formData.parameters,
      // FHIR server associations
      fhirServerName: formData.fhirServerName,
      supportedServers: formData.supportedServers,
      serverScope: formData.serverScope,
      lastModified: new Date().toISOString()
    };

    const updatedContexts = contexts.map(ctx =>
      ctx.id === editingContext.id ? updatedContext : ctx
    );
    saveContexts(updatedContexts);
    setShowAddDialog(false);
    setEditingContext(null);
    resetForm();
  };

  // Delete context
  const handleDeleteContext = (id: string) => {
    const updatedContexts = contexts.filter(ctx => ctx.id !== id);
    saveContexts(updatedContexts);
  };

  // Toggle context active status
  const toggleContextStatus = (id: string) => {
    const updatedContexts = contexts.map(ctx =>
      ctx.id === id ? { ...ctx, isActive: !ctx.isActive } : ctx
    );
    saveContexts(updatedContexts);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      intent: '',
      fhirContext: [{ type: 'Patient', reference: '', display: '' }],
      requiredScopes: ['openid', 'profile', 'launch'],
      optionalScopes: [],
      needPatientBanner: true,
      needEncounterContext: false,
      smartStyleUrl: '',
      parameters: {},
      // FHIR server associations
      fhirServerName: '',
      supportedServers: [],
      serverScope: 'global' as 'global' | 'server-specific'
    });
  };

  // Add FHIR context
  const addFhirContext = () => {
    setFormData(prev => ({
      ...prev,
      fhirContext: [...prev.fhirContext, { type: 'Patient', reference: '', display: '' }]
    }));
  };

  // Remove FHIR context
  const removeFhirContext = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fhirContext: prev.fhirContext.filter((_, i) => i !== index)
    }));
  };

  // Update FHIR context
  const updateFhirContext = (index: number, field: keyof typeof formData.fhirContext[0], value: string) => {
    setFormData(prev => ({
      ...prev,
      fhirContext: prev.fhirContext.map((ctx, i) =>
        i === index ? { ...ctx, [field]: value } : ctx
      )
    }));
  };

  // Generate launch URL
  const generateLaunchUrl = (context: LaunchContext) => {
    const baseUrl = new URL(window.location.origin);
    baseUrl.pathname = '/launch';
    baseUrl.search = new URLSearchParams({
      launch: context.id,
      intent: context.intent,
      ...(context.parameters || {})
    }).toString();
    return baseUrl.toString();
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Get context icon based on type
  const getContextIcon = (type: string) => {
    switch (type) {
      case 'Patient': return <User className="w-4 h-4" />;
      case 'Encounter': return <Stethoscope className="w-4 h-4" />;
      case 'Practitioner': return <Users className="w-4 h-4" />;
      case 'Organization': return <Building className="w-4 h-4" />;
      case 'Location': return <Target className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100/50 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-6 lg:space-y-0">
          <div className="flex-1">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 tracking-tight">
              {t('Launch Context Configuration')}
            </h1>
            <div className="text-gray-600 text-lg flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mr-3 shadow-sm">
                <Play className="w-5 h-5 text-blue-600" />
              </div>
              {t('Configure SMART on FHIR launch contexts for different clinical scenarios')}
            </div>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button
                onClick={() => { resetForm(); setEditingContext(null); }}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('Add Launch Context')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
              <DialogHeader className="pb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Play className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                      {editingContext ? t('Edit Launch Context') : t('Add Launch Context')}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 font-medium mt-1">
                      {t('Configure a launch context for SMART on FHIR applications')}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-8">
                {/* Basic Information Card */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">{t('Basic Information')}</CardTitle>
                        <CardDescription className="text-gray-600 font-medium">{t('Name, intent, and description')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="context-name" className="text-sm font-semibold text-gray-700 mb-2 block">{t('Name')}</Label>
                        <Input
                          id="context-name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={t('e.g., Patient Chart Launch')}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="launch-intent" className="text-sm font-semibold text-gray-700 mb-2 block">{t('Launch Intent')}</Label>
                        <Select value={formData.intent} onValueChange={(value) => setFormData(prev => ({ ...prev, intent: value }))}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder={t('Select intent')} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {LAUNCH_INTENTS.map(intent => (
                              <SelectItem key={intent} value={intent}>{intent}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="context-description" className="text-sm font-semibold text-gray-700 mb-2 block">{t('Description')}</Label>
                      <Textarea
                        id="context-description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={t('Describe the launch context and its purpose')}
                        rows={3}
                        className="rounded-xl"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* FHIR Context Card */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                          <Database className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">{t('FHIR Context')}</CardTitle>
                          <CardDescription className="text-gray-600 font-medium">{t('Define the FHIR resources and references')}</CardDescription>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={addFhirContext} className="rounded-xl">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('Add Context')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.fhirContext.map((context, index) => (
                      <div key={index} className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Type')}</Label>
                            <Select
                              value={context.type}
                              onValueChange={(value) => updateFhirContext(index, 'type', value)}
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {CONTEXT_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Reference')}</Label>
                            <Input
                              value={context.reference}
                              onChange={(e) => updateFhirContext(index, 'reference', e.target.value)}
                              placeholder={t('Resource ID or reference')}
                              className="rounded-xl"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Display')}</Label>
                            <div className="flex space-x-2">
                              <Input
                                value={context.display}
                                onChange={(e) => updateFhirContext(index, 'display', e.target.value)}
                                placeholder={t('Display name (optional)')}
                                className="rounded-xl flex-1"
                              />
                              {formData.fhirContext.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeFhirContext(index)}
                                  className="rounded-xl px-3 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Scopes Card */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">{t('Scopes Configuration')}</CardTitle>
                        <CardDescription className="text-gray-600 font-medium">{t('Define required and optional SMART scopes')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Required Scopes')}</Label>
                        <Textarea
                          value={formData.requiredScopes.join(' ')}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            requiredScopes: e.target.value.split(' ').filter(s => s.trim())
                          }))}
                          placeholder={t('openid profile launch patient/*.read')}
                          rows={4}
                          className="rounded-xl font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">{t('Space-separated list of required scopes')}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Optional Scopes')}</Label>
                        <Textarea
                          value={formData.optionalScopes.join(' ')}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            optionalScopes: e.target.value.split(' ').filter(s => s.trim())
                          }))}
                          placeholder={t('user/*.read offline_access')}
                          rows={4}
                          className="rounded-xl font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-2">{t('Space-separated list of optional scopes')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Configuration Options Card */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                        <Settings className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">{t('Configuration Options')}</CardTitle>
                        <CardDescription className="text-gray-600 font-medium">{t('Additional context requirements and styling')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block">{t('Context Requirements')}</Label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50">
                            <input
                              type="checkbox"
                              id="needPatientBanner"
                              checked={formData.needPatientBanner}
                              onChange={(e) => setFormData(prev => ({ ...prev, needPatientBanner: e.target.checked }))}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="needPatientBanner" className="flex-1 text-sm font-medium text-gray-700">
                              {t('Need Patient Banner')}
                            </Label>
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50">
                            <input
                              type="checkbox"
                              id="needEncounterContext"
                              checked={formData.needEncounterContext}
                              onChange={(e) => setFormData(prev => ({ ...prev, needEncounterContext: e.target.checked }))}
                              className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="needEncounterContext" className="flex-1 text-sm font-medium text-gray-700">
                              {t('Need Encounter Context')}
                            </Label>
                            <Stethoscope className="w-4 h-4 text-gray-500" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="smartStyleUrl" className="text-sm font-semibold text-gray-700 mb-2 block">{t('SMART Style URL (Optional)')}</Label>
                        <Input
                          id="smartStyleUrl"
                          value={formData.smartStyleUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, smartStyleUrl: e.target.value }))}
                          placeholder={t('https://example.com/styles/smart-styles.json')}
                          className="rounded-xl"
                        />
                        <p className="text-xs text-gray-500 mt-2">{t('Custom styling for SMART applications')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* FHIR Server Association Card */}
                <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center shadow-sm">
                        <Server className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">{t('FHIR Server Association')}</CardTitle>
                        <CardDescription className="text-gray-600 font-medium">{t('Configure which FHIR servers support this context')}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold text-gray-700 mb-3 block">{t('Context Scope')}</Label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50">
                            <input
                              type="radio"
                              id="scopeGlobal"
                              name="serverScope"
                              value="global"
                              checked={formData.serverScope === 'global'}
                              onChange={(e) => setFormData(prev => ({ ...prev, serverScope: e.target.value as 'global' | 'server-specific' }))}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            <Label htmlFor="scopeGlobal" className="flex-1 text-sm font-medium text-gray-700">
                              {t('Global Context')}
                            </Label>
                            <div className="text-xs text-gray-500 bg-emerald-50 px-2 py-1 rounded-lg">
                              {t('All servers')}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-xl border border-gray-200/50">
                            <input
                              type="radio"
                              id="scopeSpecific"
                              name="serverScope"
                              value="server-specific"
                              checked={formData.serverScope === 'server-specific'}
                              onChange={(e) => setFormData(prev => ({ ...prev, serverScope: e.target.value as 'global' | 'server-specific' }))}
                              className="text-orange-600 focus:ring-orange-500"
                            />
                            <Label htmlFor="scopeSpecific" className="flex-1 text-sm font-medium text-gray-700">
                              {t('Server-Specific Context')}
                            </Label>
                            <div className="text-xs text-gray-500 bg-orange-50 px-2 py-1 rounded-lg">
                              {t('Selected servers')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {formData.serverScope === 'server-specific' && (
                          <div>
                            <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Primary FHIR Server')}</Label>
                            <Select value={formData.fhirServerName} onValueChange={(value) => setFormData(prev => ({ ...prev, fhirServerName: value }))}>
                              <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder={t('Select primary server')} />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {sampleFhirServers.map(server => (
                                  <SelectItem key={server.name} value={server.name}>{server.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t('Supported Servers')}</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {sampleFhirServers.map(server => (
                              <div key={server.name} className="flex items-center space-x-3 p-2 bg-gray-50/50 rounded-lg border border-gray-200/50">
                                <input
                                  type="checkbox"
                                  id={`server-${server.name}`}
                                  checked={formData.supportedServers.includes(server.name)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData(prev => ({ ...prev, supportedServers: [...prev.supportedServers, server.name] }));
                                    } else {
                                      setFormData(prev => ({ ...prev, supportedServers: prev.supportedServers.filter(s => s !== server.name) }));
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor={`server-${server.name}`} className="flex-1 text-sm font-medium text-gray-700">
                                  {server.name}
                                </Label>
                                <Badge variant="secondary" className="text-xs">
                                  {server.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="px-8 py-3 rounded-xl">
                    {t('Cancel')}
                  </Button>
                  <Button 
                    onClick={editingContext ? handleUpdateContext : handleAddContext}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {editingContext ? t('Update') : t('Create')} {t('Context')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Play className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-blue-800 tracking-wide">{t('Total Contexts')}</h3>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-2">{contexts.length}</div>
              <p className="text-sm text-blue-700 font-medium">{t('Launch contexts')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-green-800 tracking-wide">{t('Active Contexts')}</h3>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">{contexts.filter(c => c.isActive).length}</div>
              <p className="text-sm text-green-700 font-medium">{t('Currently enabled')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-sm font-semibold text-purple-800 tracking-wide">{t('Intent Types')}</h3>
              </div>
              <div className="text-3xl font-bold text-purple-900 mb-2">{new Set(contexts.map(c => c.intent)).size}</div>
              <p className="text-sm text-purple-700 font-medium">{t('Unique intents')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-sm font-semibold text-orange-800 tracking-wide">{t('Avg Scopes')}</h3>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-2">
                {contexts.length > 0 ? Math.round(contexts.reduce((sum, c) => sum + c.requiredScopes.length, 0) / contexts.length) : 0}
              </div>
              <p className="text-sm text-orange-700 font-medium">{t('Per context')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search Bar */}
      <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 shadow-lg">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl flex items-center justify-center shadow-sm">
            <Search className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">{t('Search Launch Contexts')}</h3>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('Search by name, description, or intent...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl shadow-sm border-gray-200 bg-white"
          />
        </div>
      </div>

      {/* Enhanced Context Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContexts.map((context) => (
            <Card key={context.id} className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">{context.name}</CardTitle>
                    <CardDescription className="mt-1 text-gray-600 font-medium">{context.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-xl">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl">
                      <DropdownMenuItem onClick={() => handleEditContext(context)}>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyToClipboard(generateLaunchUrl(context))}>
                        <Copy className="w-4 h-4 mr-2" />
                        {t('Copy Launch URL')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleContextStatus(context.id)}>
                        {context.isActive ? (
                          <>
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {t('Deactivate')}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t('Activate')}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteContext(context.id)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={context.isActive ? "default" : "secondary"}
                      className={context.isActive
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-gray-100 text-gray-800 border-gray-200"
                      }
                    >
                      {context.isActive ? t('Active') : t('Inactive')}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                      {context.intent}
                    </Badge>
                  </div>

                  {/* FHIR Context */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">{t('Context:')}</div>
                    <div className="space-y-1">
                      {context.fhirContext.map((ctx, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm bg-gray-50 p-2 rounded-lg">
                          {getContextIcon(ctx.type)}
                          <span className="text-gray-600 font-medium">{ctx.type}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-800 font-mono text-xs">{ctx.reference}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scopes */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">{t('Required Scopes:')}</div>
                    <div className="flex flex-wrap gap-1">
                      {context.requiredScopes.slice(0, 3).map((scope, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-purple-50 text-purple-800 border-purple-200">
                          {scope}
                        </Badge>
                      ))}
                      {context.requiredScopes.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-indigo-50 text-indigo-800 border-indigo-200">
                          +{context.requiredScopes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Configuration Flags */}
                  <div className="flex space-x-3 text-sm">
                    {context.needPatientBanner && (
                      <div className="flex items-center space-x-1 text-gray-600 bg-blue-50 px-2 py-1 rounded-lg">
                        <User className="w-3 h-3" />
                        <span className="font-medium">{t('Patient Banner')}</span>
                      </div>
                    )}
                    {context.needEncounterContext && (
                      <div className="flex items-center space-x-1 text-gray-600 bg-green-50 px-2 py-1 rounded-lg">
                        <Stethoscope className="w-3 h-3" />
                        <span className="font-medium">{t('Encounter')}</span>
                      </div>
                    )}
                  </div>

                  {/* FHIR Server Associations */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-2">{t('FHIR Server Support:')}</div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={context.serverScope === 'global' ? 'default' : 'secondary'}
                          className={context.serverScope === 'global' 
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                            : "bg-orange-100 text-orange-800 border-orange-200"
                          }
                        >
                          {context.serverScope === 'global' ? t('Global Context') : t('Server-Specific')}
                        </Badge>
                        {context.fhirServerName && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            {context.fhirServerName}
                          </Badge>
                        )}
                      </div>
                      {context.supportedServers.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {context.supportedServers.slice(0, 2).map((server, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                              {server}
                            </Badge>
                          ))}
                          {context.supportedServers.length > 2 && (
                            <Badge variant="secondary" className="text-xs bg-gray-50 text-gray-700 border-gray-200">
                              +{context.supportedServers.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-gray-500 pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="font-medium">{t('Created by {{user}}', { user: context.createdBy })}</span>
                      <span className="font-medium">{new Date(context.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enhanced Empty State */}
        {filteredContexts.length === 0 && (
          <div className="bg-white/70 backdrop-blur-sm p-12 rounded-2xl border border-gray-200/50 shadow-lg text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Play className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
              {searchTerm ? t('No contexts found') : t('No launch contexts yet')}
            </h3>
            <p className="text-gray-600 mb-6 font-medium max-w-md mx-auto">
              {searchTerm
                ? t('Try adjusting your search terms to find the context you\'re looking for')
                : t('Create your first launch context to enable SMART on FHIR application launches')
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setShowAddDialog(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('Add Launch Context')}
              </Button>
            )}
          </div>
        )}
      </div>
    
  );
}
