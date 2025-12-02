# ESLint + Prettier Configuration Summary

## ✅ What Was Configured

### Backend (Node.js + Express)

**Location:** `backend/`

**ESLint Configuration** (`.eslintrc.json`):

- Environment: Node.js, CommonJS, ES2021
- Extends: `eslint:recommended`, `prettier`
- Rules:
  - `no-console`: OFF (allowed in backend)
  - `no-unused-vars`: WARN
  - `prefer-const`: ERROR
  - `no-var`: ERROR

**Prettier Configuration** (`.prettierrc`):

- Semicolons: Required
- Quotes: Single
- Tab Width: 2 spaces
- Print Width: 100 chars
- Line Endings: LF (Unix-style)
- Arrow Parens: Avoid when possible

**Dependencies Added:**

```json
"devDependencies": {
  "eslint": "^8.55.0",
  "eslint-config-prettier": "^9.1.0",
  "prettier": "^3.1.1",
  "nodemon": "^3.0.2"
}
```

**Scripts Added:**

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format with Prettier
- `npm run format:check` - Check formatting

---

### Frontend (React + Vite)

**Location:** `frontend/`

**ESLint Configuration** (`.eslintrc.json`):

- Environment: Browser, Node, ES2021
- Extends: `eslint:recommended`, React rules, Hooks rules, `prettier`
- Plugins:
  - `eslint-plugin-react`
  - `eslint-plugin-react-hooks`
  - `eslint-plugin-react-refresh`
- Rules:
  - `react/prop-types`: OFF
  - `react/react-in-jsx-scope`: OFF (React 17+)
  - `react-hooks/rules-of-hooks`: ERROR
  - `react-hooks/exhaustive-deps`: WARN
  - `react-refresh/only-export-components`: WARN

**Prettier Configuration** (`.prettierrc`):

- Same as backend, plus:
- JSX Quotes: Double
- Bracket Spacing: Enabled

**Dependencies Added:**

```json
"devDependencies": {
  "eslint": "^8.55.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-react": "^7.33.2",
  "eslint-plugin-react-hooks": "^4.6.0",
  "eslint-plugin-react-refresh": "^0.4.5",
  "prettier": "^3.1.1",
  "@vitejs/plugin-react": "^4.2.1",
  "vite": "^5.0.8"
}
```

**Scripts Added:**

- `npm run lint` - Run ESLint on .js/.jsx files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format with Prettier
- `npm run format:check` - Check formatting

---

### Root Level

**Location:** `/` (project root)

**EditorConfig** (`.editorconfig`):

- Charset: UTF-8
- End of Line: LF (Unix-style)
- Insert Final Newline: true
- Trim Trailing Whitespace: true
- Indent Style: space
- Indent Size: 2

**Git Hooks** (Husky + lint-staged):

- **Husky**: Manages Git hooks
- **lint-staged**: Runs commands on staged files only

**Configuration** (`.lintstagedrc.json`):

```json
{
  "*.{js,jsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,css}": ["prettier --write"]
}
```

**Pre-commit Hook**: Automatically runs on `git commit`

1. Formats staged files with Prettier
2. Fixes ESLint issues on staged JS/JSX files
3. Only commits if all checks pass

**Root Dependencies:**

```json
"devDependencies": {
  "husky": "^8.0.3",
  "lint-staged": "^15.2.0"
}
```

**Root Scripts:**

- `npm run lint` - Lint both backend and frontend
- `npm run lint:fix` - Auto-fix in both projects
- `npm run format` - Format all code
- `npm run format:check` - Check all formatting
- `npm run prepare` - Setup Husky hooks

---

### VS Code Integration

**Location:** `.vscode/`

**Recommended Extensions** (`.vscode/extensions.json`):

- ESLint
- Prettier
- EditorConfig
- MongoDB (for database)
- ES7 React Snippets

**Workspace Settings** (`.vscode/settings.json`):

- Default Formatter: Prettier
- Format On Save: Enabled
- Auto-fix ESLint on save
- Tab Size: 2
- EOL: LF
- Insert Final Newline: true
- Trim Trailing Whitespace: true

---

## 📦 File Structure

