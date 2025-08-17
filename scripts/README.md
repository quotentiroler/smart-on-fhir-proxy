# Junior AI Setup Guide

## 🚀 Quick Start (Modern UV Setup - Recommended)

We've migrated to **Astral UV** for 10-50x faster dependency installation! 

### Option 1: Modern UV Setup (Fastest)
```bash
cd scripts
python install-dev.py --mode=full
```
This gives you:
- ⚡ **Ultra-fast installation** with UV (10-50x faster than pip)
- ✅ All core features (web scraping, browser automation, text search)
- ✅ Development tools (pytest, black, ruff)
- ✅ Optional semantic search setup
- 📦 Modern Python project structure

### Option 2: Basic UV Setup
```bash
cd scripts
python install-dev.py --mode=basic
```

### Option 3: Legacy pip Setup (Fallback)
```bash
cd scripts
pip install -r requirements.txt
```

> 📖 **See [UV_MIGRATION_GUIDE.md](UV_MIGRATION_GUIDE.md) for complete migration details**

## What You Get

### Core Features (Always Available)
- 📁 `list_directory` - Explore project structure
- 📖 `read_file` - Read and analyze code  
- 🔍 `search_files` - Text-based pattern matching
- 🌐 `fetch_webpage` - Web scraping with BeautifulSoup
- 🎭 `create_playwright_automation` - Generate browser automation scripts
- 🛠️ `create_dynamic_tool` - Build custom MCP tools on demand
- 📦 Sandbox testing environment
- 🤝 Friend AI collaboration via A2A protocol

### Optional Features (With ML Dependencies)
- 🧠 `semantic_search` - SBERT-powered code similarity search

## Usage

```bash
python propose-changes.py test-error.log
```

The system automatically detects what dependencies are available and adapts accordingly!

## Dependencies Breakdown

| Component | Size | Required | Purpose |
|-----------|------|----------|---------|
| requests | ~1MB | ✅ Required | API calls |
| beautifulsoup4 | ~1MB | ✅ Required | Web scraping |
| playwright | ~50MB | ✅ Required | Browser automation |
| python-dotenv | <1MB | ✅ Required | Environment variables |
| **torch (CPU)** | ~100MB | ❌ Optional | ML backend for semantic search |
| **sentence-transformers** | ~50MB | ❌ Optional | Code embedding models |
| **scikit-learn** | ~30MB | ❌ Optional | ML utilities |

**Total Required:** ~52MB  
**Total with Semantic Search:** ~232MB

## Troubleshooting

### "SBERT dependencies not available"
This is normal if you chose basic setup. The system uses regular text search instead.

### Playwright browser install fails
Run manually: `playwright install`

### Import errors
Make sure you're in the `scripts/` directory when running commands.
