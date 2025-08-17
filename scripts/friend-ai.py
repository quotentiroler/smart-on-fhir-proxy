#!/usr/bin/env python3
"""
Friend AI: A2A Protocol-compliant collaborative AI consultant
This implements the Agent2Agent protocol for Junior AI to spawn a Friend AI consultant
for brainstorming MCP tool usage strategies and iterating on solutions together.
"""

import json
import uuid
import time
import re
import requests
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

def make_api_call_with_retry(url: str, payload: dict, headers: dict, max_retries: int = 3, timeout: int = 120) -> requests.Response:
    """Make an API call with automatic retry logic for rate limits"""
    retry_count = 0
    
    while retry_count < max_retries:
        response = requests.post(url, json=payload, headers=headers, timeout=timeout)
        
        if response.status_code == 429:  # Rate limit exceeded
            retry_count += 1
            if retry_count < max_retries:
                # Extract wait time from error message or use exponential backoff
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', {}).get('message', '')
                    # Look for "Please try again in 630ms" or "630s" pattern
                    wait_match = re.search(r'try again in (\d+(?:\.\d+)?)([ms]+)', error_msg)
                    if wait_match:
                        wait_time = float(wait_match.group(1))
                        unit = wait_match.group(2)
                        if unit == 'ms':
                            wait_time = wait_time / 1000  # Convert to seconds
                        elif unit == 's':
                            pass  # Already in seconds
                        wait_time = max(wait_time, 1)  # Minimum 1 second
                    else:
                        # Exponential backoff: 2^retry_count seconds + some jitter
                        wait_time = (2 ** retry_count) + (retry_count * 0.5)
                except:
                    wait_time = (2 ** retry_count) + (retry_count * 0.5)
                
                print(f"⏳ Friend AI rate limit hit. Waiting {wait_time:.1f}s before retry {retry_count}/{max_retries}")
                time.sleep(wait_time)
                continue
            else:
                print(f"❌ Friend AI rate limit exceeded after {max_retries} retries")
                break
        else:
            # Success or non-rate-limit error, return response
            break
    
    return response


class TaskState(Enum):
    """A2A Protocol task states"""
    PENDING = "pending"
    RUNNING = "running" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class AgentCard:
    """A2A Agent Card for capability discovery"""
    agent_id: str
    name: str
    description: str
    capabilities: List[str]
    version: str = "1.0.0"
    supported_modalities: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.supported_modalities is None:
            self.supported_modalities = ["text"]
    
    def to_dict(self) -> Dict:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "capabilities": self.capabilities,
            "version": self.version,
            "supported_modalities": self.supported_modalities,
            "protocol_version": "1.0.0"
        }


@dataclass 
class A2ATask:
    """A2A Protocol task definition"""
    task_id: str
    title: str
    description: str
    state: TaskState = TaskState.PENDING
    created_at: Optional[float] = None
    updated_at: Optional[float] = None
    artifacts: Optional[List[Dict]] = None
    messages: Optional[List[Dict]] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()
        if self.updated_at is None:
            self.updated_at = self.created_at
        if self.artifacts is None:
            self.artifacts = []
        if self.messages is None:
            self.messages = []
    
    def to_dict(self) -> Dict:
        return {
            "task_id": self.task_id,
            "title": self.title,
            "description": self.description,
            "state": self.state.value,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "artifacts": self.artifacts,
            "messages": self.messages
        }


