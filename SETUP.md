# Setup Guide

## Prerequisites
- Node.js >= 18.0.0
- npm (comes with Node.js)
- An Anthropic API key

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/vibedatascience/d3_jr_data_analyst.git
cd d3_jr_data_analyst
```

### 2. Install Dependencies
```bash
npm install
```

This will install:
- `express` - Web server framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable loader

### 3. Set Up Environment Variables

**Option A: Copy and edit the example file**
```bash
cp .env.example .env
```

Then edit `.env` and add your Anthropic API key:
```env
ANTHROPIC_API_KEY=your_actual_api_key_here
PORT=3001
```

**Option B: Create .env file manually**
```bash
# Create a new .env file
cat > .env << 'EOF'
ANTHROPIC_API_KEY=your_actual_api_key_here
PORT=3001
EOF
```

### 4. Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-api03-...`)
6. Paste it into your `.env` file

### 5. Start the Server

**Production mode:**
```bash
npm start
```

**Development mode (with auto-reload):**
```bash
npm run dev
```

### 6. Open in Browser

Navigate to: **http://localhost:3001**

You should see the D3.js visualization chatbot interface!

## Troubleshooting

### "API key: ⚠️ MISSING"

**Problem:** The server can't find your API key.

**Solutions:**
1. Check that `.env` file exists in the root directory
2. Verify the `.env` file contains `ANTHROPIC_API_KEY=your_key`
3. Make sure there are no spaces around the `=` sign
4. Restart the server after creating/editing `.env`
5. Check that `dotenv` package is installed: `npm install dotenv`

### "Cannot find module 'dotenv'"

**Problem:** dotenv package is not installed.

**Solution:**
```bash
npm install dotenv
```

### "Port already in use"

**Problem:** Another process is using port 3001.

**Solutions:**
1. Change the port in `.env`: `PORT=3002`
2. Or kill the process using port 3001:
   ```bash
   # On Mac/Linux
   lsof -ti:3001 | xargs kill -9

   # On Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```

### Module import errors

**Problem:** Error importing ES modules.

**Solution:**
- Ensure `package.json` has `"type": "module"`
- Ensure Node.js version >= 18.0.0: `node --version`

## File Structure

After setup, your directory should look like:
```
d3_jr_data_analyst/
├── .env                 # Your API key (DO NOT COMMIT!)
├── .env.example         # Template for .env
├── .gitignore           # Ensures .env is not committed
├── server.js            # Main entry point
├── package.json         # Dependencies
├── config/              # Configuration
├── prompts/             # AI prompts
├── tools/               # Tool implementations
├── services/            # Core services
├── routes/              # API routes
└── public/              # Frontend files
```

## Security Notes

⚠️ **NEVER commit your `.env` file to git!**

The `.gitignore` file is configured to exclude `.env`, but always double-check before pushing:
```bash
git status
# Make sure .env is NOT listed
```

## Next Steps

Once the server is running:
1. Try example prompts from the README
2. Explore the three modes: Explore, Dashboard, Story
3. Upload your own CSV data
4. Create custom visualizations

## Getting Help

- Check REFACTORING.md for code structure
- Review README.md for usage examples
- File issues at: https://github.com/vibedatascience/d3_jr_data_analyst/issues
