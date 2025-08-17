#!/usr/bin/env python3
"""
UV Transition Helper Script
Helps migrate from pip to uv and validates dependency compatibility
"""

import subprocess
import sys
from pathlib import Path

def run_command(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and return the result"""
    print(f"🔧 Running: {' '.join(cmd)}")
    return subprocess.run(cmd, check=check, capture_output=True, text=True)

def check_uv_installed():
    """Check if uv is installed"""
    try:
        result = run_command(["uv", "--version"], check=False)
        if result.returncode == 0:
            print(f"✅ UV is installed: {result.stdout.strip()}")
            return True
        else:
            print("❌ UV is not installed")
            return False
    except FileNotFoundError:
        print("❌ UV is not found in PATH")
        return False

def install_uv():
    """Install uv using the official installer"""
    print("📦 Installing UV...")
    try:
        # Use the official UV installer
        install_cmd = [
            "curl", "-LsSf", 
            "https://astral.sh/uv/install.sh",
            "|", "sh"
        ]
        # For Windows, use PowerShell instead
        if sys.platform == "win32":
            install_cmd = [
                "powershell", "-c",
                "irm https://astral.sh/uv/install.ps1 | iex"
            ]
        
        subprocess.run(" ".join(install_cmd), shell=True, check=True)
        print("✅ UV installed successfully")
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install UV")
        return False

def validate_requirements():
    """Validate that requirements.txt works with uv"""
    requirements_file = Path("scripts/requirements.txt")
    
    if not requirements_file.exists():
        print(f"❌ Requirements file not found: {requirements_file}")
        return False
    
    print(f"🔍 Validating {requirements_file}...")
    
    try:
        # Create a temporary virtual environment
        run_command(["uv", "venv", ".uv-test-env"])
        
        # Try to install requirements
        result = run_command([
            "uv", "pip", "install", 
            "-r", str(requirements_file)
        ], check=False)
        
        if result.returncode == 0:
            print("✅ Requirements.txt is compatible with UV")
            success = True
        else:
            print("❌ Requirements.txt has issues with UV:")
            print(result.stderr)
            success = False
        
        # Cleanup
        run_command(["rm", "-rf", ".uv-test-env"], check=False)
        return success
        
    except Exception as e:
        print(f"❌ Error validating requirements: {e}")
        return False

def main():
    """Main function"""
    print("🚀 UV Transition Helper for Proxy Smart")
    print("=" * 40)
    
    # Check if UV is installed
    if not check_uv_installed():
        if input("Would you like to install UV? (y/n): ").lower() == 'y':
            if not install_uv():
                sys.exit(1)
        else:
            print("UV is required for the transition. Exiting.")
            sys.exit(1)
    
    # Validate requirements
    if validate_requirements():
        print("\n🎉 UV transition validation successful!")
        print("Your workflows will now use UV for faster Python dependency installation.")
        print("\n📊 Expected performance improvements:")
        print("  • 10-50x faster dependency resolution")
        print("  • Better caching and lockfile generation")
        print("  • Improved reproducibility")
    else:
        print("\n❌ UV transition validation failed")
        print("Please fix the requirements.txt issues before proceeding.")
        sys.exit(1)

if __name__ == "__main__":
    main()
