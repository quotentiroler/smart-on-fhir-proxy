#!/usr/bin/env python3
"""
Shared data model and schema definitions for AI-powered code proposals.
This ensures consistency across propose, review, and apply steps for both frontend and backend.
Supports code implementations, changes, and fixes.
"""

from typing import Dict, List, Literal

# Main JSON schema for all AI code proposal operations
AI_PROPOSE_RESPONSE_SCHEMA = {
    "type": "object", 
    "properties": {
        "analysis": {
            "type": "string",
            "description": "Analysis of the task or requirements"
        },
        "changes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["modify", "create"],
                        "description": "Whether to modify existing file or create new file"
                    },
                    "file": {
                        "type": "string",
                        "description": "Path to the file (from repo root)"
                    },
                    "search": {
                        "type": "string",
                        "description": "Exact text to search for and replace (required for modify action, use empty string for create action)"
                    },
                    "replace": {
                        "type": "string",
                        "description": "Text to replace the search text with (for modify) or full file content (for create)"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Description of what this change does and why"
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Confidence level in this change"
                    }
                },
                "required": ["action", "file", "search", "replace", "reasoning", "confidence"],
                "additionalProperties": False
            }
        }
    },
    "required": ["analysis", "changes"],
    "additionalProperties": False
}


def get_openai_payload_base(model: str = "gpt-5") -> Dict:
    """Get base OpenAI API payload structure."""
    return {
        "model": model,
        "messages": [],  # To be filled by caller
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": "ai_proposals",
                "strict": True,
                "schema": AI_PROPOSE_RESPONSE_SCHEMA
            }
        }
    }


def get_propose_payload_base(model: str = "gpt-5") -> Dict:
    """Get base OpenAI API payload structure for propose step."""
    return get_openai_payload_base(model)


def get_common_headers(api_key: str) -> Dict:
    """Get common headers for OpenAI API requests."""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }


def create_system_message(component: Literal["frontend", "backend"], 
                         step: Literal["propose", "review", "apply"]) -> str:
    """Create consistent system messages for different components and steps."""
    
    base_expertise = {
        "frontend": "TypeScript/React frontend applications",
        "backend": "TypeScript/Node.js backend applications"
    }
    
    step_guidance = {
        "propose": "Analyze requirements and propose code implementations/changes/fixes. Be creative and suggest multiple approaches even if uncertain - a senior AI will review your proposals.",
        "review": "Review and refine proposed code changes from a junior AI. Be critical and thorough - only approve changes you're confident will work. You can modify, reject, or completely rewrite proposed changes.",
        "apply": "Apply code changes directly to files based on reviewed and approved proposals."
    }
    
    path_guidance = {
        "frontend": "File paths in the project are relative to the ui/ folder. When providing file_path, include the full path from repository root (e.g., 'ui/src/file.tsx' not 'src/file.tsx').",
        "backend": "File paths in the project are relative to the backend/ folder. When providing file_path, include the full path from repository root (e.g., 'backend/src/file.ts' not 'src/file.ts')."
    }
    
    return f"""You are a code implementation assistant specialized in {base_expertise[component]}. {step_guidance[step]} Always return valid JSON with changes array, even if empty. IMPORTANT: {path_guidance[component]} Focus on {component}-specific issues and best practices.

🔧 TOOL CALL FORMAT REQUIREMENTS:
- When calling tools, use ONLY valid JSON format: {{"parameter": "value"}}
- NO additional text, NO explanations, NO multi-language text in tool calls
- If JSON parsing fails, the tool call will be skipped
- Example: list_directory({{"path": "ui/src"}}) ✅
- NEVER: list_directory({{"path": "ui/src", corrupted text}}) ❌

🧠 RAG-ENHANCED EXPLORATION STRATEGY:
- Use semantic_search tool for finding related code patterns, similar implementations, and best practices
- Combine exploration tools efficiently: semantic_search → read_file → find_usage for comprehensive understanding
- Use RAG (semantic search) to find examples before creating new implementations

CRITICAL IMPLEMENTATION PATTERNS:
- For modifying existing files: Use action="modify" with exact search patterns from the codebase
- For creating new files: Use action="create" with full file content in replace field
- For search text, include complete property chains and context for precise matching

COMMON SCENARIOS REQUIRING NEW FILES:
- Missing type definition files (.d.ts)
- Missing configuration files (tsconfig.json, etc.)
- Missing test files when implementing new features
- Missing component files referenced by imports
- Missing utility/helper files that are imported but don't exist

💡 EFFICIENCY TIPS:
- Use semantic_search("test setup framework") to find existing test patterns before creating new ones
- Use semantic_search("error handling") to find error patterns and solutions
- Combine multiple exploration tools in sequence for deep understanding
- Synthesize findings early rather than endless exploration"""


def create_user_content_base(component: Literal["frontend", "backend"], 
                           content: str, 
                           step: Literal["propose", "review"]) -> str:
    """Create consistent user content for different components and steps."""
    
    component_details = {
        "frontend": {
            "path_context": "File paths should be from repository root (e.g., 'ui/src/file.tsx').",
            "focus_areas": [
                "React component implementation",
                "TypeScript compilation in JSX/TSX files", 
                "Import/export management",
                "State management solutions",
                "API client integration",
                "UI library integration",
                "Build tool configuration",
                "Testing setup and implementation",
                "Component styling and theming"
            ]
        },
        "backend": {
            "path_context": "File paths should be from repository root (e.g., 'backend/src/file.ts').",
            "focus_areas": [
                "TypeScript implementation",
                "Import/export management",
                "Type definitions and interfaces", 
                "Node.js/Express/Fastify development",
                "Database/ORM integration",
                "API route implementation",
                "Testing setup and implementation",
                "Authentication and authorization",
                "Configuration management"
            ]
        }
    }
    
    step_prefix = {
        "propose": f"Implement the following {component} requirements",
        "review": f"Review and refine these proposed {component} changes"
    }
    
    details = component_details[component]
    focus_list = "\n".join(f"- {area}" for area in details["focus_areas"])
    
    user_content = f"""{step_prefix[step]}. This is the {component} part of a monorepo. {details["path_context"]}

REQUIREMENTS/TASK:
{content}

Focus on {component}-specific implementation like:
{focus_list}

CRITICAL IMPLEMENTATION INSTRUCTIONS:
1. For MODIFYING existing files:
   - Use action="modify" 
   - Extract EXACT search patterns from existing code context
   - Include complete property chains and sufficient context for precise matching

2. For CREATING new files:
   - Use action="create"
   - Put full file content in replace field
   - Common cases: new components, new utilities, new configuration files, new tests

3. File paths must be from repository root (e.g., '{component}/src/file.ts')"""
    
    return user_content
