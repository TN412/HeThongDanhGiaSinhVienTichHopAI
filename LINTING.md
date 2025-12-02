# ESLint + Prettier Setup Guide

This project is configured with ESLint and Prettier for both backend and frontend.

## Configuration Overview

### Backend (Node.js + CommonJS)

- **ESLint**: Node.js environment, CommonJS modules
- **Prettier**: Integrated with ESLint
- **Config files**:
  - `.eslintrc.json` - ESLint rules
  - `.prettierrc` - Prettier formatting rules
  - `.prettierignore` - Files to exclude from formatting

### Frontend (React + JSX)

- **ESLint**: React, JSX, Hooks rules
- **Prettier**: Integrated with ESLint
- **Plugins**:
  - `eslint-plugin-react` - React specific linting
  - `eslint-plugin-react-hooks` - React Hooks rules
  - `eslint-plugin-react-refresh` - Fast Refresh support
- **Config files**:
  - `.eslintrc.json` - ESLint rules
  - `.prettierrc` - Prettier formatting rules
  - `.prettierignore` - Files to exclude from formatting

### Root Level

- **EditorConfig**: Ensures consistent coding styles (2 spaces, UTF-8, LF)
- **Husky**: Git hooks for pre-commit checks
- **lint-staged**: Run linters on staged files only

## Installation

### 1. Install all dependencies

```bash
# From root directory
npm run install:all

# Or manually
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Setup Git hooks (Husky)

```bash
# From root directory
npm run prepare
```

This will:

- Install Husky hooks
- Configure pre-commit hook to run lint-staged
- Automatically format staged files before commit

## Available Scripts

### Root (Monorepo)

```bash
npm run lint            # Lint both backend and frontend
npm run lint:fix        # Auto-fix lint issues in both projects
npm run format          # Format all files with Prettier
npm run format:check    # Check if files are formatted correctly
```

### Backend

```bash
cd backend
npm run lint            # Lint backend code
npm run lint:fix        # Auto-fix lint issues
npm run format          # Format backend files
npm run format:check    # Check formatting
npm run dev             # Run development server with nodemon
```

### Frontend

```bash
cd frontend
npm run lint            # Lint frontend code
npm run lint:fix        # Auto-fix lint issues
npm run format          # Format frontend files
npm run format:check    # Check formatting
npm run dev             # Run Vite dev server
```

## Pre-commit Hook

When you commit changes, the pre-commit hook will automatically:

1. Run Prettier on staged `.js`, `.jsx`, `.json`, `.md`, `.css` files
2. Run ESLint with auto-fix on staged `.js`, `.jsx` files
3. Only commit if all checks pass

To bypass the hook (not recommended):

```bash
git commit --no-verify -m "commit message"
```

## Editor Integration

### VS Code (Recommended)

Install these extensions:

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)
- **EditorConfig** (`editorconfig.editorconfig`)

Add to your `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "javascriptreact"]
}
```

### Other Editors

- **WebStorm/IntelliJ**: Built-in ESLint and Prettier support
- **Sublime Text**: Install SublimeLinter-eslint and JsPrettier
- **Vim/Neovim**: Use ALE or coc-eslint + coc-prettier

## Formatting Rules

### Common Settings (Both Projects)

- **Semicolons**: Required (`;`)
- **Quotes**: Single quotes (`'`)
- **Trailing Commas**: ES5 style (objects, arrays)
- **Tab Width**: 2 spaces
- **Print Width**: 100 characters
- **Arrow Function Parens**: Avoid when possible
- **End of Line**: LF (Unix-style)

### Frontend Specific

- **JSX Quotes**: Double quotes (`"`)
- **Bracket Spacing**: Enabled
- **JSX Brackets**: New line

## Troubleshooting

### "Parsing error" in .jsx files

Make sure you have all React ESLint plugins installed:

```bash
cd frontend
npm install --save-dev eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

### Prettier and ESLint conflicts

We use `eslint-config-prettier` to disable ESLint rules that conflict with Prettier.
Make sure it's the last item in the `extends` array in `.eslintrc.json`.

### Husky hooks not running

```bash
# Reinstall husky
npm run prepare

# Check if .husky directory exists
ls -la .husky

# Make sure pre-commit script is executable (Unix/Mac)
chmod +x .husky/pre-commit
```

### Line ending issues (Windows)

Git may convert LF to CRLF on Windows. Configure Git:

```bash
git config --global core.autocrlf false
git config --global core.eol lf
```

## Manual Formatting

Format specific files:

```bash
# Backend
npx prettier --write backend/src/server.js

# Frontend
npx prettier --write frontend/src/App.jsx

# All JS files in a directory
npx prettier --write "backend/src/**/*.js"
npx prettier --write "frontend/src/**/*.{js,jsx}"
```

Lint specific files:

```bash
# Backend
npx eslint backend/src/server.js --fix

# Frontend
npx eslint frontend/src/App.jsx --fix
```

## CI/CD Integration

Add to your `.github/workflows/ci.yml`:

```yaml
- name: Lint and Format Check
  run: |
    npm run lint
    npm run format:check
```

## Best Practices

1. ✅ **Always run linter before committing** - Or let the pre-commit hook do it
2. ✅ **Fix warnings** - Don't ignore ESLint warnings
3. ✅ **Use editor integration** - Format on save is your friend
4. ✅ **Consistent formatting** - Let Prettier handle it automatically
5. ❌ **Don't disable rules globally** - Use inline comments sparingly
6. ❌ **Don't commit with `--no-verify`** - Fix issues instead

## Common ESLint Rules

### Backend

- `no-console`: OFF (allowed in backend)
- `no-unused-vars`: WARN
- `prefer-const`: ERROR
- `no-var`: ERROR

### Frontend

- `react/prop-types`: OFF (using TypeScript types instead)
- `react/react-in-jsx-scope`: OFF (React 17+ JSX transform)
- `react-hooks/rules-of-hooks`: ERROR
- `react-hooks/exhaustive-deps`: WARN
- `react-refresh/only-export-components`: WARN

## Resources

- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [React ESLint Plugin](https://github.com/jsx-eslint/eslint-plugin-react)
- [EditorConfig](https://editorconfig.org/)
- [Husky](https://typicode.github.io/husky/)
