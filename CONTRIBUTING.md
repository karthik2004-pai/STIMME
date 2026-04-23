# Contributing to Stimme

Thank you for your interest in contributing to **Stimme**! 🎵

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/karthik2004-pai/Stimme/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the behavior
   - Expected vs. actual behavior
   - Screenshots if applicable
   - Your environment (OS, Python version, browser)

### Suggesting Features

1. Open a new issue with the `enhancement` label
2. Describe the feature and why it would be useful
3. Include mockups or examples if possible

### Pull Requests

1. **Fork** the repo and create your branch from `main`
2. **Install** dependencies for both backend and landing page
3. **Make** your changes with clear, descriptive commits
4. **Test** your changes thoroughly
5. **Submit** a Pull Request with a detailed description

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Stimme.git
cd Stimme

# Backend
cd backend
pip install -r requirements.txt
python main.py

# Landing page (separate terminal)
cd landing
npm install
npm run dev
```

### Code Style

- **Python:** Follow PEP 8 conventions
- **JavaScript:** Use ES6+ features, consistent formatting
- **CSS:** Follow the existing Neural Pulse design system variables
- **React/TSX:** Functional components with hooks

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add voice fingerprinting module`
- `fix: resolve audio format detection for WebM`
- `docs: update API reference table`
- `style: improve mobile responsive layout`

## Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something amazing together.

---

**Thank you for helping make Stimme better!** 🚀
