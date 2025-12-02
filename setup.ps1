# Quick Setup Script for ESLint + Prettier
# Run this after creating the project structure

Write-Host "🚀 Installing dependencies for Backend..." -ForegroundColor Cyan
Set-Location backend
npm install

Write-Host "`n🚀 Installing dependencies for Frontend..." -ForegroundColor Cyan
Set-Location ..\frontend
npm install

Write-Host "`n🚀 Installing root dependencies (Husky + lint-staged)..." -ForegroundColor Cyan
Set-Location ..
npm install

Write-Host "`n🎣 Setting up Git hooks..." -ForegroundColor Cyan
npm run prepare

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nYou can now run:" -ForegroundColor Yellow
Write-Host "  npm run lint       - Lint all code" -ForegroundColor White
Write-Host "  npm run format     - Format all code" -ForegroundColor White
Write-Host "  npm run dev        - Start dev servers" -ForegroundColor White
