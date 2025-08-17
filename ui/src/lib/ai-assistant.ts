import OpenAI from 'openai';
import { pipeline, env } from '@xenova/transformers';

// Disable local model cache in browser environment
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Types for the knowledge base and RAG system
export interface DocumentChunk {
  id: string;
  content: string;
  source: string;
  title: string;
  category: string;
  relevanceScore?: number;
}

export interface RAGResponse {
  answer: string;
  sources: DocumentChunk[];
  confidence: number;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  sources?: DocumentChunk[];
}

class SmartOnFHIRAIAssistant {
  private openai: OpenAI | null = null;
  private knowledgeBase: DocumentChunk[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private embeddingPipeline: any = null;
  private isEmbeddingModelLoading = false;
  
  constructor() {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey && apiKey !== 'your-openai-api-key-here') {
      this.openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
      });
    }
    this.initializeKnowledgeBase();
    // Don't auto-initialize embedding model - wait for first use
    // this.initializeEmbeddingModel();
  }

  private async initializeEmbeddingModel() {
    if (this.isEmbeddingModelLoading || this.embeddingPipeline) return;
    
    try {
      this.isEmbeddingModelLoading = true;
      console.log('Loading sentence transformer model...');
      
      // Use a lightweight model for browser deployment
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      
      console.log('Sentence transformer model loaded successfully');
    } catch (error) {
      console.warn('Failed to load embedding model, falling back to keyword search:', error);
      this.embeddingPipeline = null;
    } finally {
      this.isEmbeddingModelLoading = false;
    }
  }

  private async initializeKnowledgeBase() {
    // Initialize the knowledge base with documentation content
    this.knowledgeBase = [
      // Dashboard Documentation
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        category: 'admin-ui',
        source: 'docs/admin-ui/dashboard.md',
        content: `The Dashboard is the central hub providing comprehensive overview of healthcare platform status, metrics, and quick access to all management functions. It displays real-time system health indicators including active components (OAuth Server, FHIR Proxy, WebSocket), performance metrics, alerts, and last update timestamps. The dashboard provides quick actions for adding users, registering apps, adding FHIR servers, configuring scopes, managing launch contexts, and monitoring OAuth flows.`
      },
      
      // User Management
      {
        id: 'user-management-overview',
        title: 'User Management',
        category: 'admin-ui',
        source: 'docs/admin-ui/user-management.md',
        content: `User Management provides comprehensive tools for managing healthcare users including practitioners, administrative staff, system users, and external users. It supports user registration with personal details, professional info, and account configuration. Key features include FHIR Person associations across multiple servers, role-based access control with administrator and user roles, user activity tracking, and lifecycle management including activation, password management, and termination.`
      },
      
      // SMART Apps
      {
        id: 'smart-apps-management',
        title: 'SMART Apps Management',
        category: 'admin-ui',
        source: 'docs/admin-ui/smart-apps.md',
        content: `SMART Apps section manages SMART on FHIR applications including patient-facing apps, provider apps, EHR integrated apps, research apps, agent apps, and backend services. It supports EHR launch, standalone launch, backend services, and agent launch types. Application registration includes basic information, technical configuration, and scope configuration with FHIR resource scopes for patient, user, system, and agent contexts.`
      },
      
      // SMART on FHIR Concepts
      {
        id: 'smart-app-launch-framework',
        title: 'SMART App Launch Framework',
        category: 'smart-on-fhir',
        source: 'docs/smart-on-fhir/smart-app-launch.md',
        content: `SMART App Launch Framework enables secure integration of healthcare applications with EHR systems using OAuth 2.0. It supports different launch types: EHR launch from within EHR systems, standalone launch for independent applications, and backend services for server-to-server communication. The framework provides clinical context through launch parameters including patient, encounter, user, and organization context.`
      },
      
      // OAuth Flows
      {
        id: 'oauth-flows',
        title: 'OAuth 2.0 Flows',
        category: 'smart-on-fhir',
        source: 'docs/smart-on-fhir/oauth-flows.md',
        content: `OAuth 2.0 flows in SMART on FHIR include Authorization Code flow for interactive applications, Client Credentials flow for backend services, and Agent flow for autonomous systems. Each flow has specific security requirements including PKCE for public clients, client authentication for confidential clients, and scope validation for resource access control.`
      },
      
      // Scopes and Permissions
      {
        id: 'scopes-permissions',
        title: 'Scopes and Permissions',
        category: 'smart-on-fhir',
        source: 'docs/smart-on-fhir/scopes-permissions.md',
        content: `SMART scopes define access permissions for FHIR resources using context prefixes: patient/ for patient-specific data, user/ for user-accessible resources, system/ for system-wide access, and agent/ for autonomous agent access. Scopes include resource type and operation (read, write, cruds). Examples: patient/Patient.read, user/Observation.read, system/Patient.cruds, agent/Device.read.`
      },
      
      // Launch Contexts
      {
        id: 'launch-contexts',
        title: 'Launch Contexts',
        category: 'smart-on-fhir',
        source: 'docs/smart-on-fhir/launch-contexts.md',
        content: `Launch contexts provide clinical workflow context to SMART applications. Context types include patient context (specific patient, patient list, encounter, episode), provider context (practitioner, care team, organization, location), and workflow context (order entry, results review, documentation, research). Contexts are injected via launch parameters during application initialization.`
      },
      
      // Agent Scopes
      {
        id: 'agent-scopes',
        title: 'Agent Scopes for Autonomous Systems',
        category: 'smart-on-fhir',
        source: 'docs/smart-on-fhir/agent-scopes.md',
        content: `Agent scopes (agent/) are designed for autonomous systems including AI assistants, robots, and automated decision tools. Unlike system/ scopes which are deterministic and scheduled, agent/ scopes support non-deterministic, self-initiated actions. Agent identity is resolved to Device resources at runtime. Examples: agent/Patient.read for AI patient analysis, agent/ClinicalImpression.write for AI-generated assessments.`
      },
      
      // Identity Providers
      {
        id: 'identity-providers',
        title: 'Identity Providers Management',
        category: 'admin-ui',
        source: 'docs/admin-ui/identity-providers.md',
        content: `Identity Providers (IdP) section manages authentication systems for healthcare organizations. Supports SAML 2.0 for enterprise SSO, OpenID Connect (OIDC) for modern OAuth-based authentication, LDAP for directory services, and local authentication. Features include SSO endpoint configuration, metadata import/export, user attribute mapping for FHIR Person associations, role-based access control, group mappings, multi-factor authentication (MFA) requirements, and session management. Enables seamless integration with existing organizational authentication infrastructure.`
      },
      
      // Platform Administration
      {
        id: 'platform-navigation',
        title: 'Platform Navigation and Features',
        category: 'admin-ui',
        source: 'docs/admin-ui/navigation.md',
        content: `The platform provides comprehensive navigation with sections for Dashboard (system overview), SMART Apps (application management), Users (healthcare user management), FHIR Servers (server configuration), Identity Providers (IdP management), Scope Management (permission templates), Launch Context (context configuration), and OAuth Monitoring (real-time analytics). Each section provides specialized tools for healthcare platform administration.`
      },
      
      // Getting Started Guide
      {
        id: 'getting-started-guide',
        title: 'Getting Started with SMART on FHIR Platform',
        category: 'tutorials',
        source: 'docs/tutorials/getting-started.md',
        content: `Getting started guide covers platform setup and configuration. Key steps: 1) Review Dashboard for system health, 2) Configure FHIR servers with base URL and authentication, 3) Set up identity providers (SAML, OIDC), 4) Create user accounts and associate with FHIR Person resources, 5) Register SMART apps with scopes and launch contexts, 6) Test OAuth flows and FHIR access. Includes security best practices, monitoring setup, and go-live checklist. Use AI Assistant for help with specific tasks.`
      },
      
      // FHIR Servers
      {
        id: 'fhir-servers-management',
        title: 'FHIR Servers Management',
        category: 'admin-ui',
        source: 'docs/admin-ui/fhir-servers.md',
        content: `FHIR Servers section manages FHIR server connections, health monitoring, and configuration. Supports EHR systems (Epic, Cerner), cloud FHIR services, open source servers, and test environments. Features include server registration with base URL and FHIR version, authentication methods (API key, OAuth 2.0, client certificates), health monitoring with real-time checks, performance metrics tracking, and security settings. Provides bulk data operations, SMART launch context support, and comprehensive troubleshooting tools.`
      },
      
      // Scope Management
      {
        id: 'scope-management-detailed',
        title: 'Scope Management and Permissions',
        category: 'admin-ui',
        source: 'docs/admin-ui/scope-management.md',
        content: `Scope Management provides granular FHIR resource permissions using context/resource.operations pattern. Context prefixes include patient/ (patient-specific), user/ (user-accessible), system/ (backend system), and agent/ (autonomous AI). Common resources include Patient, Observation, MedicationRequest, DiagnosticReport, Condition, Procedure. Operations are read, write, cruds, search. Features role-based templates for clinical roles (physicians, nurses) and administrative roles, custom template creation, organizational scope management, and compliance reporting.`
      },
      {
        id: 'common-administrative-tasks',
        title: 'Common Administrative Tasks',
        category: 'tutorials',
        source: 'docs/tutorials/common-tasks.md',
        content: `Common tasks include: 1) Registering SMART apps with appropriate scopes and launch contexts, 2) Adding healthcare users and associating with FHIR Person resources, 3) Configuring FHIR servers with health monitoring, 4) Setting up scope templates for different user roles, 5) Creating launch contexts for clinical workflows, 6) Monitoring OAuth flows for troubleshooting, 7) Managing identity providers for authentication.`
      },
      
      // Troubleshooting
      {
        id: 'troubleshooting-guide',
        title: 'Troubleshooting Common Issues',
        category: 'tutorials',
        source: 'docs/tutorials/troubleshooting.md',
        content: `Common issues and solutions: 1) OAuth authorization failures - check redirect URIs, scopes, and client configuration, 2) FHIR server connectivity - verify endpoints, certificates, and network access, 3) User authentication problems - check IdP configuration and user status, 4) Application launch failures - verify launch contexts and required parameters, 5) Scope access denied - review user permissions and application scopes, 6) Performance issues - check system health and resource utilization.`
      }
    ];
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Get embedding for text using the sentence transformer
   */
  private async getEmbedding(text: string): Promise<number[] | null> {
    if (!this.embeddingPipeline) {
      await this.initializeEmbeddingModel();
    }
    
    if (!this.embeddingPipeline) {
      return null;
    }

    try {
      const result = await this.embeddingPipeline(text, {
        pooling: 'mean',
        normalize: true
      });
      
      // Convert tensor to array
      return Array.from(result.data);
    } catch (error) {
      console.warn('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Enhanced search using semantic similarity when available
   */
  private async searchKnowledgeBaseSemantic(query: string, maxResults: number = 5): Promise<DocumentChunk[]> {
    // Try semantic search first if embedding model is available
    if (this.embeddingPipeline && !this.isEmbeddingModelLoading) {
      try {
        const queryEmbedding = await this.getEmbedding(query);
        
        if (queryEmbedding) {
          const scoredDocs = await Promise.all(
            this.knowledgeBase.map(async (doc) => {
              const docEmbedding = await this.getEmbedding(doc.content.substring(0, 500));
              if (docEmbedding) {
                const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
                return { ...doc, relevanceScore: similarity };
              }
              return { ...doc, relevanceScore: 0 };
            })
          );

          return scoredDocs
            .filter(doc => doc.relevanceScore! > 0.3) // Threshold for semantic similarity
            .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
            .slice(0, maxResults);
        }
      } catch (error) {
        console.warn('Semantic search failed, falling back to keyword search:', error);
      }
    }

    // Fallback to keyword-based search
    return this.searchKnowledgeBase(query, maxResults);
  }
  private searchKnowledgeBase(query: string, maxResults: number = 5): DocumentChunk[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    const scoredDocuments = this.knowledgeBase.map(doc => {
      let score = 0;
      const content = doc.content.toLowerCase();
      const title = doc.title.toLowerCase();
      
      // Score based on title matches (higher weight)
      searchTerms.forEach(term => {
        if (title.includes(term)) {
          score += 10;
        }
        // Count occurrences in content
        const matches = (content.match(new RegExp(term, 'g')) || []).length;
        score += matches;
      });
      
      return { ...doc, relevanceScore: score };
    });
    
    return scoredDocuments
      .filter(doc => doc.relevanceScore! > 0)
      .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
      .slice(0, maxResults);
  }

  /**
   * Generate AI response using RAG (Retrieval Augmented Generation)
   */
  async generateResponse(userMessage: string): Promise<RAGResponse> {
    // Search for relevant documents using semantic search when available
    const relevantDocs = await this.searchKnowledgeBaseSemantic(userMessage);
    
    try {
      // If no relevant documents found, provide general help
      if (relevantDocs.length === 0) {
        return {
          answer: "I can help you with SMART on FHIR platform administration. I have knowledge about:\n\n" +
                  "📊 **Dashboard** - System overview and health monitoring\n" +
                  "👥 **User Management** - Healthcare users and FHIR associations\n" +
                  "📱 **SMART Apps** - Application registration and management\n" +
                  "🏥 **FHIR Servers** - Server configuration and monitoring\n" +
                  "🎯 **Scope Management** - Permissions and access control\n" +
                  "🚀 **Launch Context** - Clinical workflow contexts\n" +
                  "📈 **OAuth Monitoring** - Real-time flow analytics\n" +
                  "🔑 **Identity Providers** - Authentication configuration\n\n" +
                  "What would you like to know more about?",
          sources: [],
          confidence: 0.5
        };
      }

      // If OpenAI is available, use it for enhanced responses
      if (this.openai) {
        const context = relevantDocs
          .map(doc => `Source: ${doc.title}\nRelevance: ${(doc.relevanceScore! * 100).toFixed(1)}%\n${doc.content}`)
          .join('\n\n');

        const systemPrompt = `You are a SMART on FHIR platform assistant with comprehensive knowledge of healthcare application management. Use the provided context to answer questions accurately and helpfully.

Key platform sections:
- Dashboard: System overview and health monitoring
- User Management: Healthcare users and FHIR Person associations  
- SMART Apps: Application registration with scopes and launch contexts
- FHIR Servers: Multi-server configuration and monitoring
- Scope Management: Permission templates and access control
- Launch Context: Clinical workflow context injection
- OAuth Monitoring: Real-time authorization flow analytics
- Identity Providers: SAML/OIDC authentication configuration

Provide helpful, accurate responses with step-by-step guidance when appropriate. Include relevant navigation instructions (e.g., "Go to the Users section") and mention specific features when relevant.

Context (with relevance scores):
${context}`;

        const completion = await this.openai.chat.completions.create({
          model: "gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          max_tokens: 600,
          temperature: 0.7
        });

        return {
          answer: completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.",
          sources: relevantDocs,
          confidence: 0.9
        };
      } else {
        // Enhanced rule-based responses when OpenAI is not available
        // Use the most relevant document for context-aware responses
        return this.generateRuleBasedResponse(userMessage, relevantDocs);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.generateRuleBasedResponse(userMessage, relevantDocs);
    }
  }

  /**
   * Enhanced rule-based response system with semantic context
   */
  private generateRuleBasedResponse(userMessage: string, relevantDocs: DocumentChunk[]): RAGResponse {
    const message = userMessage.toLowerCase();
    const confidence = relevantDocs.length > 0 ? Math.max(0.7, relevantDocs[0].relevanceScore || 0.7) : 0.6;
    
    // Use the most relevant document for context-aware responses
    const primaryDoc = relevantDocs.length > 0 ? relevantDocs[0] : null;
    
    // Navigation and general help
    if (message.includes('navigate') || message.includes('go to') || message.includes('section')) {
      if (message.includes('user') || message.includes('healthcare')) {
        return {
          answer: "To manage healthcare users, go to the **Users** section in the navigation. There you can:\n\n" +
                  "• Add new healthcare users with professional details\n" +
                  "• Associate users with FHIR Person resources across multiple servers\n" +
                  "• Configure role-based permissions and access control\n" +
                  "• Monitor user activity, sessions, and login patterns\n" +
                  "• Manage user lifecycle from activation to termination\n\n" +
                  "💡 *Tip: Each user can have FHIR Person associations on multiple servers for cross-system identity linking.*",
          sources: relevantDocs,
          confidence
        };
      } else if (message.includes('app') || message.includes('smart')) {
        return {
          answer: "To manage SMART applications, go to the **SMART Apps** section. Here you can:\n\n" +
                  "• Register new SMART on FHIR applications with detailed configuration\n" +
                  "• Configure OAuth scopes for granular resource access control\n" +
                  "• Set up launch contexts for different clinical workflows\n" +
                  "• Monitor application usage, performance, and error rates\n" +
                  "• Manage application lifecycle, versions, and security settings\n\n" +
                  "🔑 *Key: Proper scope configuration is crucial for security and functionality.*",
          sources: relevantDocs,
          confidence
        };
      } else if (message.includes('server') || message.includes('fhir')) {
        return {
          answer: "To manage FHIR servers, go to the **FHIR Servers** section. You can:\n\n" +
                  "• Add and configure FHIR server endpoints with authentication\n" +
                  "• Monitor server health, performance, and response times\n" +
                  "• Test server connectivity and validate FHIR compliance\n" +
                  "• Configure security settings and access controls\n" +
                  "• View usage analytics and troubleshoot issues\n\n" +
                  "🏥 *Multi-server support allows unified management across your healthcare ecosystem.*",
          sources: relevantDocs,
          confidence
        };
      }
    }
    
    // Identity Provider queries (add this before scope-related queries)
    if (message.includes('idp') || message.includes('identity') || message.includes('authentication') || message.includes('provider')) {
      return {
        answer: "To manage Identity Providers, go to the **Identity Providers** section. Here you can:\n\n" +
                "🔐 **Supported Protocols:**\n" +
                "• **SAML 2.0** - Enterprise single sign-on integration\n" +
                "• **OpenID Connect (OIDC)** - Modern OAuth-based authentication\n" +
                "• **LDAP** - Directory service integration\n" +
                "• **Local Authentication** - Platform-native user accounts\n\n" +
                "⚙️ **Configuration Options:**\n" +
                "• SSO endpoint configuration and metadata import\n" +
                "• User attribute mapping for FHIR Person associations\n" +
                "• Role-based access control and group mappings\n" +
                "• Multi-factor authentication (MFA) requirements\n\n" +
                "🏥 *Identity providers enable seamless integration with existing healthcare organization authentication systems.*",
        sources: relevantDocs,
        confidence
      };
    }

    // Scope-related queries with enhanced context
    if (message.includes('scope') || message.includes('permission')) {
      let scopeInfo = "SMART scopes control access to FHIR resources. Go to **Scope Management** to configure:\n\n" +
                     "🎯 **Scope Contexts:**\n" +
                     "• **patient/** - Patient-specific data access (e.g., patient/Patient.read)\n" +
                     "• **user/** - User-accessible resources (e.g., user/Observation.read)\n" +
                     "• **system/** - System-wide access (e.g., system/Patient.cruds)\n" +
                     "• **agent/** - Autonomous agent access (e.g., agent/Device.read)\n\n" +
                     "📋 **Scope Templates:**\n" +
                     "• Role-based templates for different user types\n" +
                     "• Specialty-specific scope combinations\n" +
                     "• Custom scope sets for organizational needs";
      
      if (primaryDoc && primaryDoc.title.includes('Scope')) {
        scopeInfo += "\n\n💡 *Based on the documentation, scopes use CRUD operations (Create, Read, Update, Delete, Search) with 'cruds' for full access.*";
      }
      
      return {
        answer: scopeInfo,
        sources: relevantDocs,
        confidence
      };
    }
    
    // Launch context queries with enhanced information
    if (message.includes('launch') || message.includes('context')) {
      let contextInfo = "Launch contexts provide clinical workflow context to applications. Go to **Launch Context** to:\n\n" +
                       "🏥 **Clinical Contexts:**\n" +
                       "• Patient contexts (patient selection, encounters, episodes)\n" +
                       "• Provider contexts (practitioner, care team, location)\n" +
                       "• Workflow contexts (order entry, results review, documentation)\n\n" +
                       "⚙️ **Configuration:**\n" +
                       "• Pre-configured workflow templates\n" +
                       "• Custom context builders for specific needs\n" +
                       "• Dynamic context resolution at runtime";
      
      if (primaryDoc && primaryDoc.title.includes('Launch')) {
        contextInfo += "\n\n🚀 *Launch contexts are injected as parameters during application initialization to provide immediate clinical relevance.*";
      }
      
      return {
        answer: contextInfo,
        sources: relevantDocs,
        confidence
      };
    }
    
    // OAuth and monitoring with real-time capabilities
    if (message.includes('oauth') || message.includes('monitor') || message.includes('flow')) {
      return {
        answer: "For OAuth monitoring and troubleshooting, go to **OAuth Monitoring** section:\n\n" +
                "📊 **Real-time Monitoring:**\n" +
                "• Live authorization flow tracking via WebSocket\n" +
                "• Success/failure rate analytics with trending\n" +
                "• Performance metrics and bottleneck identification\n" +
                "• Token usage patterns and refresh analytics\n\n" +
                "🔧 **Debugging Tools:**\n" +
                "• Flow-by-flow error analysis\n" +
                "• Security violation detection\n" +
                "• Integration testing capabilities\n\n" +
                "⚡ *The dashboard provides WebSocket-based real-time updates for immediate insight into OAuth activities.*",
        sources: relevantDocs,
        confidence
      };
    }
    
    // Dashboard queries with comprehensive features
    if (message.includes('dashboard') || message.includes('overview') || message.includes('status')) {
      return {
        answer: "The **Dashboard** provides comprehensive platform oversight:\n\n" +
                "🏥 **System Health:**\n" +
                "• OAuth Server, FHIR Proxy, WebSocket status monitoring\n" +
                "• Performance metrics with response time tracking\n" +
                "• Alert management and maintenance notifications\n\n" +
                "⚡ **Quick Actions:**\n" +
                "• One-click access to common administrative tasks\n" +
                "• Fast navigation to all platform sections\n\n" +
                "📈 **Analytics:**\n" +
                "• User, application, and server statistics\n" +
                "• OAuth flow analytics with trend visualization\n" +
                "• Real-time updates every 30 seconds\n\n" +
                "🎨 *Fully responsive design optimized for desktop, tablet, and mobile usage.*",
        sources: relevantDocs,
        confidence
      };
    }
    
    // Enhanced responses based on primary document context
    if (primaryDoc) {
      const response = this.generateContextualResponse(primaryDoc, userMessage);
      if (response) {
        return {
          answer: response,
          sources: relevantDocs,
          confidence
        };
      }
    }
    
    // Default response with knowledge base overview
    return {
      answer: "I'm your SMART on FHIR platform assistant! I can help you with:\n\n" +
              "🎯 **Platform Administration:**\n" +
              "• User management and FHIR associations\n" +
              "• SMART app registration and configuration\n" +
              "• FHIR server setup and monitoring\n" +
              "• OAuth flows and security management\n\n" +
              "📚 **Specific Topics:**\n" +
              "• Scope configuration and permissions\n" +
              "• Launch context setup for clinical workflows\n" +
              "• Identity provider integration\n" +
              "• System monitoring and troubleshooting\n\n" +
              `🤖 **AI Status:** ${this.openai ? 'OpenAI-powered' : 'Semantic search enabled'} ${this.embeddingPipeline ? 'with sentence transformers' : ''}\n\n` +
              "Ask me about any specific aspect you'd like to explore!",
      sources: relevantDocs,
      confidence: 0.6
    };
  }

  /**
   * Generate contextual response based on the most relevant document
   */
  private generateContextualResponse(doc: DocumentChunk, userMessage: string): string | null {
    const message = userMessage.toLowerCase();
    
    // Check for specific keywords in user message to provide targeted responses
    if (message.includes('idp') || message.includes('identity')) {
      return `Based on the Identity Provider documentation:\n\n` +
             "Identity Providers (IdPs) manage authentication for healthcare organizations. " +
             "The platform supports SAML 2.0, OpenID Connect (OIDC), LDAP, and local authentication. " +
             "Go to the **Identity Providers** section to configure SSO endpoints, user attribute mapping, " +
             "and role-based access control.\n\n" +
             "Would you like help setting up a specific IdP type or configuring user mappings?";
    }
    
    // Provide document-specific insights
    if (doc.category === 'admin-ui') {
      if (doc.title.includes('User')) {
        return `Based on the User Management documentation:\n\n${doc.content.substring(0, 300)}...\n\n` +
               "Would you like specific guidance on user registration, FHIR associations, or permission management?";
      } else if (doc.title.includes('SMART Apps')) {
        return `From the SMART Apps documentation:\n\n${doc.content.substring(0, 300)}...\n\n` +
               "Would you like help with app registration, scope configuration, or launch context setup?";
      }
    } else if (doc.category === 'smart-on-fhir') {
      if (doc.title.includes('OAuth')) {
        return `According to the OAuth flows documentation:\n\n${doc.content.substring(0, 300)}...\n\n` +
               "Need help with specific OAuth flows or troubleshooting authorization issues?";
      } else if (doc.title.includes('Agent')) {
        return `From the Agent Scopes documentation:\n\n${doc.content.substring(0, 300)}...\n\n` +
               "Interested in configuring autonomous systems or understanding agent vs system scopes?";
      }
    }
    
    return null;
  }

  /**
   * Check if OpenAI is available
   */
  isOpenAIAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Get knowledge base statistics
   */
  getKnowledgeBaseStats() {
    return {
      totalDocuments: this.knowledgeBase.length,
      categories: [...new Set(this.knowledgeBase.map(doc => doc.category))],
      sources: [...new Set(this.knowledgeBase.map(doc => doc.source))]
    };
  }
}

// Export singleton instance
export const aiAssistant = new SmartOnFHIRAIAssistant();
