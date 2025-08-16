#!/usr/bin/env python3
"""
AI-powered backend build error analysis script - PROPOSER AI.
This script analyzes backend build errors and proposes initial fixes using OpenAI's API.
"""

import json
import os
import sys
import re
from pathlib import Path
from typing import Dict, List, Any

import requests
from ai_fix_schema import get_propose_payload_base, get_common_headers, create_system_message, create_user_content_base


class CodeExplorerMCP:
    """MCP tools for interactive code exploration"""
    
    MAX_CONTENT_CHARS = 20000  # Safety cap to avoid huge payloads
    
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
    
    def list_directory(self, path: str) -> Dict[str, Any]:
        """List contents of a directory"""
        try:
            dir_path = self.repo_root / path
            if not dir_path.exists():
                return {"error": f"Directory {path} not found"}
            
            files = []
            directories = []
            
            for item in dir_path.iterdir():
                if item.is_file():
                    files.append({
                        "name": item.name,
                        "size": item.stat().st_size,
                        "extension": item.suffix
                    })
                elif item.is_dir() and not item.name.startswith('.'):
                    directories.append(item.name)
            
            return {
                "path": path,
                "files": files,
                "directories": directories,
                "total_files": len(files),
                "total_directories": len(directories)
            }
        except Exception as e:
            return {"error": f"Error listing directory {path}: {str(e)}"}
    
    def read_file(self, path: str, lines: str = None) -> Dict[str, Any]:
        """Read a file or specific lines"""
        try:
            file_path = self.repo_root / path
            if not file_path.exists():
                return {"error": f"File {path} not found"}
            
            content = file_path.read_text(encoding='utf-8')
            total_lines = len(content.split('\n'))
            
            if lines:
                # Parse lines like "1-50" or "20" or "10-20"
                if '-' in lines:
                    start, end = map(int, lines.split('-'))
                    content_lines = content.split('\n')
                    selected_lines = content_lines[start-1:end]
                    return {
                        "path": path,
                        "content": '\n'.join(selected_lines),
                        "lines_shown": f"{start}-{min(end, total_lines)}",
                        "total_lines": total_lines
                    }
                else:
                    line_num = int(lines)
                    content_lines = content.split('\n')
                    if line_num <= len(content_lines):
                        # Show context around the line
                        start = max(0, line_num - 6)
                        end = min(len(content_lines), line_num + 5)
                        context_lines = content_lines[start:end]
                        return {
                            "path": path,
                            "content": '\n'.join(context_lines),
                            "lines_shown": f"{start+1}-{end}",
                            "target_line": line_num,
                            "total_lines": total_lines
                        }
            
            # Cap large content to avoid huge payloads
            if len(content) > self.MAX_CONTENT_CHARS:
                content = content[:self.MAX_CONTENT_CHARS] + "\n\n/* Content truncated due to size */\n"
            
            return {
                "path": path,
                "content": content,
                "total_lines": total_lines,
                "truncated": len(file_path.read_text(encoding='utf-8')) > self.MAX_CONTENT_CHARS
            }
        except Exception as e:
            return {"error": f"Error reading file {path}: {str(e)}"}
    
    def search_files(self, pattern: str, file_type: str = "*.ts", max_matches: int = 10) -> Dict[str, Any]:
        """Search for patterns in files"""
        try:
            matches = []
            search_pattern = f"**/{file_type}"
            
            for file_path in self.repo_root.glob(search_pattern):
                if len(matches) >= max_matches:
                    break
                    
                try:
                    content = file_path.read_text(encoding='utf-8')
                    if pattern in content:
                        # Find line numbers and context
                        lines = content.split('\n')
                        line_matches = []
                        for i, line in enumerate(lines):
                            if pattern in line:
                                line_matches.append({
                                    "line_number": i + 1,
                                    "content": line.strip(),
                                    "context": {
                                        "before": lines[max(0, i-1)].strip() if i > 0 else "",
                                        "after": lines[min(len(lines)-1, i+1)].strip() if i < len(lines)-1 else ""
                                    }
                                })
                                if len(line_matches) >= 3:  # Limit matches per file
                                    break
                        
                        if line_matches:
                            matches.append({
                                "file": str(file_path.relative_to(self.repo_root)),
                                "matches": line_matches
                            })
                except:
                    continue
            
            return {
                "pattern": pattern,
                "file_type": file_type,
                "total_matches": len(matches),
                "matches": matches
            }
        except Exception as e:
            return {"error": f"Error searching files: {str(e)}"}
    
    def find_imports(self, file_path: str) -> Dict[str, Any]:
        """Find all imports in a file and resolve them"""
        try:
            full_path = self.repo_root / file_path
            if not full_path.exists():
                return {"error": f"File {file_path} not found"}
            
            content = full_path.read_text(encoding='utf-8')
            
            # Find various import patterns
            import_patterns = [
                r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]',
                r'import\s+[\'"]([^\'"]+)[\'"]',
                r'require\([\'"]([^\'"]+)[\'"]\)',
                r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
            ]
            
            all_imports = []
            for pattern in import_patterns:
                imports = re.findall(pattern, content)
                all_imports.extend(imports)
            
            # Categorize imports
            local_imports = [imp for imp in all_imports if imp.startswith('.')]
            external_imports = [imp for imp in all_imports if not imp.startswith('.')]
            
            return {
                "file": file_path,
                "total_imports": len(all_imports),
                "local_imports": local_imports,
                "external_imports": external_imports,
                "all_imports": list(set(all_imports))
            }
        except Exception as e:
            return {"error": f"Error analyzing imports in {file_path}: {str(e)}"}
    
    def find_usage(self, symbol: str, file_type: str = "*.ts") -> Dict[str, Any]:
        """Find where a symbol/function/class is used"""
        return self.search_files(symbol, file_type)


