#!/usr/bin/env python3
"""
Development Environment Setup Script

This script sets up the development environment for the proxy-smart AI system.
It uses UV for ultra-fast package installation and provides options for different
installation modes.

Usage:
    python install-dev.py [--mode=full|basic] [--force]
"""

import subprocess
import sys
import os
from pathlib import Path
import argparse

def run_command(cmd, description):
    """Run a command and handle errors gracefully."""
    print(f"🔄 {description}...")
    try:
        subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e.stderr}")
        return False

def check_uv_installed():
    """Check if UV is installed and install if needed."""
    try:
        subprocess.run(["uv", "--version"], check=True, capture_output=True)
        print("✅ UV is already installed")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("📦 UV not found, installing...")
        # Install UV using the official installer
        if os.name == 'nt':  # Windows
            cmd = "powershell -c \"irm https://astral.sh/uv/install.ps1 | iex\""
        else:  # Unix-like
            cmd = "curl -LsSf https://astral.sh/uv/install.sh | sh"
        
        if run_command(cmd, "Installing UV"):
            print("✅ UV installed successfully")
            return True
        else:
            print("❌ Failed to install UV")
            return False

def create_virtual_environment(force=False):
    """Create or recreate the virtual environment."""
    if force and Path(".venv").exists():
        print("🗑️ Removing existing virtual environment...")
        if os.name == 'nt':
            run_command("rmdir /s /q .venv", "Removing .venv")
        else:
            run_command("rm -rf .venv", "Removing .venv")
    
    if not Path(".venv").exists():
        return run_command("uv venv", "Creating virtual environment")
    return True

def install_dependencies():
    """Install dependencies from requirements.txt for better compatibility."""
    print("📋 Installing dependencies from requirements.txt (compatible mode)")
    return run_command("uv pip install -r requirements.txt", "Installing dependencies from requirements.txt")

def verify_installation():
    """Verify that key modules can be imported."""
    print("\n🔍 Verifying installation...")
    test_imports = ["openai", "requests", "json", "os", "pathlib"]
    
    failed_imports = []
    for module in test_imports:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            failed_imports.append(module)
            print(f"❌ {module}")
    
    if failed_imports:
        print(f"\n⚠️ Some modules failed to import: {', '.join(failed_imports)}")
        return False
    return True

def print_next_steps():
    """Print helpful next steps for the user."""
    print("\n🎉 Development environment setup complete!")
    print("\nNext steps:")
    print("1. Activate the virtual environment:")
    if os.name == 'nt':
        print("   .venv\\Scripts\\activate")
    else:
        print("   source .venv/bin/activate")
    print("2. Run the UV transition helper to validate:")
    print("   python uv-transition-helper.py")
    print("3. Test the AI scripts:")
    print("   python propose-changes.py --help")

def setup_environment(mode="full", force=False):
    """Set up the development environment."""
    scripts_dir = Path(__file__).parent
    os.chdir(scripts_dir)
    
    print(f"🚀 Setting up proxy-smart AI development environment (mode: {mode})")
    
    # Check and install UV if needed
    if not check_uv_installed():
        return False
    
    # Create virtual environment
    if not create_virtual_environment(force):
        return False
    
    # Install dependencies
    if not install_dependencies():
        return False
    
    # Verify installation
    if not verify_installation():
        return False
    
    print_next_steps()
    return True

def main():
    parser = argparse.ArgumentParser(description="Set up proxy-smart AI development environment")
    parser.add_argument("--mode", choices=["full", "basic"], default="full",
                       help="Installation mode: full (with dev tools) or basic")
    parser.add_argument("--force", action="store_true",
                       help="Force recreate virtual environment")
    
    args = parser.parse_args()
    
    success = setup_environment(args.mode, args.force)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