```
DoAnChuyenNganh/
├── .editorconfig                 # Editor consistency
├── .lintstagedrc.json           # Pre-commit lint rules
├── .gitignore                   # Git ignore rules
├── package.json                 # Root monorepo config
├── setup.ps1                    # Windows setup script
├── setup.sh                     # Unix/Mac setup script
├── LINTING.md                   # Detailed linting guide
├── README.md                    # Updated with linting info
│
├── .vscode/
│   ├── extensions.json          # Recommended extensions
│   └── settings.json            # Workspace settings
│
├── backend/
│   ├── .eslintrc.json           # Backend ESLint config
│   ├── .prettierrc              # Backend Prettier config
│   ├── .prettierignore          # Files to skip formatting
│   ├── package.json             # Updated with scripts
│   └── src/
│       └── server.js            # Sample formatted file
│
└── frontend/
    ├── .eslintrc.json           # Frontend ESLint config
    ├── .prettierrc              # Frontend Prettier config
    ├── .prettierignore          # Files to skip formatting
    ├── package.json             # Updated with scripts
    ├── index.html               # Entry HTML
    ├── vite.config.js           # Vite configuration
    └── src/
        ├── main.jsx             # Entry point
        ├── App.jsx              # Sample React component
        ├── App.css              # Component styles
        └── index.css            # Global styles
```

---

## 🚀 Installation Steps

### Option 1: Automated Setup (Recommended)

**Windows (PowerShell):**

```powershell
.\setup.ps1
```

**Unix/Mac:**

```bash
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

```bash
# 1. Install all dependencies
npm run install:all

# 2. Setup Git hooks
npm run prepare

# 3. Test linting
npm run lint

# 4. Test formatting
npm run format:check
```

---

## ✅ Acceptance Criteria Met

### ✓ Backend ESLint + Prettier

- ✅ ESLint configured for Node.js + CommonJS
- ✅ Prettier integrated with ESLint
- ✅ Scripts: `lint`, `lint:fix`, `format`, `format:check`
- ✅ `.eslintrc.json`, `.prettierrc`, `.prettierignore` created

### ✓ Frontend ESLint + Prettier

- ✅ ESLint configured for React + JSX + Hooks
- ✅ Prettier integrated with ESLint
- ✅ React-specific plugins installed
- ✅ Scripts: `lint`, `lint:fix`, `format`, `format:check`
- ✅ `.eslintrc.json`, `.prettierrc`, `.prettierignore` created

### ✓ EditorConfig

- ✅ `.editorconfig` created at root
- ✅ 2 spaces indentation
- ✅ UTF-8 charset
- ✅ LF line endings

### ✓ Husky + lint-staged

- ✅ Pre-commit hook configured
- ✅ Automatically formats staged files
- ✅ Runs ESLint on staged JS/JSX files

### ✓ VS Code Integration

- ✅ Recommended extensions list
- ✅ Workspace settings for auto-format
- ✅ ESLint auto-fix on save

---

## 🧪 Testing Commands

After installation, test with:

```bash
# From root
npm run lint          # Should lint both projects (may warn about missing source files)
npm run format:check  # Should check formatting

# From backend
cd backend
npm run lint          # Should pass with no errors
npm run format        # Should format server.js

# From frontend
cd frontend
npm run lint          # Should pass with no errors
npm run format        # Should format App.jsx and other files
```

---

## 📝 Next Steps

1. **Install dependencies:**

   ```bash
   npm run install:all
   ```

2. **Setup Git hooks:**

   ```bash
   npm run prepare
   ```

3. **Start developing:**

   ```bash
   npm run dev
   ```

4. **Before committing:**
   - Pre-commit hook will automatically format and lint staged files
   - Or manually run: `npm run lint:fix && npm run format`

---

## 🔧 Configuration Files Reference

### Backend `.eslintrc.json`

```json
{
  "env": {
    "node": true,
    "es2021": true,
    "commonjs": true
  },
  "extends": ["eslint:recommended", "prettier"],
  "parserOptions": {
    "ecmaVersion": "latest"
  },
  "rules": {
    "no-console": "off",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Frontend `.eslintrc.json`

```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
    "prettier"
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "ecmaFeatures": { "jsx": true }
  },
  "plugins": ["react", "react-hooks", "react-refresh"],
  "settings": {
    "react": { "version": "detect" }
  },
  "rules": {
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
    "react-refresh/only-export-components": [
      "warn",
      { "allowConstantExport": true }
    ]
  }
}
```

### `.prettierrc` (Same for both)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

---

## 📚 Documentation

- **Detailed Guide:** See [`LINTING.md`](./LINTING.md)
- **Main README:** See [`README.md`](./README.md)
- **Project Overview:** See [`.github/copilot-instructions.md`](./.github/copilot-instructions.md)