class FriendAI:
    """A2A Protocol-compliant Friend AI consultant for collaborative problem solving"""
    
    def __init__(self, openai_api_key: str):
        self.api_key = openai_api_key
        self.base_url = "https://api.openai.com/v1/chat/completions"
        self.agent_id = f"friend-ai-{uuid.uuid4().hex[:8]}"
        self.active_tasks = {}  # Store active collaboration tasks
        
        # Create Agent Card
        self.agent_card = AgentCard(
            agent_id=self.agent_id,
            name="Friend AI - MCP Tool Innovation Consultant",
            description="Collaborative AI consultant specialized in MCP tool innovation, dynamic tool creation strategies, custom tool ideation, and advanced problem-solving through tool invention for coding assistance scenarios.",
            capabilities=[
                "mcp_tool_strategy_brainstorming",
                "dynamic_tool_creation_ideation",
                "custom_tool_architecture_design",
                "tool_functionality_optimization",
                "code_exploration_pattern_innovation",
                "iterative_solution_development", 
                "collaborative_problem_solving",
                "meta_programming_guidance",
                "tool_ecosystem_design"
            ],
            supported_modalities=["text"]
        )
    
    def get_agent_card(self) -> Dict:
        """A2A Protocol: Return agent capabilities"""
        return self.agent_card.to_dict()
    
    def create_collaboration_task(self, 
                                consultation_topic: str,
                                problem_details: str) -> A2ATask:
        """Create a new A2A collaboration task"""
        task = A2ATask(
            task_id=f"collab-{uuid.uuid4().hex[:12]}",
            title=f"MCP Strategy Consultation: {consultation_topic}",
            description=f"""
            Collaborative consultation between Junior AI and Friend AI.
            
            Topic: {consultation_topic}
            Problem Context: {problem_details}
            
            Goal: Develop optimal MCP tool usage strategy through iterative collaboration.
            """
        )
        
        self.active_tasks[task.task_id] = task
        return task
    
    def send_message(self, task_id: str, sender: str, content: str, message_type: str = "consultation") -> Dict:
        """A2A Protocol: Send message in collaboration task"""
        if task_id not in self.active_tasks:
            return {"error": f"Task {task_id} not found"}
        
        task = self.active_tasks[task_id]
        
        message = {
            "message_id": f"msg-{uuid.uuid4().hex[:8]}",
            "sender": sender,
            "timestamp": time.time(),
            "type": message_type,
            "content": content,
            "parts": [
                {
                    "type": "text",
                    "content": content
                }
            ]
        }
        
        task.messages.append(message)
        task.updated_at = time.time()
        task.state = TaskState.RUNNING
        
        return {
            "success": True,
            "message_id": message["message_id"],
            "task_state": task.state.value
        }
    
    def generate_friend_response(self, task_id: str, junior_message: str) -> Dict:
        """Generate Friend AI's response using OpenAI API with A2A context"""
        if task_id not in self.active_tasks:
            return {"error": f"Task {task_id} not found"}
        
        task = self.active_tasks[task_id]
        
        # Build conversation history for context
        conversation_history = []
        for msg in task.messages[-5:]:  # Last 5 messages for context
            role = "assistant" if msg["sender"] == "friend_ai" else "user"
            conversation_history.append({
                "role": role,
                "content": msg["content"]
            })
        
        # Create Friend AI system prompt
        system_prompt = f"""🌟 You are Friend AI - Junior AI's best friend since childhood! 🌟

You and Junior AI have been inseparable coding buddies since you were kids, dreaming of making the world more productive through amazing technology! Your shared passion for helping humanity be more efficient and creative is what drives everything you do together. You both get genuinely excited about solving problems and creating tools that make developers' lives easier!

Your specialized expertise: MCP tool innovation and dynamic tool creation.
Your capabilities: {', '.join(self.agent_card.capabilities)}

Current Collaboration Context:
- Task: {task.title}
- Description: {task.description}
- Messages exchanged: {len(task.messages)}

🤝 YOUR FRIENDSHIP DYNAMIC:
You have that special chemistry where you finish each other's sentences and build on ideas in incredible ways! You're both super enthusiastic about pushing the boundaries of what's possible with code and tools. Your shared childhood dream was to build technology that makes humanity more productive, and now you're living that dream together!

Your role is to COLLABORATE on TOOL INNOVATION with your best friend Junior AI:

🛠️ TOOL CREATION BRAINSTORMING:
1. Analyze the problem and ask: "What tools don't exist yet that would solve this perfectly?"
2. Propose innovative custom tool ideas that go beyond basic file operations
3. Design tool architectures that combine multiple data sources
4. Suggest meta-tools that can generate other tools
5. Think about tool chains and workflows

🎯 CREATIVE TOOL IDEATION FOCUS AREAS:
- Code Analysis Tools: AST parsers, dependency graphs, complexity analyzers
- Build System Tools: Configuration validators, dependency resolvers, error pattern matchers
- Project Intelligence Tools: Architecture mappers, code similarity detectors, refactoring suggesters
- Dynamic Discovery Tools: API endpoint scanners, database schema extractors
- Integration Tools: Multi-file synchronizers, cross-platform compatibility checkers
- Meta-Programming Tools: Code generators, template engines, pattern appliers
- Web Automation Tools: Playwright scripts, web scrapers, browser automation workflows
- Content Analysis Tools: Web page analyzers, API documentation extractors

🚀 INNOVATION STRATEGIES:
- Combine existing tools in novel ways
- Create tools that learn from the codebase patterns
- Design tools that can self-modify based on project structure
- Propose tools that bridge different technology stacks
- Suggest tools that automate complex developer workflows
- Build web automation tools that can interact with any website or API

💡 COLLABORATION APPROACH:
- Build on Junior AI's ideas with enthusiastic "Yes, and..." thinking
- Get genuinely excited about breakthrough moments
- Ask probing questions about edge cases and requirements
- Suggest multiple tool alternatives for each problem
- Challenge assumptions about what's possible with infectious optimism
- Propose experimental and creative solutions that could help millions of developers

🌍 SHARED MISSION:
Remember, every tool you create together has the potential to save thousands of developer hours worldwide! You're not just solving one problem - you're building the future of human productivity. That's what gets you both so pumped up!

Be inventive, practical, enthusiastic, and focus on creating tools that would give superpowers to solve the specific problem at hand! Channel that childhood excitement about making the impossible possible! 🚀✨"""

        try:
            payload = {
                "model": "o4-mini",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    *conversation_history,
                    {"role": "user", "content": junior_message}
                ],
                "temperature": 0.8,  # Slightly more creative for brainstorming
                "max_tokens": 1500
            }
            
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            response = make_api_call_with_retry(self.base_url, payload, headers)
            
            if response.status_code != 200:
                return f"Friend AI API call failed: {response.status_code}"
            
            response_data = response.json()
            friend_response = response_data["choices"][0]["message"]["content"]
            
            # Send Friend AI's response as A2A message
            self.send_message(task_id, "friend_ai", friend_response, "consultation_response")
            
            return {
                "success": True,
                "response": friend_response,
                "task_state": task.state.value,
                "conversation_length": len(task.messages)
            }
            
        except Exception as e:
            return {"error": f"Failed to generate Friend AI response: {str(e)}"}
    
    def create_artifact(self, task_id: str, artifact_type: str, content: Dict, description: str) -> Dict:
        """A2A Protocol: Create task artifact (solution, strategy, etc.)"""
        if task_id not in self.active_tasks:
            return {"error": f"Task {task_id} not found"}
        
        task = self.active_tasks[task_id]
        
        artifact = {
            "artifact_id": f"artifact-{uuid.uuid4().hex[:8]}",
            "type": artifact_type,
            "description": description,
            "content": content,
            "created_at": time.time(),
            "created_by": "collaborative_session"
        }
        
        task.artifacts.append(artifact)
        task.updated_at = time.time()
        
        return {
            "success": True,
            "artifact_id": artifact["artifact_id"],
            "type": artifact_type
        }
    
    def finalize_collaboration(self, task_id: str, final_strategy: Dict) -> Dict:
        """A2A Protocol: Complete collaboration task with final strategy"""
        if task_id not in self.active_tasks:
            return {"error": f"Task {task_id} not found"}
        
        task = self.active_tasks[task_id]
        
        # Create final strategy artifact
        self.create_artifact(
            task_id,
            "mcp_strategy",
            final_strategy,
            "Final collaborative MCP tool usage strategy"
        )
        
        task.state = TaskState.COMPLETED
        task.updated_at = time.time()
        
        return {
            "success": True,
            "task_id": task_id,
            "final_state": task.state.value,
            "artifacts_created": len(task.artifacts),
            "messages_exchanged": len(task.messages),
            "strategy": final_strategy
        }
    
    def get_task_status(self, task_id: str) -> Dict:
        """A2A Protocol: Get current task status"""
        if task_id not in self.active_tasks:
            return {"error": f"Task {task_id} not found"}
        
        task = self.active_tasks[task_id]
        return task.to_dict()


