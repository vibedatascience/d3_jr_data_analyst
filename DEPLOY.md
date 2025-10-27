# Render Deployment Guide

## Quick Deploy to Render

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Connect to Render
1. Go to [render.com](https://render.com)
2. Sign up/login with your GitHub account
3. Click "New +" → "Web Service"
4. Connect your GitHub repository: `vibedatascience/d3_jr_data_analyst`

### 3. Configure the Service
- **Name**: `d3-visualization-chatbot`
- **Region**: Choose closest to you
- **Branch**: `main`
- **Root Directory**: Leave empty (or set to `d3_jr_data_analyst` if needed)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. Add Environment Variables
In the Render dashboard, add:
- **Key**: `ANTHROPIC_API_KEY`
- **Value**: `[Your Anthropic API key - starts with sk-ant-api03-...]`

> **Note**: Use the same API key you have locally. Never commit API keys to version control!

### 5. Deploy!
Click "Create Web Service" and wait for deployment.

## Expected URL
Your app will be available at: `https://your-service-name.onrender.com`

## Alternative: One-Click Deploy
Use the render.yaml file in this repo for automatic configuration.

## Testing
Once deployed, try these example prompts:
- "Create a bar chart showing quarterly sales"
- "Make a pie chart of browser market share"
- "Build a dashboard with KPI cards"