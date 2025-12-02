#!/bin/bash
# Quick Setup Script for ESLint + Prettier (Unix/Mac)
# Run this after creating the project structure

echo "🚀 Installing dependencies for Backend..."
cd backend
npm install

echo ""
echo "🚀 Installing dependencies for Frontend..."
cd ../frontend
npm install

echo ""
echo "🚀 Installing root dependencies (Husky + lint-staged)..."
cd ..
npm install

echo ""
echo "🎣 Setting up Git hooks..."
npm run prepare

echo ""
echo "✅ Setup complete!"
echo ""
echo "You can now run:"
echo "  npm run lint       - Lint all code"
echo "  npm run format     - Format all code"
echo "  npm run dev        - Start dev servers"
