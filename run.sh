#!/usr/bin/env bash
set -euo pipefail

# Use Windows py launcher when available (works in Git Bash), or fallback to python3
PYTHON="${PYTHON:-py}"
VENV_DIR=".venv"

if [ ! -d "$VENV_DIR" ]; then
  echo "Creating virtualenv..."
  $PYTHON -m venv "$VENV_DIR"
fi

# activate (Windows path)
source "$VENV_DIR/Scripts/activate"

echo "Upgrading pip (using python -m pip)..."
python -m pip install --upgrade pip

echo "Installing dependencies (using python -m pip)..."
python -m pip install -r requirements.txt

echo "Installing Playwright browsers..."
python -m playwright install --with-deps

echo "Starting server at http://localhost:8000..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