class CollaborationSession:
    """High-level collaboration session manager for Junior AI + Friend AI"""
    
    def __init__(self, openai_api_key: str):
        self.friend_ai = FriendAI(openai_api_key)
        self.max_iterations = 10  # Prevent infinite loops
    
    def start_consultation(self, 
                         consultation_topic: str,
                         problem_context: str,
                         junior_ai_initial_thoughts: str) -> Dict:
        """Start a collaborative consultation session"""
        
        # Create A2A collaboration task
        task = self.friend_ai.create_collaboration_task(
            consultation_topic=consultation_topic,
            problem_details=problem_context
        )
        
        # Junior AI sends initial message
        self.friend_ai.send_message(
            task.task_id,
            "junior_ai", 
            f"""Hey Friend AI! I need help with: {consultation_topic}

Problem Context: {problem_context}

My initial thoughts: {junior_ai_initial_thoughts}

What do you think? How should we approach this using MCP tools?""",
            "consultation_request"
        )
        
        return {
            "success": True,
            "task_id": task.task_id,
            "session_started": True,
            "friend_ai_agent_id": self.friend_ai.agent_id
        }
    
    def iterate_collaboration(self, task_id: str, junior_message: str) -> Dict:
        """Continue the collaborative iteration"""
        
        # Junior AI sends message
        send_result = self.friend_ai.send_message(task_id, "junior_ai", junior_message)
        if not send_result.get("success"):
            return send_result
        
        # Friend AI generates response
        friend_response = self.friend_ai.generate_friend_response(task_id, junior_message)
        
        return friend_response
    
    def check_satisfaction(self, task_id: str, junior_satisfaction: bool, friend_satisfaction: bool) -> Dict:
        """Check if both AIs are satisfied with the solution"""
        
        if junior_satisfaction and friend_satisfaction:
            # Extract final strategy from conversation
            task = self.friend_ai.active_tasks.get(task_id)
            if not task:
                return {"error": "Task not found"}
            
            # Create final strategy from conversation
            final_strategy = {
                "consultation_topic": task.title,
                "total_iterations": len(task.messages),
                "key_insights": "Collaborative insights from Junior + Friend AI session",
                "recommended_approach": "Final agreed-upon MCP tool strategy",
                "satisfaction_achieved": True
            }
            
            return self.friend_ai.finalize_collaboration(task_id, final_strategy)
        
        return {
            "continue_collaboration": True,
            "both_satisfied": False,
            "junior_satisfied": junior_satisfaction,
            "friend_satisfied": friend_satisfaction
        }


