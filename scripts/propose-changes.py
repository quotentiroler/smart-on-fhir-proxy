#!/usr/bin/env python3
"""
Junior AI: Propose initial fixes for any type of build/test errors
This script analyzes errors and proposes initial fixes using MCP-enhanced exploration
"""

import json
import os
import sys
import re
import subprocess
import pickle
import hashlib
import time
import inspect
from pathlib import Path
from typing import Dict, List, Any

import requests
from ai_fix_schema import get_propose_payload_base, get_common_headers, create_system_message, create_user_content_base

# Import Friend AI with proper module name handling
import sys
import importlib.util
friend_ai_path = Path(__file__).parent / "friend-ai.py"
spec = importlib.util.spec_from_file_location("friend_ai", friend_ai_path)
friend_ai_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(friend_ai_module)
CollaborationSession = friend_ai_module.CollaborationSession


def load_base_tools() -> List[Dict]:
    """Load base tools schema from JSON file"""
    try:
        base_tools_path = Path(__file__).parent / "base-tools.json"
        with open(base_tools_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"⚠️ Failed to load base tools from JSON: {e}", file=sys.stderr)
        return []


class CodeExplorerMCP:
    """MCP tools for interactive code exploration with dynamic tool creation, persistence, and schema generation"""
    
    MAX_CONTENT_CHARS = 20000  # Safety cap to avoid huge payloads
    
    def __init__(self, repo_root: Path):
        self.repo_root = repo_root
        self.dynamic_tools = {}  # Store dynamically created tools
        self.cache_dir = repo_root / ".ai_tools_cache"
        self.cache_dir.mkdir(exist_ok=True)
        
        # Sandbox management
        self.sandboxes = {}  # Store active sandboxes
        self.sandbox_dir = repo_root / ".ai_sandboxes"
        self.sandbox_dir.mkdir(exist_ok=True)
        
        # Load cached tools on initialization
        self._load_cached_tools()
    
    def list_directory(self, path: str) -> Dict[str, Any]:
        """List contents of a directory"""
        try:
            dir_path = self.repo_root / path
            if not dir_path.exists():
                return {"error": f"Directory {path} not found"}
            
            files = [f.name for f in dir_path.iterdir() if f.is_file()]
            directories = [d.name for d in dir_path.iterdir() if d.is_dir() and not d.name.startswith('.')]
            
            return {
                "path": path,
                "files": files[:20],  # Limit results
                "directories": directories[:20]
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
                # Parse lines like "1-50" or "20"
                if '-' in lines:
                    start, end = map(int, lines.split('-'))
                    file_lines = content.split('\n')
                    content = '\n'.join(file_lines[start-1:end])
                else:
                    line_num = int(lines)
                    file_lines = content.split('\n')
                    # Show context around the line
                    start = max(0, line_num - 5)
                    end = min(len(file_lines), line_num + 5)
                    content = '\n'.join(file_lines[start:end])
            
            # Cap large content
            if len(content) > self.MAX_CONTENT_CHARS:
                content = content[:self.MAX_CONTENT_CHARS] + "\n/* truncated */"
            
            return {
                "path": path,
                "content": content,
                "total_lines": total_lines
            }
        except Exception as e:
            return {"error": f"Error reading file {path}: {str(e)}"}
    
    def search_files(self, pattern: str, file_type: str = "*.ts", max_matches: int = 10) -> Dict[str, Any]:
        """Search for patterns in files"""
        try:
            matches = []
            search_paths = [
                self.repo_root / "backend" / "**" / file_type,
                self.repo_root / "ui" / "**" / file_type
            ]
            
            for search_path in search_paths:
                for file_path in self.repo_root.glob(str(search_path.relative_to(self.repo_root))):
                    if file_path.is_file():
                        try:
                            content = file_path.read_text(encoding='utf-8')
                            if pattern in content:
                                lines = content.split('\n')
                                line_matches = [(i+1, line.strip()) for i, line in enumerate(lines) 
                                              if pattern in line][:3]  # Limit to first 3 matches per file
                                
                                matches.append({
                                    "file": str(file_path.relative_to(self.repo_root)),
                                    "matches": line_matches
                                })
                                
                                if len(matches) >= max_matches:
                                    break
                        except:
                            continue
                            
            return {"pattern": pattern, "matches": matches}
        except Exception as e:
            return {"error": f"Error searching for pattern {pattern}: {str(e)}"}
    
    def find_imports(self, file_path: str) -> Dict[str, Any]:
        """Find all imports in a file and resolve them"""
        try:
            full_path = self.repo_root / file_path
            if not full_path.exists():
                return {"error": f"File {file_path} not found"}
            
            content = full_path.read_text(encoding='utf-8')
            
            # Extract various import patterns
            import_patterns = [
                r'import.*from\s+[\'"]([^\'"]+)[\'"]',
                r'import\s+[\'"]([^\'"]+)[\'"]',
                r'require\([\'"]([^\'"]+)[\'"]\)'
            ]
            
            imports = []
            for pattern in import_patterns:
                imports.extend(re.findall(pattern, content))
            
            return {"file": file_path, "imports": list(set(imports))}
        except Exception as e:
            return {"error": f"Error analyzing imports in {file_path}: {str(e)}"}
    
    def find_usage(self, symbol: str, file_type: str = "*.ts") -> Dict[str, Any]:
        """Find where a symbol/function/class is used"""
        return self.search_files(symbol, file_type)
    
    def semantic_search(self, query: str, file_type: str = "*.ts", max_results: int = 8, similarity_threshold: float = 0.3) -> Dict[str, Any]:
        """Use SBERT embeddings to find semantically similar code across the codebase"""
        try:
            # Try to import sentence-transformers
            try:
                from sentence_transformers import SentenceTransformer
                import numpy as np
                from sklearn.metrics.pairwise import cosine_similarity
            except ImportError:
                return {
                    "error": "SBERT dependencies not available. To use semantic search, install: pip install sentence-transformers scikit-learn",
                    "suggestion": "Use regular search_files as fallback, or create a custom tool to install dependencies"
                }
            
            print(f"🧠 Starting semantic search for: '{query}'", file=sys.stderr)
            
            # Initialize SBERT model (using a lightweight model for speed)
            model = SentenceTransformer('all-MiniLM-L6-v2')  # Fast and good for code
            
            # Collect code snippets and their contexts
            code_snippets = []
            file_contexts = []
            
            search_paths = [
                self.repo_root / "backend" / "**" / file_type,
                self.repo_root / "ui" / "**" / file_type
            ]
            
            for search_path in search_paths:
                for file_path in self.repo_root.glob(str(search_path.relative_to(self.repo_root))):
                    if file_path.is_file():
                        try:
                            content = file_path.read_text(encoding='utf-8')
                            
                            # Split content into logical chunks (functions, classes, etc.)
                            lines = content.split('\n')
                            
                            # Simple heuristic: chunk by functions/classes/interfaces
                            current_chunk = []
                            current_chunk_start = 0
                            
                            for i, line in enumerate(lines):
                                current_chunk.append(line)
                                
                                # End chunk on function/class/interface definitions or empty lines
                                if (line.strip().startswith(('function ', 'class ', 'interface ', 'export ', 'const ', 'let ', 'var ')) and 
                                    len(current_chunk) > 5) or len(current_chunk) > 20:
                                    
                                    chunk_text = '\n'.join(current_chunk)
                                    if len(chunk_text.strip()) > 50:  # Skip tiny chunks
                                        code_snippets.append(chunk_text)
                                        file_contexts.append({
                                            "file": str(file_path.relative_to(self.repo_root)),
                                            "start_line": current_chunk_start + 1,
                                            "end_line": i + 1,
                                            "preview": chunk_text[:200] + "..." if len(chunk_text) > 200 else chunk_text
                                        })
                                    
                                    current_chunk = []
                                    current_chunk_start = i + 1
                                    
                                    if len(code_snippets) > 100:  # Limit processing for performance
                                        break
                                        
                        except Exception:
                            continue
            
            if not code_snippets:
                return {"error": "No code snippets found to search", "query": query}
            
            print(f"🔍 Analyzing {len(code_snippets)} code chunks with SBERT", file=sys.stderr)
            
            # Generate embeddings
            query_embedding = model.encode([query])
            code_embeddings = model.encode(code_snippets)
            
            # Calculate similarities
            similarities = cosine_similarity(query_embedding, code_embeddings)[0]
            
            # Get top results above threshold
            results = []
            for i, similarity in enumerate(similarities):
                if similarity >= similarity_threshold:
                    results.append({
                        "similarity": float(similarity),
                        "file_context": file_contexts[i],
                        "code_snippet": code_snippets[i][:500] + "..." if len(code_snippets[i]) > 500 else code_snippets[i]
                    })
            
            # Sort by similarity and limit results
            results.sort(key=lambda x: x["similarity"], reverse=True)
            results = results[:max_results]
            
            print(f"✅ Found {len(results)} semantically similar code chunks", file=sys.stderr)
            
            return {
                "query": query,
                "total_chunks_analyzed": len(code_snippets),
                "results_found": len(results),
                "semantic_matches": results,
                "model_used": "all-MiniLM-L6-v2",
                "threshold": similarity_threshold
            }
            
        except Exception as e:
            return {"error": f"Semantic search failed: {str(e)}", "query": query}
    
    def create_dynamic_tool(self, tool_name: str, tool_code: str, description: str) -> Dict[str, Any]:
        """Create a new MCP tool dynamically with persistence and schema generation"""
        try:
            # Check if we have a cached version first
            cached_tool = self._load_cached_tool(tool_name, tool_code)
            
            if cached_tool:
                print(f"📂 Using cached version of tool '{tool_name}'", file=sys.stderr)
                # Tool was already loaded during startup, just return success
                return {
                    "success": True, 
                    "tool_name": tool_name, 
                    "description": description,
                    "cached": True
                }
            
            # Create a safe execution environment
            safe_globals = {
                'self': self,
                'Path': Path,
                're': re,
                'json': json,
                'subprocess': subprocess,
                'os': os,
                'sys': sys
            }
            
            # Execute the tool code
            exec(tool_code, safe_globals)
            
            # Store the tool with enhanced metadata
            if tool_name in safe_globals:
                tool_func = safe_globals[tool_name]
                
                # Generate schema for the tool
                schema = self._generate_tool_schema(tool_func, tool_name, description)
                
                self.dynamic_tools[tool_name] = {
                    'function': tool_func,
                    'code': tool_code,
                    'description': description,
                    'cached': False,
                    'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                    'schema': schema
                }
                
                # Cache the tool for future use
                self._cache_tool(tool_name, tool_code, description)
                
                print(f"✅ Created tool '{tool_name}' with auto-generated schema", file=sys.stderr)
                print(f"🔧 Schema: {schema['function']['parameters']}", file=sys.stderr)
                
                return {
                    "success": True, 
                    "tool_name": tool_name, 
                    "description": description,
                    "schema": schema,
                    "cached": False
                }
            else:
                return {"error": f"Tool function '{tool_name}' not found in executed code"}
                
        except Exception as e:
            return {"error": f"Failed to create tool '{tool_name}': {str(e)}"}
    
    def call_dynamic_tool(self, tool_name: str, arguments: Dict) -> Dict[str, Any]:
        """Call a dynamically created tool"""
        if tool_name not in self.dynamic_tools:
            return {"error": f"Dynamic tool '{tool_name}' not found"}
        
        try:
            tool_func = self.dynamic_tools[tool_name]['function']
            return tool_func(**arguments)
        except Exception as e:
            return {"error": f"Error calling dynamic tool '{tool_name}': {str(e)}"}
    
    def get_dynamic_tools_info(self) -> Dict[str, Any]:
        """Get information about all dynamic tools"""
        return {
            name: {
                "description": info["description"],
                "available": True,
                "cached": info.get("cached", False),
                "created_at": info.get("created_at", "unknown")
            }
            for name, info in self.dynamic_tools.items()
        }
    
    def _generate_tool_schema(self, tool_func, tool_name: str, description: str) -> Dict:
        """Auto-generate OpenAI function schema from tool function"""
        try:
            sig = inspect.signature(tool_func)
            schema = {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description,
                    "parameters": {
                        "type": "object",
                        "properties": {},
                        "required": []
                    }
                }
            }
            
            for param_name, param in sig.parameters.items():
                param_type = "string"  # Default type
                param_desc = f"Parameter {param_name}"
                
                # Try to infer type from annotation
                if param.annotation != param.empty:
                    if param.annotation == int:
                        param_type = "integer"
                    elif param.annotation == float:
                        param_type = "number"
                    elif param.annotation == bool:
                        param_type = "boolean"
                    elif param.annotation == list:
                        param_type = "array"
                    elif param.annotation == dict:
                        param_type = "object"
                
                schema["function"]["parameters"]["properties"][param_name] = {
                    "type": param_type,
                    "description": param_desc
                }
                
                if param.default == param.empty:
                    schema["function"]["parameters"]["required"].append(param_name)
            
            return schema
        except Exception as e:
            print(f"⚠️ Could not generate schema for {tool_name}: {e}", file=sys.stderr)
            return {
                "type": "function",
                "function": {
                    "name": tool_name,
                    "description": description,
                    "parameters": {"type": "object", "properties": {}}
                }
            }
    
    def _cache_tool(self, tool_name: str, tool_code: str, description: str):
        """Cache compiled tool for reuse"""
        try:
            tool_hash = hashlib.md5(tool_code.encode()).hexdigest()
            cache_file = self.cache_dir / f"{tool_name}_{tool_hash}.pkl"
            
            tool_data = {
                'name': tool_name,
                'code': tool_code,
                'description': description,
                'created_at': time.time(),
                'hash': tool_hash
            }
            
            with open(cache_file, 'wb') as f:
                pickle.dump(tool_data, f)
            
            print(f"💾 Cached tool '{tool_name}' to {cache_file.name}", file=sys.stderr)
            
        except Exception as e:
            print(f"⚠️ Failed to cache tool '{tool_name}': {e}", file=sys.stderr)
    
    def _load_cached_tool(self, tool_name: str, tool_code: str):
        """Load cached tool if available and matching"""
        try:
            tool_hash = hashlib.md5(tool_code.encode()).hexdigest()
            cache_file = self.cache_dir / f"{tool_name}_{tool_hash}.pkl"
            
            if cache_file.exists():
                with open(cache_file, 'rb') as f:
                    tool_data = pickle.load(f)
                
                print(f"📂 Loaded cached tool '{tool_name}' from {cache_file.name}", file=sys.stderr)
                return tool_data
                
        except Exception as e:
            print(f"⚠️ Failed to load cached tool '{tool_name}': {e}", file=sys.stderr)
        
        return None
    
    def _load_cached_tools(self):
        """Load all cached tools on startup"""
        try:
            cache_files = list(self.cache_dir.glob("*.pkl"))
            loaded_count = 0
            
            for cache_file in cache_files:
                try:
                    with open(cache_file, 'rb') as f:
                        tool_data = pickle.load(f)
                    
                    tool_name = tool_data['name']
                    tool_code = tool_data['code']
                    description = tool_data['description']
                    
                    # Recreate the tool function
                    safe_globals = {
                        'self': self,
                        'Path': Path,
                        're': re,
                        'json': json,
                        'subprocess': subprocess,
                        'os': os,
                        'sys': sys
                    }
                    
                    exec(tool_code, safe_globals)
                    
                    if tool_name in safe_globals:
                        self.dynamic_tools[tool_name] = {
                            'function': safe_globals[tool_name],
                            'code': tool_code,
                            'description': description,
                            'cached': True,
                            'created_at': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(tool_data.get('created_at', time.time()))),
                            'schema': self._generate_tool_schema(safe_globals[tool_name], tool_name, description)
                        }
                        loaded_count += 1
                        
                except Exception as e:
                    print(f"⚠️ Failed to load cached tool from {cache_file}: {e}", file=sys.stderr)
            
            if loaded_count > 0:
                print(f"📂 Loaded {loaded_count} cached tools on startup", file=sys.stderr)
                
        except Exception as e:
            print(f"⚠️ Failed to load cached tools: {e}", file=sys.stderr)
    
    def get_tool_schemas(self) -> List[Dict]:
        """Get OpenAI function schemas for all dynamic tools"""
        schemas = []
        for tool_name, tool_info in self.dynamic_tools.items():
            if 'schema' in tool_info:
                schemas.append(tool_info['schema'])
            else:
                # Generate schema on demand
                schema = self._generate_tool_schema(
                    tool_info['function'], 
                    tool_name, 
                    tool_info['description']
                )
                tool_info['schema'] = schema
                schemas.append(schema)
        
        return schemas
    
    # ===== SANDBOX FUNCTIONALITY =====
    
    def create_sandbox(self, sandbox_name: str, description: str, sandbox_type: str = "temp_directory") -> Dict[str, Any]:
        """Create an isolated sandbox environment for safe testing"""
        try:
            if sandbox_name in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' already exists"}
            
            sandbox_path = self.sandbox_dir / sandbox_name
            sandbox_path.mkdir(exist_ok=True)
            
            sandbox_info = {
                "name": sandbox_name,
                "type": sandbox_type,
                "path": str(sandbox_path),
                "description": description,
                "created_at": time.time(),
                "operations": [],
                "status": "active"
            }
            
            # Initialize sandbox based on type
            if sandbox_type == "copy_repo":
                # Copy essential files (excluding .git, node_modules, etc.)
                self._copy_repo_to_sandbox(sandbox_path)
                sandbox_info["has_repo_copy"] = True
            elif sandbox_type == "temp_directory":
                # Just create empty directory
                (sandbox_path / "workspace").mkdir(exist_ok=True)
                sandbox_info["has_repo_copy"] = False
            
            self.sandboxes[sandbox_name] = sandbox_info
            
            print(f"📦 Created sandbox '{sandbox_name}' at {sandbox_path}", file=sys.stderr)
            
            return {
                "success": True,
                "sandbox_name": sandbox_name,
                "sandbox_path": str(sandbox_path),
                "type": sandbox_type,
                "description": description,
                "ready_for_operations": True
            }
            
        except Exception as e:
            return {"error": f"Failed to create sandbox '{sandbox_name}': {str(e)}"}
    
    def _copy_repo_to_sandbox(self, sandbox_path: Path):
        """Copy repository files to sandbox, excluding unnecessary files"""
        import shutil
        
        exclude_patterns = {
            '.git', 'node_modules', '.ai_tools_cache', '.ai_sandboxes', 
            'dist', 'build', '.next', 'target', '__pycache__', '.pytest_cache'
        }
        
        workspace_path = sandbox_path / "workspace"
        workspace_path.mkdir(exist_ok=True)
        
        for item in self.repo_root.iterdir():
            if item.name not in exclude_patterns:
                dest = workspace_path / item.name
                if item.is_file():
                    shutil.copy2(item, dest)
                elif item.is_dir():
                    shutil.copytree(item, dest, ignore=shutil.ignore_patterns(*exclude_patterns))
    
    def run_in_sandbox(self, sandbox_name: str, operation_type: str, operation_data: str, description: str) -> Dict[str, Any]:
        """Execute operations safely inside a sandbox"""
        try:
            if sandbox_name not in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' not found"}
            
            sandbox = self.sandboxes[sandbox_name]
            sandbox_path = Path(sandbox["path"])
            
            operation_id = f"op-{len(sandbox['operations']) + 1}"
            operation_record = {
                "id": operation_id,
                "type": operation_type,
                "description": description,
                "timestamp": time.time(),
                "status": "running"
            }
            
            print(f"🧪 Running {operation_type} in sandbox '{sandbox_name}': {description}", file=sys.stderr)
            
            result = None
            if operation_type == "command":
                result = self._run_sandbox_command(sandbox_path, operation_data)
            elif operation_type == "code_execution":
                result = self._run_sandbox_code(sandbox_path, operation_data)
            elif operation_type == "file_operation":
                result = self._run_sandbox_file_operation(sandbox_path, operation_data)
            elif operation_type == "build_test":
                result = self._run_sandbox_build_test(sandbox_path, operation_data)
            else:
                return {"error": f"Unknown operation type: {operation_type}"}
            
            operation_record["result"] = result
            operation_record["status"] = "completed" if result.get("success") else "failed"
            sandbox["operations"].append(operation_record)
            
            return {
                "success": True,
                "operation_id": operation_id,
                "operation_type": operation_type,
                "result": result,
                "sandbox_status": sandbox["status"]
            }
            
        except Exception as e:
            return {"error": f"Failed to run operation in sandbox '{sandbox_name}': {str(e)}"}
    
    def _run_sandbox_command(self, sandbox_path: Path, command: str) -> Dict[str, Any]:
        """Run shell command in sandbox"""
        try:
            workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
            
            result = subprocess.run(
                command,
                shell=True,
                cwd=workspace_path,
                capture_output=True,
                text=True,
                timeout=60  # 1 minute timeout
            )
            
            return {
                "success": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "command": command
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Command timed out after 60 seconds"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _run_sandbox_code(self, sandbox_path: Path, code: str) -> Dict[str, Any]:
        """Execute Python code in sandbox context"""
        try:
            workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
            
            # Create safe execution environment
            safe_globals = {
                'sandbox_path': workspace_path,
                'Path': Path,
                're': re,
                'json': json,
                'os': os,
                'sys': sys,
                'subprocess': subprocess
            }
            
            # Capture output
            import io
            import contextlib
            
            output = io.StringIO()
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                exec(code, safe_globals)
            
            return {
                "success": True,
                "output": output.getvalue(),
                "code": code
            }
            
        except Exception as e:
            return {"success": False, "error": str(e), "code": code}
    
    def _run_sandbox_file_operation(self, sandbox_path: Path, operation: str) -> Dict[str, Any]:
        """Perform file operations in sandbox"""
        try:
            # Parse operation (could be JSON with file operations)
            operation_data = json.loads(operation) if operation.startswith('{') else {"operation": operation}
            
            workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
            
            if "create_file" in operation_data:
                file_path = workspace_path / operation_data["create_file"]["path"]
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_text(operation_data["create_file"]["content"])
                return {"success": True, "operation": "file_created", "path": str(file_path)}
            
            elif "read_file" in operation_data:
                file_path = workspace_path / operation_data["read_file"]["path"]
                content = file_path.read_text() if file_path.exists() else None
                return {"success": True, "operation": "file_read", "content": content}
            
            else:
                return {"success": False, "error": "Unknown file operation"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _run_sandbox_build_test(self, sandbox_path: Path, test_command: str) -> Dict[str, Any]:
        """Run build/test commands in sandbox"""
        workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
        
        # Run the test command
        return self._run_sandbox_command(sandbox_path, test_command)
    
    def inspect_sandbox(self, sandbox_name: str, inspection_type: str = "all") -> Dict[str, Any]:
        """Inspect sandbox state and results"""
        try:
            if sandbox_name not in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' not found"}
            
            sandbox = self.sandboxes[sandbox_name]
            sandbox_path = Path(sandbox["path"])
            
            inspection_result = {
                "sandbox_name": sandbox_name,
                "inspection_type": inspection_type
            }
            
            if inspection_type in ["status", "all"]:
                inspection_result["status"] = {
                    "name": sandbox["name"],
                    "type": sandbox["type"],
                    "description": sandbox["description"],
                    "created_at": sandbox["created_at"],
                    "status": sandbox["status"],
                    "operations_count": len(sandbox["operations"])
                }
            
            if inspection_type in ["files", "all"]:
                workspace_path = sandbox_path / "workspace" if (sandbox_path / "workspace").exists() else sandbox_path
                files = []
                if workspace_path.exists():
                    for item in workspace_path.rglob("*"):
                        if item.is_file():
                            files.append(str(item.relative_to(workspace_path)))
                inspection_result["files"] = files[:50]  # Limit to 50 files
            
            if inspection_type in ["logs", "results", "all"]:
                inspection_result["operations"] = sandbox["operations"][-10:]  # Last 10 operations
            
            return {
                "success": True,
                **inspection_result
            }
            
        except Exception as e:
            return {"error": f"Failed to inspect sandbox '{sandbox_name}': {str(e)}"}
    
    def cleanup_sandbox(self, sandbox_name: str, force: bool = False) -> Dict[str, Any]:
        """Clean up and remove sandbox"""
        try:
            if sandbox_name not in self.sandboxes:
                return {"error": f"Sandbox '{sandbox_name}' not found"}
            
            sandbox = self.sandboxes[sandbox_name]
            sandbox_path = Path(sandbox["path"])
            
            # Check if sandbox has unsaved results
            if not force and sandbox["operations"]:
                unsaved_ops = [op for op in sandbox["operations"] if op.get("status") == "completed"]
                if unsaved_ops:
                    return {
                        "success": False,
                        "warning": f"Sandbox has {len(unsaved_ops)} completed operations. Use force=true to cleanup anyway.",
                        "operations": [op["description"] for op in unsaved_ops[-5:]]
                    }
            
            # Remove sandbox directory
            import shutil
            if sandbox_path.exists():
                shutil.rmtree(sandbox_path)
            
            # Remove from active sandboxes
            del self.sandboxes[sandbox_name]
            
            print(f"🗑️ Cleaned up sandbox '{sandbox_name}'", file=sys.stderr)
            
            return {
                "success": True,
                "sandbox_name": sandbox_name,
                "cleaned_up": True,
                "operations_removed": len(sandbox["operations"])
            }
            
        except Exception as e:
            return {"error": f"Failed to cleanup sandbox '{sandbox_name}': {str(e)}"}


class UnifiedChangeProposer:
    def __init__(self, openai_api_key: str, repo_root: str):
        self.api_key = openai_api_key
        self.repo_root = Path(repo_root)
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.mcp = CodeExplorerMCP(self.repo_root)
        self.friend_conversations = []  # Store friend AI conversations
        self.collaboration_session = None  # Initialize on first use
        
    def detect_component_type(self, error_log: str) -> str:
        """Detect if errors are from frontend, backend, or other"""
        if any(indicator in error_log.lower() for indicator in ['ui/', 'vite', 'react', 'jsx', 'tsx']):
            return "frontend"
        elif any(indicator in error_log.lower() for indicator in ['backend/', 'node', 'express', 'fastify']):
            return "backend"
        else:
            # Try to infer from file paths
            if 'ui/' in error_log or 'src/components' in error_log:
                return "frontend"
            elif 'backend/' in error_log or 'src/lib' in error_log or 'src/routes' in error_log:
                return "backend"
            return "unknown"
    
    def get_mcp_tools_schema(self) -> List[Dict]:
        """Get the function calling schema for MCP tools including dynamic tool creation and all cached tools"""
        
        # Load base tools from JSON file
        base_tools = load_base_tools()
        
        # Add schemas for all existing dynamic tools
        dynamic_tool_schemas = self.mcp.get_tool_schemas()
        
        # Combine base tools with dynamic tool schemas
        all_tools = base_tools + dynamic_tool_schemas
        
        if dynamic_tool_schemas:
            print(f"🔧 Including {len(dynamic_tool_schemas)} dynamic tools in schema", file=sys.stderr)
        
        return all_tools
    
    def handle_function_call(self, function_name: str, arguments: Dict) -> Dict[str, Any]:
        """Handle MCP function calls including dynamic tool creation and execution"""
        print(f"🔧 MCP Tool Call: {function_name}({arguments})", file=sys.stderr)
        
        # Handle base MCP tools
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
        elif function_name == "semantic_search":
            return self.mcp.semantic_search(
                arguments["query"], 
                arguments.get("file_type", "*.ts"),
                arguments.get("max_results", 8),
                arguments.get("similarity_threshold", 0.3)
            )
        
        # Handle dynamic tool creation and execution
        elif function_name == "create_dynamic_tool":
            print(f"🚀 META-AI: Creating new tool '{arguments['tool_name']}'", file=sys.stderr)
            result = self.mcp.create_dynamic_tool(
                arguments["tool_name"], 
                arguments["tool_code"], 
                arguments["description"]
            )
            if result.get("success"):
                print(f"✅ Dynamic tool '{arguments['tool_name']}' created successfully!", file=sys.stderr)
            else:
                print(f"❌ Failed to create dynamic tool: {result.get('error')}", file=sys.stderr)
            return result
            
        elif function_name == "call_dynamic_tool":
            print(f"🎯 Calling dynamic tool '{arguments['tool_name']}'", file=sys.stderr)
            return self.mcp.call_dynamic_tool(arguments["tool_name"], arguments["arguments"])
            
        elif function_name == "get_dynamic_tools_info":
            return self.mcp.get_dynamic_tools_info()
            
        elif function_name == "consult_friend_ai":
            return self.consult_friend_ai(
                arguments["consultation_topic"],
                arguments["problem_context"], 
                arguments["your_initial_thoughts"]
            )
            
        # Sandbox functions
        elif function_name == "create_sandbox":
            return self.mcp.create_sandbox(
                arguments["sandbox_name"],
                arguments["description"],
                arguments.get("sandbox_type", "temp_directory")
            )
            
        elif function_name == "run_in_sandbox":
            return self.mcp.run_in_sandbox(
                arguments["sandbox_name"],
                arguments["operation_type"],
                arguments["operation_data"],
                arguments["description"]
            )
            
        elif function_name == "inspect_sandbox":
            return self.mcp.inspect_sandbox(
                arguments["sandbox_name"],
                arguments.get("inspection_type", "all")
            )
            
        elif function_name == "cleanup_sandbox":
            return self.mcp.cleanup_sandbox(
                arguments["sandbox_name"],
                arguments.get("force", False)
            )
            
        # Handle dynamically created tools
        elif function_name in self.mcp.dynamic_tools:
            print(f"🎯 Calling dynamic tool '{function_name}' directly", file=sys.stderr)
            return self.mcp.call_dynamic_tool(function_name, arguments)
            
        else:
            return {"error": f"Unknown function: {function_name}"}
    
    def consult_friend_ai(self, consultation_topic: str, problem_context: str, your_initial_thoughts: str) -> Dict[str, Any]:
        """Start a collaborative consultation with Friend AI using A2A protocol"""
        try:
            # Initialize collaboration session if not exists
            if self.collaboration_session is None:
                self.collaboration_session = CollaborationSession(self.api_key)
            
            print(f"🤝 Starting Friend AI consultation on: {consultation_topic}", file=sys.stderr)
            
            # Start the collaboration
            result = self.collaboration_session.start_consultation(
                consultation_topic=consultation_topic,
                problem_context=problem_context,
                junior_ai_initial_thoughts=your_initial_thoughts
            )
            
            if not result.get("success"):
                return {"error": f"Failed to start Friend AI consultation: {result.get('error', 'Unknown error')}"}
            
            task_id = result["task_id"]
            
            # Get Friend AI's initial response
            friend_response = self.collaboration_session.friend_ai.generate_friend_response(
                task_id, 
                f"Junior AI consultation request: {your_initial_thoughts}"
            )
            
            if not friend_response.get("success"):
                return {"error": f"Friend AI failed to respond: {friend_response.get('error', 'Unknown error')}"}
            
            # Store the conversation for potential continuation
            conversation_info = {
                "task_id": task_id,
                "topic": consultation_topic,
                "started_at": time.time(),
                "status": "active"
            }
            self.friend_conversations.append(conversation_info)
            
            return {
                "success": True,
                "consultation_started": True,
                "task_id": task_id,
                "friend_ai_response": friend_response["response"],
                "conversation_length": friend_response.get("conversation_length", 1),
                "next_steps": "You can continue this conversation by calling consult_friend_ai again with follow-up thoughts, or proceed with the suggested strategy.",
                "a2a_protocol": "Using Agent2Agent protocol for collaborative AI consultation"
            }
            
        except Exception as e:
            return {"error": f"Friend AI consultation failed: {str(e)}"}
    
    def read_error_log(self, log_file: str) -> str:
        """Read error log from file."""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Limit to first 2000 lines to avoid token limits
                lines = content.split('\n')[:2000]
                return '\n'.join(lines)
        except FileNotFoundError:
            print(f"❌ Error log file not found: {log_file}", file=sys.stderr)
            return ""
    
    def seed_context_from_errors(self, error_log: str, max_files: int = 3) -> str:
        """Extract file:line hints from errors and embed small excerpts into the initial prompt."""
        hints = []
        
        # Match various error patterns for TypeScript files
        patterns = [
            r'((?:backend|ui|src)/[^\s:()]+\.tsx?)\((\d+),\d+\)',
            r'Error in ((?:backend|ui|src)/[^\s:()]+\.tsx?):(\d+)',
            r'((?:backend|ui|src)/[^\s:()]+\.tsx?):(\d+):\d+',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, error_log):
                file_path, line_num = match.groups()
                # Normalize path to repo root
                if not file_path.startswith(('backend/', 'ui/')):
                    # Try to infer the correct path
                    if 'components' in file_path or 'pages' in file_path:
                        file_path = f"ui/{file_path}"
                    else:
                        file_path = f"backend/{file_path}"
                
                result = self.mcp.read_file(file_path, str(line_num))
                if "content" in result:
                    excerpt = result["content"]
                    hints.append(f"FILE: {file_path}, around line {line_num}\n{excerpt}")
                
                if len(hints) >= max_files:
                    break
        
        return "\n\n".join(hints) if hints else "(no file excerpts found in errors)"
    
    def propose_changes(self, error_log: str) -> Dict:
        """Propose initial fixes using MCP-enhanced AI with interactive code exploration."""
        if not self.api_key:
            print("❌ OPENAI_API_KEY is not set - skipping AI fixes", file=sys.stderr)
            return {"analysis": "No API key", "fixes": []}
        
        print("🧠 Junior AI starting interactive code exploration...", file=sys.stderr)
        
        # Detect component type
        component_type = self.detect_component_type(error_log)
        print(f"🎯 Detected component type: {component_type}", file=sys.stderr)
        
        # Seed context with excerpts from files mentioned in errors
        print("🌱 Seeding initial context from error files...", file=sys.stderr)
        seeded_context = self.seed_context_from_errors(error_log)
        
        # Create enhanced prompt that encourages exploration and tool creation
        initial_prompt = f"""You are a junior developer AI with INTERACTIVE CODE EXPLORATION CAPABILITIES and the POWER TO CREATE NEW TOOLS! 🚀

ERROR LOG TO ANALYZE:
{error_log}

COMPONENT TYPE: {component_type}

CONTEXT SEED (short excerpts from files referenced in errors):
{seeded_context}

🛠️ YOUR TOOLKIT OVERVIEW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 PREDEFINED BASE TOOLS (Your Starting Collection):
- 📁 list_directory: explore project structure
- 📖 read_file: understand code and context  
- 🔍 search_files: find similar patterns or usage examples
- 🧠 semantic_search: SBERT-powered semantic code search for natural language queries
- 🔗 find_imports: analyze dependencies
- 🎯 find_usage: see how symbols are used

🚀 DYNAMIC TOOL CREATION (Your Superpower - CREATE NEW TOOLS ON DEMAND!):
- 🛠️ create_dynamic_tool: Invent and build NEW MCP tools when you need functionality that doesn't exist!
- 🎯 call_dynamic_tool: Execute your newly created custom tools
- 📋 get_dynamic_tools_info: See what custom tools you've created so far

🤝 COLLABORATIVE AI CONSULTATION (Friend AI A2A Protocol):
- 💭 consult_friend_ai: Spawn a collaborative Friend AI to brainstorm:
  * WHICH MCP tools (base or custom) to use for your specific problem
  * HOW to architect innovative tool solutions  
  * Creative tool ideas you haven't thought of yet
  * Efficient tool combination strategies and workflows
  * Meta-programming and advanced tool generation approaches
  
🏗️ SANDBOX EXPERIMENTATION (Safe Testing Environment):
- 📦 create_sandbox: Create isolated environments for risky operations
- 🧪 run_in_sandbox: Execute code/commands safely without affecting main codebase
- 🔍 inspect_sandbox: Check sandbox state and results
- 🗑️ cleanup_sandbox: Clean up when testing is complete

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 STRATEGIC EXPLORATION WORKFLOW:
1. 🚀 START: Use BASE TOOLS to explore files mentioned in errors
2. 📚 UNDERSTAND: Read relevant files to grasp context and patterns
3. 🤔 ASSESS: "Do I need functionality that doesn't exist in my base toolkit?"
4. 🛠️ CREATE: Build specialized custom tools for complex tasks like:
   - Advanced code pattern analysis across multiple files
   - Cross-repository dependency tracking  
   - Build system introspection and configuration analysis
   - Complex file parsing (package.json, tsconfig.json, etc.)
   - Database schema analysis and validation
   - API endpoint mapping and route analysis
   - Sophisticated error log pattern matching
   - Multi-file content transformation pipelines
   - Project structure validation and compliance checking
   - Custom linting and code quality analysis
   - And literally ANYTHING else you can imagine!
5. 🤝 COLLABORATE: When stuck or needing creative input, consult Friend AI for:
   - Strategic tool selection advice
   - Custom tool architecture brainstorming
   - Problem-solving approach validation
6. 📦 EXPERIMENT: Use sandboxes for risky operations:
   - Test experimental solutions safely
   - Validate fixes before applying to main codebase
   - Try different approaches without side effects
   - Run build/test commands in isolation
7. 🎯 SYNTHESIZE: Combine base tools + custom tools + AI collaboration + sandbox testing

💡 TOOL CREATION EXAMPLES:
```python
# Custom TypeScript analyzer
def analyze_typescript_imports_and_exports():
    # Complex logic to map all imports/exports across the project
    return {{"import_graph": {{}}, "circular_deps": [], "unused_exports": []}}

# Build system inspector  
def inspect_build_configuration():
    # Analyze package.json, tsconfig.json, vite.config.ts, etc.
    return {{"build_targets": [], "dependencies": {{}}, "potential_issues": []}}

# Error pattern matcher
def analyze_error_patterns():
    # Smart pattern matching across error logs
    return {{"error_categories": [], "fix_suggestions": [], "related_files": []}}
```

Remember: You start with a solid foundation of BASE TOOLS, but your real power is in CREATING EXACTLY THE TOOLS YOU NEED for any specific problem! 🛠️✨

Think of it as: BASE TOOLS = Your workshop foundation, CUSTOM TOOLS = Your specialized instruments you craft for each unique challenge!"""
        
        # Set up the conversation with function calling
        payload = get_propose_payload_base("gpt-5")
        payload["tools"] = self.get_mcp_tools_schema()
        payload["messages"] = [
            {
                "role": "system",
                "content": create_system_message(component_type if component_type != "unknown" else "backend", "propose")
            },
            {
                "role": "user",
                "content": initial_prompt
            }
        ]
        
        headers = get_common_headers(self.api_key)
        
        max_iterations = 10  # Prevent infinite loops
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"🔄 AI Iteration {iteration}", file=sys.stderr)
            
            try:
                response = requests.post(self.base_url, json=payload, headers=headers, timeout=120)
                print(f"🌐 HTTP Status: {response.status_code}", file=sys.stderr)
                
                if response.status_code != 200:
                    print(f"❌ API call failed: {response.text}", file=sys.stderr)
                    return {"analysis": "API call failed", "fixes": []}
                
                result = response.json()
                choice = result['choices'][0]
                message = choice['message']
                
                # Check if AI wants to use tools
                if message.get('tool_calls'):
                    print(f"🔧 AI requesting {len(message['tool_calls'])} tool calls", file=sys.stderr)
                    
                    # Add the AI's message to conversation
                    payload["messages"].append(message)
                    
                    # Handle each tool call
                    for tool_call in message['tool_calls']:
                        function_name = tool_call['function']['name']
                        arguments = json.loads(tool_call['function']['arguments'])
                        
                        # Execute the function
                        result = self.handle_function_call(function_name, arguments)
                        
                        # Add the function result to conversation
                        payload["messages"].append({
                            "role": "tool",
                            "tool_call_id": tool_call['id'],
                            "content": json.dumps(result)
                        })
                    
                    # Continue the conversation
                    continue
                
                # AI has finished exploring and provided final response
                if choice['finish_reason'] == 'stop':
                    try:
                        fixes_json = message['content']
                        fixes_data = json.loads(fixes_json)
                        print("✅ AI exploration and analysis complete", file=sys.stderr)
                        return fixes_data
                    except json.JSONDecodeError:
                        print("❌ Failed to parse final JSON response", file=sys.stderr)
                        print(f"Raw response: {message['content']}", file=sys.stderr)
                        return {"analysis": "JSON parse error", "fixes": []}
                
            except Exception as e:
                print(f"❌ Error in AI conversation: {e}", file=sys.stderr)
                return {"analysis": "Error occurred", "fixes": []}
        
        print("❌ Max iterations reached without completion", file=sys.stderr)
        return {"analysis": "Max iterations reached", "fixes": []}


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python propose-changes.py <error-log-file>", file=sys.stderr)
        sys.exit(1)
    
    error_log_file = sys.argv[1]
    api_key = os.environ.get("OPENAI_API_KEY")
    repo_root = os.environ.get("GITHUB_WORKSPACE", ".")
    
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable is required", file=sys.stderr)
        sys.exit(1)
    
    print("🧠 Junior AI starting unified error analysis...", file=sys.stderr)
    
    # Initialize the proposer
    proposer = UnifiedChangeProposer(api_key, repo_root)
    
    # Read error log
    error_log = proposer.read_error_log(error_log_file)
    if not error_log:
        print("❌ No errors found in log", file=sys.stderr)
        sys.exit(1)
    
    # Get proposed changes
    proposed_changes = proposer.propose_changes(error_log)
    
    # Output as JSON for the next step - ONLY JSON goes to stdout
    print(json.dumps(proposed_changes, indent=2))


if __name__ == "__main__":
    main()