class BackendFixProposer:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.mcp = CodeExplorerMCP(self.repo_root)
        
    def get_mcp_tools_schema(self) -> List[Dict]:
        """Get the function calling schema for MCP tools"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "list_directory",
                    "description": "List files and directories in a path. Use this to explore project structure.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string", 
                                "description": "Directory path to list (relative to repo root, e.g., 'backend/src')"
                            }
                        },
                        "required": ["path"]
                    }
                }
            },
            {
                "type": "function", 
                "function": {
                    "name": "read_file",
                    "description": "Read content of a file. Use this to understand code structure and context.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "path": {
                                "type": "string",
                                "description": "File path to read (relative to repo root)"
                            },
                            "lines": {
                                "type": "string",
                                "description": "Optional: specific lines like '1-50' or '20' to read only part of file"
                            }
                        },
                        "required": ["path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "search_files", 
                    "description": "Search for text patterns across files. Use this to find similar code or usage examples.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "pattern": {
                                "type": "string",
                                "description": "Text pattern to search for"
                            },
                            "file_type": {
                                "type": "string", 
                                "description": "File glob pattern like '*.ts', '*.js', etc.",
                                "default": "*.ts"
                            }
                        },
                        "required": ["pattern"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "find_imports",
                    "description": "Analyze imports in a file to understand dependencies.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "file_path": {
                                "type": "string",
                                "description": "Path to file to analyze imports"
                            }
                        },
                        "required": ["file_path"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "find_usage",
                    "description": "Find where a symbol, function, or class is used across the codebase.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "symbol": {
                                "type": "string",
                                "description": "Symbol name to search for"
                            },
                            "file_type": {
                                "type": "string",
                                "description": "File type to search in",
                                "default": "*.ts"
                            }
                        },
                        "required": ["symbol"]
                    }
                }
            }
        ]
    
    def handle_function_call(self, function_name: str, arguments: Dict) -> Dict[str, Any]:
        """Handle MCP function calls"""
        if function_name == "list_directory":
            return self.mcp.list_directory(arguments["path"])
        elif function_name == "read_file":
            return self.mcp.read_file(arguments["path"], arguments.get("lines"))
        elif function_name == "search_files":
            return self.mcp.search_files(arguments["pattern"], arguments.get("file_type", "*.ts"))
        elif function_name == "find_imports":
            return self.mcp.find_imports(arguments["file_path"])
        elif function_name == "find_usage":
            return self.mcp.find_usage(arguments["symbol"], arguments.get("file_type", "*.ts"))
        else:
            return {"error": f"Unknown function: {function_name}"}
        
    def read_build_log(self, log_file: str) -> str:
        """Read build errors from log file."""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Limit to first 2000 lines to avoid token limits
                lines = content.split('\n')[:2000]
                return '\n'.join(lines)
        except FileNotFoundError:
            print(f"❌ Build log file not found: {log_file}", file=sys.stderr)
            return ""
    
    def _seed_context_from_errors(self, build_errors: str, max_files: int = 3) -> str:
        """Extract file:line hints from errors and embed small excerpts into the initial prompt."""
        hints = []
        
        # Match various error patterns for TypeScript files
        patterns = [
            r'((?:backend|src)/[^\s:()]+\.tsx?)\((\d+),\d+\)',  # file.ts(67,17)
            r'Error in ((?:backend|src)/[^\s:()]+\.tsx?):(\d+)',  # Error in file.ts:67
            r'((?:backend|src)/[^\s:()]+\.tsx?):(\d+):\d+',      # file.ts:67:17
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, build_errors):
                rel_path, line_str = match.group(1), match.group(2)
                line_num = int(line_str)
                
                # Normalize to repo-root path
                if not rel_path.startswith('backend/'):
                    rel_path = f"backend/{rel_path}"
                
                print(f"🔍 Seeding context from {rel_path}:{line_num}", file=sys.stderr)
                
                # Get context around the error line
                result = self.mcp.read_file(rel_path, lines=str(line_num))
                if "content" in result and "error" not in result:
                    excerpt = result["content"]
                    hints.append(f"--- FILE: {rel_path} (around line {line_num}) ---\n{excerpt}")
                
                if len(hints) >= max_files:
                    break
            
            if len(hints) >= max_files:
                break
        
        return "\n\n".join(hints) if hints else "(no file excerpts found in errors)"
    
    def propose_fixes(self, build_errors: str) -> Dict:
        """Propose initial fixes using MCP-enhanced AI with interactive code exploration."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI fixes", file=sys.stderr)
            return {"analysis": "No API key", "fixes": []}
        
        print("🧠 Proposer AI starting interactive code exploration...", file=sys.stderr)
        
        # Seed context with excerpts from files mentioned in errors
        print("🌱 Seeding initial context from error files...", file=sys.stderr)
        seeded_context = self._seed_context_from_errors(build_errors)
        
        # Create enhanced prompt that encourages exploration
        initial_prompt = f"""You are a junior developer AI with INTERACTIVE CODE EXPLORATION CAPABILITIES! 🚀

BUILD ERRORS TO ANALYZE:
{build_errors}

CONTEXT SEED (short excerpts from files referenced in errors):
{seeded_context}

You have powerful tools to explore the codebase dynamically:
- 📁 list_directory: Navigate project structure  
- 📖 read_file: Read any file you need to understand
- 🔍 search_files: Find patterns, similar code, usage examples
- 🔗 find_imports: Understand dependencies and imports
- 🎯 find_usage: See how symbols/functions are used

EXPLORATION STRATEGY:
1. 🔍 Start by exploring files mentioned in errors (use the context seed as a starting point)
2. 📖 Read related files to understand the codebase structure
3. 🔗 Follow imports to understand dependencies
4. 🎯 Search for usage patterns and similar code
5. 💡 Propose precise fixes based on your exploration

Use the tools extensively to gather context before proposing fixes!"""

        # Set up function calling with MCP tools
        payload = get_propose_payload_base("gpt-5")
        payload["tools"] = self.get_mcp_tools_schema()
        payload["tool_choice"] = "auto"  # Let AI decide when to use tools
        
        # Start conversation
        messages = [
            {
                "role": "system",
                "content": create_system_message("backend", "propose") + "\n\nYou have interactive code exploration tools available. Use them extensively to understand the codebase before proposing fixes!"
            },
            {
                "role": "user",
                "content": initial_prompt
            }
        ]
        
        payload["messages"] = messages
        headers = get_common_headers(self.api_key)
        
        # Interactive conversation loop
        max_iterations = 15  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"🔄 AI exploration iteration {iteration}/{max_iterations}", file=sys.stderr)
            
            try:
                response = requests.post(self.base_url, json=payload, headers=headers, timeout=120)
                print(f"🌐 Proposer AI HTTP Status: {response.status_code}", file=sys.stderr)
                
                if response.status_code != 200:
                    print(f"❌ API error: {response.status_code} - {response.text}", file=sys.stderr)
                    return {"analysis": f"API error: {response.status_code}", "fixes": []}
                
                result = response.json()
                choice = result['choices'][0]
                message = choice['message']
                
                # Add AI response to conversation
                payload["messages"].append(message)
                
                # Check if AI wants to use tools
                if choice.get('finish_reason') == 'tool_calls':
                    tool_calls = message.get('tool_calls', [])
                    print(f"🛠️ AI wants to use {len(tool_calls)} tools", file=sys.stderr)
                    
                    for tool_call in tool_calls:
                        function_name = tool_call['function']['name']
                        arguments = json.loads(tool_call['function']['arguments'])
                        
                        print(f"🔧 Calling {function_name} with {arguments}", file=sys.stderr)
                        
                        # Execute the function
                        result_data = self.handle_function_call(function_name, arguments)
                        
                        # Add function result to conversation
                        payload["messages"].append({
                            "role": "tool",
                            "tool_call_id": tool_call['id'],
                            "content": json.dumps(result_data)
                        })
                    
                    # Continue the conversation
                    continue
                
                elif choice.get('finish_reason') == 'stop':
                    # AI has finished and provided final response
                    content = message.get('content', '')
                    
                    try:
                        # Try to parse as JSON
                        fixes_data = json.loads(content)
                        print("✅ Proposer AI completed exploration and analysis", file=sys.stderr)
                        return fixes_data
                    except json.JSONDecodeError:
                        # If not JSON, ask AI to format properly
                        payload["messages"].append({
                            "role": "user",
                            "content": "Please format your final response as the required JSON schema with 'analysis' and 'fixes' fields."
                        })
                        continue
                        
                else:
                    print(f"⚠️ Unexpected finish reason: {choice.get('finish_reason')}", file=sys.stderr)
                    break
                    
            except Exception as e:
                print(f"❌ Error in AI conversation: {e}", file=sys.stderr)
                return {"analysis": f"Error occurred: {str(e)}", "fixes": []}
        
        print("⚠️ Maximum iterations reached", file=sys.stderr)
        return {"analysis": "Maximum exploration iterations reached", "fixes": []}


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python propose-backend-fixes.py <build-log-file>", file=sys.stderr)
        sys.exit(1)
    
    build_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print("🧠 Proposer AI starting backend analysis...", file=sys.stderr)
    
    # Initialize the proposer
    proposer = BackendFixProposer(api_key, repo_root)
    
    # Read build errors
    build_errors = proposer.read_build_log(build_log_file)
    if not build_errors:
        print("❌ No backend build errors found", file=sys.stderr)
        sys.exit(1)
    
    # Get proposed fixes
    proposed_fixes = proposer.propose_fixes(build_errors)
    
    # Output as JSON for the next step - ONLY JSON goes to stdout
    print(json.dumps(proposed_fixes, indent=2))


if __name__ == "__main__":
    main()
