#!/usr/bin/env python3
"""
Plan to Requirements: Convert implementation plan to requirements log
"""

import argparse
import json
import sys

def create_requirements_log(plan_data):
    """Create a synthetic 'error log' that describes implementation needs"""
    
    error_content = []
    error_content.append('=== CHECKLIST IMPLEMENTATION REQUIREMENTS ===\n')

    for phase in plan_data.get('implementation_phases', []):
        if not phase.get('targets'):
            continue
            
        error_content.append(f'\n--- {phase["phase"].upper()} PHASE ---')
        error_content.append(f'Description: {phase["description"]}')
        error_content.append('')
        
        for target in phase['targets']:
            error_content.append(f'IMPLEMENT: {target["text"]}')
            error_content.append(f'  File: {target["file"]}:{target["line"]}')
            error_content.append(f'  Priority: {target["priority"]}')
            error_content.append(f'  Status: {"Complete" if target["complete"] else "Pending"}')
            error_content.append('')

    # Add project context
    project_context = plan_data.get('project_context', {})
    error_content.extend([
        '\n=== PROJECT CONTEXT ===',
        f'Project: {project_context.get("name", "SMART App Launch Implementation")}',
        f'Backend: {project_context.get("backend_stack", "Elysia.js + TypeScript + Bun")}',
        f'Frontend: {project_context.get("frontend_stack", "React + TypeScript + Vite")}',
        f'Testing: {project_context.get("testing_stack", "Pytest + Playwright")}',
        f'Architecture: {project_context.get("architecture", "Healthcare proxy server")}',
        '',
        'Implementation should follow SMART App Launch specifications,',
        'maintain OAuth 2.0/OIDC compliance, and integrate with existing',
        'authentication flows and FHIR server connections.',
        ''
    ])

    return '\n'.join(error_content)

def main():
    parser = argparse.ArgumentParser(description='Convert implementation plan to requirements log')
    parser.add_argument('--plan', required=True, help='Input plan JSON file')
    parser.add_argument('--output', default='implementation_requirements.log', help='Output requirements file')
    
    args = parser.parse_args()
    
    try:
        with open(args.plan, 'r') as f:
            plan_data = json.load(f)
    except Exception as e:
        print(f'❌ Error reading plan file: {e}', file=sys.stderr)
        sys.exit(1)
    
    requirements_content = create_requirements_log(plan_data)
    
    with open(args.output, 'w') as f:
        f.write(requirements_content)
    
    print(f'📝 Created implementation requirements log: {args.output}', file=sys.stderr)
    print(f'  - Total phases: {len(plan_data.get("implementation_phases", []))}', file=sys.stderr)
    print(f'  - Total targets: {plan_data.get("total_targets", 0)}', file=sys.stderr)

if __name__ == "__main__":
    main()
