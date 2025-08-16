#!/usr/bin/env python3
"""
Shared data model and schema definitions for AI-powered error fixing.
This ensures consistency across propose, review, and apply steps for both frontend and backend.
Supports fixing both build errors and test failures.
"""

from typing import Dict, List, Literal

# Common JSON schema for all AI fix operations (build errors, test failures, etc.)
AI_FIX_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "analysis": {
            "type": "string",
            "description": "Analysis of the errors or review process"
        },
        "fixes": {
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
                        "description": "Exact text to search for and replace (only for modify action)"
                    },
                    "replace": {
                        "type": "string",
                        "description": "Text to replace the search text with (for modify) or full file content (for create)"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Description of what this fix does and why"
                    }
                },
                "required": ["action", "file", "replace", "reasoning"],
                "allOf": [
                    {
                        "if": {
                            "properties": {"action": {"const": "modify"}}
                        },
                        "then": {
                            "required": ["search"]
                        }
                    }
                ],
                "additionalProperties": False
            }
        }
    },
    "required": ["analysis", "fixes"],
    "additionalProperties": False
}

# Extended schema for propose step (includes confidence and reasoning)
AI_PROPOSE_RESPONSE_SCHEMA = {
    "type": "object", 
    "properties": {
        "analysis": {
            "type": "string",
            "description": "Analysis of the errors"
        },
        "fixes": {
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
                        "description": "Exact text to search for and replace (only for modify action)"
                    },
                    "replace": {
                        "type": "string",
                        "description": "Text to replace the search text with (for modify) or full file content (for create)"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Description of what this fix does and why"
                    },
                    "confidence": {
                        "type": "string",
                        "enum": ["high", "medium", "low"],
                        "description": "Confidence level in this fix"
                    }
                },
                "required": ["action", "file", "replace", "reasoning", "confidence"],
                "allOf": [
                    {
                        "if": {
                            "properties": {"action": {"const": "modify"}}
                        },
                        "then": {
                            "required": ["search"]
                        }
                    }
                ],
                "additionalProperties": False
            }
        }
    },
    "required": ["analysis", "fixes"],
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
                "name": "ai_fixes",
                "strict": True,
                "schema": AI_FIX_RESPONSE_SCHEMA
            }
        }
    }


def get_propose_payload_base(model: str = "gpt-5") -> Dict:
    """Get base OpenAI API payload structure for propose step."""
    payload = get_openai_payload_base(model)
    payload["response_format"]["json_schema"]["schema"] = AI_PROPOSE_RESPONSE_SCHEMA
    return payload


def get_common_headers(api_key: str) -> Dict:
    """Get common headers for OpenAI API requests."""
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }


def create_system_message(component: Literal["frontend", "backend"], 
                         step: Literal["propose", "review", "apply"],
                         error_type: Literal["build", "test"] = "build") -> str:
    """Create consistent system messages for different components and steps."""
    
    base_expertise = {
        "frontend": "TypeScript/React frontend applications",
        "backend": "TypeScript/Node.js backend applications"
    }
    
    step_guidance = {
        "propose": f"Analyze {error_type} errors and propose initial fixes. Be creative and suggest multiple approaches even if uncertain - a senior AI will review your proposals.",
        "review": "Review and refine proposed fixes from a junior AI. Be critical and thorough - only approve fixes you're confident will work. You can modify, reject, or completely rewrite proposed fixes.",
        "apply": "Apply fixes directly to files based on reviewed and approved fixes."
    }
    
    path_guidance = {
        "frontend": "File paths in build errors are relative to the ui/ folder. When providing file_path, include the full path from repository root (e.g., 'ui/src/file.tsx' not 'src/file.tsx').",
        "backend": "File paths in build errors are relative to the backend/ folder. When providing file_path, include the full path from repository root (e.g., 'backend/src/file.ts' not 'src/file.ts')."
    }
    
    return f"""You are a code fixing assistant specialized in {base_expertise[component]}. {step_guidance[step]} Always return valid JSON with fixes array, even if empty. IMPORTANT: {path_guidance[component]} Focus on {component}-specific issues and best practices.

CRITICAL FIX PATTERNS:
- For modifying existing files: Use action="modify" with exact search patterns from error context
- For creating new files: Use action="create" with full file content in replace field
- For search text, include complete property chains (e.g., 'logger.auth.error(' not 'logger.error(')

COMMON SCENARIOS REQUIRING NEW FILES:
- Missing type definition files (.d.ts)
- Missing configuration files (tsconfig.json, etc.)
- Missing test files when tests are expected
- Missing component files referenced by imports
- Missing utility/helper files that are imported but don't exist"""


def create_user_content_base(component: Literal["frontend", "backend"], 
                           errors: str, 
                           step: Literal["propose", "review"],
                           error_type: Literal["build", "test"] = "build") -> str:
    """Create consistent user content for different components and steps."""
    
    component_details = {
        "frontend": {
            "path_context": f"{error_type.capitalize()} errors are run from the ui/ directory, so file paths like 'src/file.tsx' should be 'ui/src/file.tsx' in your fixes.",
            "focus_areas": {
                "build": [
                    "React component errors",
                    "TypeScript compilation in JSX/TSX files", 
                    "Import/export issues in components",
                    "State management problems",
                    "API client integration issues",
                    "UI library integration problems",
                    "Vite/build tool issues"
                ],
                "test": [
                    "Jest/Vitest test failures",
                    "React Testing Library issues",
                    "Component testing problems",
                    "Mock and spy issues",
                    "Test setup and configuration",
                    "Async testing problems",
                    "Snapshot test failures"
                ]
            }
        },
        "backend": {
            "path_context": f"{error_type.capitalize()} errors are run from the backend/ directory, so file paths like 'src/file.ts' should be 'backend/src/file.ts' in your fixes.",
            "focus_areas": {
                "build": [
                    "TypeScript compilation errors",
                    "Import/export issues",
                    "Type definitions", 
                    "Node.js/Express/Fastify related problems",
                    "Database/ORM issues",
                    "API route problems"
                ],
                "test": [
                    "Jest/Node.js test failures",
                    "API endpoint testing issues",
                    "Database testing problems",
                    "Mock and stub issues",
                    "Integration test failures",
                    "Test configuration problems",
                    "Authentication/authorization test issues"
                ]
            }
        }
    }
    
    step_prefix = {
        "propose": f"Fix these TypeScript/{component} {error_type} errors",
        "review": f"Review and refine these proposed {component} fixes"
    }
    
    details = component_details[component]
    focus_list = "\n".join(f"- {area}" for area in details["focus_areas"][error_type])
    
    content = f"""{step_prefix[step]}. This is the {component} part of a monorepo. {details["path_context"]}

{error_type.upper()} ERRORS:
{errors}

Focus on {component}-specific issues like:
{focus_list}

CRITICAL FIX INSTRUCTIONS:
1. For MODIFYING existing files:
   - Use action="modify" 
   - Extract EXACT search patterns from error context including complete property chains
   - Example: if error shows 'logger.auth.ersror(' use that exact pattern in search field

2. For CREATING new files:
   - Use action="create"
   - Put full file content in replace field
   - Common cases: missing imports, missing type files, missing configuration files

3. File paths must be from repository root (e.g., '{component}/src/file.ts')"""
    
    return content
