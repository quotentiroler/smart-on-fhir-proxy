import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  X,
  Plus,
  Edit,
  AlertCircle,
  Sparkles,
  Zap,
  Code2,
  Layers,
  Target,
  Lightbulb,
  Rocket,
  Wand2
} from 'lucide-react';

// Resources available for launch context (per SMART on FHIR 2.2.0 spec)
const LAUNCH_RESOURCES = ['patient', 'encounter', 'practitioner', 'location', 'organization', 'diagnosticreport', 'imagingstudy', 'list', 'questionnaire'];

// Common SMART scopes that are often used with launch contexts
const COMMON_SMART_SCOPES = [
  'openid',
  'fhirUser', 
  'profile',
  'offline_access',
  'online_access',
  'launch',
  'launch/patient',
  'launch/encounter'
];

interface ContextSet {
  id: string;
  name: string;
  description?: string;
  contexts: string[];
  category?: string;
  createdAt: string;
  updatedAt: string;
  isTemplate: boolean;
}

interface LaunchContextSetBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSet?: ContextSet | null;
  onSave: (contextSet: Omit<ContextSet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function LaunchContextSetBuilder({
  open,
  onOpenChange,
  editingSet,
  onSave,
  onCancel
}: LaunchContextSetBuilderProps) {
  const [contextSet, setContextSet] = useState<{
    name: string;
    description: string;
    category: string;
    contexts: string[];
  }>({
    name: '',
    description: '',
    category: '',
    contexts: []
  });

  const [builderState, setBuilderState] = useState<{
    resource: string;
    role: string;
    customScope: string;
  }>({ resource: '', role: '', customScope: '' });

  const [error, setError] = useState<string | null>(null);
  const [activeBuilder, setActiveBuilder] = useState<'quick' | 'custom'>('quick');

  // Reset form when editing set changes
  useEffect(() => {
    if (editingSet) {
      setContextSet({
        name: editingSet.name,
        description: editingSet.description || '',
        category: editingSet.category || '',
        contexts: [...editingSet.contexts]
      });
    } else {
      setContextSet({ name: '', description: '', category: '', contexts: [] });
    }
    setBuilderState({ resource: '', role: '', customScope: '' });
    setError(null);
  }, [editingSet]);

  // Validate scope format
  const validateScope = (scope: string): { valid: boolean; message: string; type: 'error' | 'warning' | 'success' } => {
    if (!scope.trim()) {
      return { valid: false, message: 'Scope cannot be empty', type: 'error' };
    }

    const trimmedScope = scope.trim();

    // Check for common SMART launch scopes
    const commonScopes = ['openid', 'profile', 'fhirUser', 'offline_access', 'online_access', 'launch'];
    if (commonScopes.includes(trimmedScope)) {
      return { valid: true, message: `Valid SMART scope: ${trimmedScope}`, type: 'success' };
    }

    // Check for launch context scopes
    const launchContextPattern = /^launch\/(patient|encounter|practitioner|location|organization|diagnosticreport|imagingstudy|list|questionnaire)(\?.*)?$/;
    if (launchContextPattern.test(trimmedScope)) {
      return { valid: true, message: `Valid launch context scope: ${trimmedScope}`, type: 'success' };
    }

    // Check for FHIR resource scopes
    const fhirScopePattern = /^(patient|user|system)\/([\w*]+)\.([cruds]+)(\?.*)?$/;
    if (fhirScopePattern.test(trimmedScope)) {
      return { valid: true, message: `Valid FHIR resource scope: ${trimmedScope}`, type: 'success' };
    }

    return { valid: false, message: 'Invalid scope format', type: 'error' };
  };

  // Build a launch context scope string
  const buildScope = () => {
    const { resource, role, customScope } = builderState;
    if (customScope.trim()) return customScope.trim();
    if (!resource) return '';
    let scope = `launch/${resource}`;
    if (role.trim()) {
      scope += `?role=${encodeURIComponent(role.trim())}`;
    }
    return scope;
  };

  // Add a scope to the current context set
  const addScope = () => {
    const scope = buildScope();
    if (scope && !contextSet.contexts.includes(scope)) {
      const validation = validateScope(scope);
      if (!validation.valid) {
        setError(`Invalid scope: ${validation.message}`);
        return;
      }
      setContextSet({
        ...contextSet,
        contexts: [...contextSet.contexts, scope]
      });
      setBuilderState({ resource: '', role: '', customScope: '' });
      setError(null);
    }
  };

  // Add a common scope
  const addCommonScope = (scope: string) => {
    if (!contextSet.contexts.includes(scope)) {
      setContextSet({
        ...contextSet,
        contexts: [...contextSet.contexts, scope]
      });
    }
  };

  // Remove a scope from the current context set
  const removeScope = (index: number) => {
    setContextSet({
      ...contextSet,
      contexts: contextSet.contexts.filter((_, i) => i !== index)
    });
  };

  // Handle save
  const handleSave = () => {
    if (!contextSet.name.trim() || contextSet.contexts.length === 0) return;
    
    onSave({
      name: contextSet.name.trim(),
      description: contextSet.description.trim(),
      category: contextSet.category.trim(),
      contexts: contextSet.contexts,
      isTemplate: false
    });
  };

  // Handle cancel
  const handleCancel = () => {
    setContextSet({ name: '', description: '', category: '', contexts: [] });
    setBuilderState({ resource: '', role: '', customScope: '' });
    setError(null);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center shadow-sm">
              <Rocket className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900 tracking-tight">
                {editingSet ? 'Edit Launch Context Set' : 'Create Launch Context Set'}
              </DialogTitle>
              <DialogDescription className="text-gray-600 font-medium mt-1">
                Configure launch contexts for SMART on FHIR applications. These determine what contextual information is available during app launch.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-6 p-6 bg-blue-50/50 rounded-xl border border-blue-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 tracking-tight">Basic Information</h4>
                <p className="text-gray-600 text-sm font-medium">Define the context set name, description, and category</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="context-name" className="text-sm font-semibold text-gray-700">
                  Context Set Name *
                </Label>
                <Input
                  id="context-name"
                  value={contextSet.name}
                  onChange={e => setContextSet({ ...contextSet, name: e.target.value })}
                  placeholder="e.g., Emergency Department Launch, Radiology Workflow"
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="context-description" className="text-sm font-semibold text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="context-description"
                  value={contextSet.description}
                  onChange={e => setContextSet({ ...contextSet, description: e.target.value })}
                  placeholder="Describe when this context set should be used and what it enables..."
                  rows={3}
                  className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="context-category" className="text-sm font-semibold text-gray-700">
                  Category
                </Label>
                <select
                  id="context-category"
                  value={contextSet.category}
                  onChange={e => setContextSet({ ...contextSet, category: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                >
                  <option value="">Select Category</option>
                  <option value="ehr-launch">🏥 EHR Launch</option>
                  <option value="standalone">📱 Standalone</option>
                  <option value="workflow">⚡ Workflow</option>
                  <option value="specialty">🔬 Specialty</option>
                  <option value="data-collection">📊 Data Collection</option>
                  <option value="identity">🔐 Identity</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scope Builder */}
          <div className="space-y-6 p-6 bg-green-50/50 rounded-xl border border-green-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center shadow-sm">
                <Wand2 className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900 tracking-tight">Scope Builder</h4>
                <p className="text-gray-600 text-sm font-medium">Add SMART scopes and launch contexts to this set</p>
              </div>
            </div>
            
            {/* Builder Type Selector */}
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant={activeBuilder === 'quick' ? 'default' : 'outline'}
                onClick={() => setActiveBuilder('quick')}
                className={activeBuilder === 'quick' 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800' 
                  : 'rounded-xl border-gray-300 hover:bg-green-50'
                }
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Add
              </Button>
              <Button
                size="sm"
                variant={activeBuilder === 'custom' ? 'default' : 'outline'}
                onClick={() => setActiveBuilder('custom')}
                className={activeBuilder === 'custom' 
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800' 
                  : 'rounded-xl border-gray-300 hover:bg-green-50'
                }
              >
                <Code2 className="w-4 h-4 mr-2" />
                Custom Builder
              </Button>
            </div>

            {activeBuilder === 'quick' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Common SMART Scopes
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SMART_SCOPES.map(scope => (
                      <Button
                        key={scope}
                        size="sm"
                        variant="outline"
                        onClick={() => addCommonScope(scope)}
                        disabled={contextSet.contexts.includes(scope)}
                        className="text-xs rounded-xl border-gray-300 hover:bg-green-50 hover:border-green-300 disabled:opacity-50 shadow-sm font-mono"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {scope}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeBuilder === 'custom' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Build Launch Context
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={builderState.resource}
                      onChange={e => setBuilderState({ ...builderState, resource: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-gray-300 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                    >
                      <option value="">Select Resource</option>
                      {LAUNCH_RESOURCES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Role URI (optional)"
                      value={builderState.role}
                      onChange={e => setBuilderState({ ...builderState, role: e.target.value })}
                      className="text-sm rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500 shadow-sm"
                    />
                    <div className="md:col-span-2">
                      <Button 
                        onClick={addScope} 
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                        disabled={!builderState.resource && !builderState.customScope.trim()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Launch Context
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-gray-700 flex items-center">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Or Enter Custom Scope
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="e.g., patient/Observation.rs, user/*.cruds, launch/patient"
                      value={builderState.customScope}
                      onChange={e => setBuilderState({ ...builderState, customScope: e.target.value })}
                      className="text-sm rounded-xl border-gray-300 focus:border-green-500 focus:ring-green-500 shadow-sm"
                      onKeyPress={e => e.key === 'Enter' && addScope()}
                    />
                    <Button 
                      onClick={addScope}
                      className="bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-sm hover:shadow-md"
                      disabled={!builderState.customScope.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Error display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Current Scopes */}
          <div className="space-y-6 p-6 bg-purple-50/50 rounded-xl border border-purple-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Target className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900 tracking-tight">
                    Current Scopes ({contextSet.contexts.length})
                  </h4>
                  <p className="text-gray-600 text-sm font-medium">Review and manage selected scopes</p>
                </div>
              </div>
              {contextSet.contexts.length > 0 && (
                <Badge className="bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300 shadow-sm">
                  {contextSet.contexts.length} configured
                </Badge>
              )}
            </div>
            
            <div className="max-h-40 overflow-y-auto border border-purple-200/50 rounded-xl p-4 bg-white/70 backdrop-blur-sm shadow-sm">
              {contextSet.contexts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-sm">
                    <Target className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No scopes added yet</p>
                  <p className="text-xs text-gray-400 mt-1">Add scopes using the builder above</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {contextSet.contexts.map((ctx, index) => (
                    <Badge 
                      key={ctx} 
                      variant="outline" 
                      className="flex items-center bg-white shadow-sm hover:shadow-md transition-all duration-200 border-purple-200 text-purple-800 rounded-lg font-mono text-xs"
                    >
                      <span>{ctx}</span>
                      <X 
                        className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" 
                        onClick={() => removeScope(index)} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-3 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-8 py-3 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!contextSet.name.trim() || contextSet.contexts.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingSet ? (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Update Context Set
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Context Set
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