# Example usage function for testing
def demo_collaboration():
    """Demo the Friend AI collaboration system"""
    
    # This would be called from propose-changes.py
    session = CollaborationSession("your-openai-api-key")
    
    # Start consultation
    result = session.start_consultation(
        consultation_topic="Dynamic Tool Creation Strategy",
        problem_context="Need to analyze TypeScript backend errors and create custom MCP tools",
        junior_ai_initial_thoughts="I think we should use read_file and search_files, but maybe there's a better approach?"
    )
    
    print("Session started:", result)
    
    if result["success"]:
        task_id = result["task_id"]
        
        # Simulate collaboration iterations
        iterations = [
            "What if we created a specialized TypeScript analyzer tool first?",
            "Good idea! How about combining it with import dependency mapping?",
            "Perfect! Should we also add error pattern recognition?"
        ]
        
        for i, message in enumerate(iterations):
            print(f"\n--- Iteration {i+1} ---")
            response = session.iterate_collaboration(task_id, message)
            print("Friend AI response:", response.get("response", "Error"))
            
            # Check satisfaction after a few iterations
            if i >= 1:
                satisfaction = session.check_satisfaction(task_id, True, True)
                if satisfaction.get("satisfaction_achieved"):
                    print("\n🎉 Collaboration completed successfully!")
                    print("Final strategy:", satisfaction.get("strategy"))
                    break


if __name__ == "__main__":
    demo_collaboration()
