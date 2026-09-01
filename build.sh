#!/bin/bash
# Build script for Render
echo "Installing Node dependencies..."
npm install

echo "Installing Python dependencies..."
if command -v python3 &> /dev/null; then
    python3 -m pip install -r requirements.txt
elif command -v python &> /dev/null; then
    python -m pip install -r requirements.txt
else
    echo "Python not found, skipping Python dependencies"
fi

echo "Build complete!"
