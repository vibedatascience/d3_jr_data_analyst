# Refactoring Documentation

## Overview
The codebase has been refactored from a single 1465-line monolithic file into a clean, modular architecture with separation of concerns.

## New Project Structure

```
d3/
├── server.js                    # Main server entry point (~40 lines)
├── config/
│   └── constants.js             # Configuration constants
├── prompts/
│   ├── index.js                 # Prompt selector function
│   ├── shared.js                # Shared base prompt
│   ├── eda.js                   # EDA mode prompt
│   ├── edaPlaybook.js           # EDA playbook (detailed guide)
│   ├── dashboard.js             # Dashboard mode prompt
│   └── story.js                 # Story mode prompt
├── tools/
│   ├── index.js                 # Tool exports
│   ├── executeJavaScript.js     # JavaScript execution tool
│   ├── createDashboard.js       # Dashboard creation tool
│   └── definitions.js           # Claude API tool definitions
├── services/
│   ├── dataStore.js             # Data persistence service
│   └── streamHandler.js         # SSE stream processing
└── routes/
    └── chat.js                  # Chat endpoint handler
```

## Key Improvements

### 1. **Modularity**
- Each file has a single, clear responsibility
- Easy to locate and modify specific functionality
- Improved code reusability

### 2. **Maintainability**
- Reduced file sizes (~100-300 lines each)
- Clear imports show dependencies
- JSDoc comments document functions

### 3. **Testability**
- Each module can be tested independently
- Tools and services are easily mockable
- Clear function signatures

### 4. **Readability**
- Logical file organization
- Separation of prompts from code
- Clear naming conventions

## File Responsibilities

### `server.js`
- Express app setup
- Middleware configuration
- Route registration
- Server startup

### `config/constants.js`
- Environment variables
- API configuration
- Execution limits
- All magic numbers in one place

### `prompts/`
- All AI system prompts
- Mode-specific instructions
- EDA playbook separate from code
- Easy to update prompts without touching logic

### `tools/`
- Tool implementations
- Tool definitions for Claude API
- Isolated tool logic

### `services/`
- **dataStore.js**: In-memory data persistence
- **streamHandler.js**: SSE streaming and tool execution

### `routes/`
- **chat.js**: Chat endpoint logic
- API calls to Claude
- Main conversation loop

## Migration Guide

### Before (Old Code)
```javascript
// Everything in server.js (1465 lines)
const SHARED_BASE_PROMPT = `...`;
const EDA_PLAYBOOK = `...`;
// ... 700 lines of prompts
async function executeJavaScript(...) { /* ... */ }
function createDashboard(...) { /* ... */ }
app.post('/api/chat', async (req, res) => {
  // 400+ lines of streaming logic
});
```

### After (Refactored)
```javascript
// server.js (40 lines)
import { handleChat } from './routes/chat.js';
app.post('/api/chat', handleChat);

// Prompts in separate files
import { getSystemPrompt } from './prompts/index.js';

// Tools in separate modules
import { executeJavaScript, createDashboard } from './tools/index.js';

// Services cleanly separated
import { StreamHandler } from './services/streamHandler.js';
import { dataStore } from './services/dataStore.js';
```

## Benefits

### Code Organization
- **Before**: 1 file, 1465 lines
- **After**: 15 files, ~100 lines each

### Finding Code
- **Before**: Search through entire file
- **After**: Navigate to specific module

### Making Changes
- **Before**: Risk breaking everything
- **After**: Modify isolated modules

### Testing
- **Before**: Hard to test individual parts
- **After**: Each module independently testable

### Onboarding
- **Before**: Read 1465 lines to understand
- **After**: Start with README, then explore modules

## ES Modules
The project now uses ES modules (`import`/`export`) instead of CommonJS (`require`):
- Added `"type": "module"` to package.json
- Use `import` for dependencies
- Use `export` for module exports
- Use `fileURLToPath` for `__dirname` in ES modules

## Backward Compatibility
- Old server.js saved as `server.js.old`
- API remains unchanged
- Frontend code unchanged
- All functionality preserved

## Future Improvements
- Add unit tests for each module
- Extract more configuration to environment variables
- Add TypeScript for type safety
- Create abstract tool interface
- Add logging service
- Implement caching layer for prompts
