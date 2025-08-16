#!/usr/bin/env python3
"""
Implementation Planner: Create implementation plans from targets
"""

import argparse
import json
import os
import sys
from pathlib import Path

def create_implementation_plan(targets_data):
    """Create a structured implementation plan for AI agents"""
    
    targets = targets_data.get('targets', [])
    
    # Group targets by component and complexity
    backend_targets = []
    frontend_targets = []
    test_targets = []
    
    for target in targets:
        text_lower = target['text'].lower()
        
        if any(keyword in text_lower for keyword in ['test', 'testing', 'unit test']):
            test_targets.append(target)
        elif any(keyword in text_lower for keyword in ['ui', 'component', 'form', 'interface', 'page']):
            frontend_targets.append(target)
        else:
            backend_targets.append(target)
    
    plan = {
        'total_targets': len(targets),
        'implementation_phases': [
            {
                'phase': 'backend',
                'targets': backend_targets[:5],  # Limit to 5 items per run
                'description': 'Backend API endpoints, authentication, and core business logic'
            },
            {
                'phase': 'frontend', 
                'targets': frontend_targets[:5],
                'description': 'UI components, forms, and user interfaces'
            },
            {
                'phase': 'testing',
                'targets': test_targets[:3],
                'description': 'Unit tests, integration tests, and test infrastructure'
            }
        ],
        'estimated_complexity': 'medium' if len(targets) <= 10 else 'high',
        'branch': os.getenv('GITHUB_REF_NAME', 'checklist/implementation'),
        'project_context': {
            'name': 'SMART App Launch 2.2.0 Implementation',
            'backend_stack': 'Elysia.js + TypeScript + Bun',
            'frontend_stack': 'React + TypeScript + Vite',
            'testing_stack': 'Pytest (backend) + Playwright (frontend)',
            'architecture': 'Healthcare interoperability proxy server'
        }
    }
    
    return plan

def main():
    parser = argparse.ArgumentParser(description='Create implementation plans from targets')
    parser.add_argument('--targets', required=True, help='Input targets JSON file')
    parser.add_argument('--output', default='implementation_plan.json', help='Output plan file')
    parser.add_argument('--branch', help='Branch name for context')
    
    args = parser.parse_args()
    
    try:
        with open(args.targets, 'r') as f:
            targets_data = json.load(f)
    except Exception as e:
        print(f'❌ Error reading targets file: {e}', file=sys.stderr)
        sys.exit(1)
    
    if not targets_data.get('targets'):
        print('ℹ️ No implementation targets found', file=sys.stderr)
        sys.exit(0)
    
    # Set branch context if provided
    if args.branch:
        os.environ['GITHUB_REF_NAME'] = args.branch
    
    plan = create_implementation_plan(targets_data)
    
    with open(args.output, 'w') as f:
        json.dump(plan, f, indent=2)
    
    print(f'📋 Implementation plan created:', file=sys.stderr)
    print(f'  - Total targets: {plan["total_targets"]}', file=sys.stderr)
    print(f'  - Backend items: {len(plan["implementation_phases"][0]["targets"])}', file=sys.stderr)
    print(f'  - Frontend items: {len(plan["implementation_phases"][1]["targets"])}', file=sys.stderr)
    print(f'  - Test items: {len(plan["implementation_phases"][2]["targets"])}', file=sys.stderr)
    print(f'  - Complexity: {plan["estimated_complexity"]}', file=sys.stderr)
    print(f'✅ Plan saved to {args.output}', file=sys.stderr)

if __name__ == "__main__":
    main()
