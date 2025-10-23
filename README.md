# D3.js Visualization Chatbot 📊

An AI-powered chatbot that creates beautiful, interactive D3.js visualizations in real-time using Claude API.

## Features

✨ **Real-time D3.js Generation** - Claude creates custom visualizations on the fly
🎨 **Beautiful Color Palette** - Consistent branded colors throughout
💬 **Streaming Responses** - See visualizations render as Claude types
📊 **Multiple Chart Types** - Bar, line, scatter, pie, donut, and more
🎯 **Interactive Charts** - Hover effects, transitions, and animations
📈 **Dashboard Support** - Create multi-chart dashboards with grid layouts

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Server

```bash
npm start
```

Or with auto-reload during development:
```bash
npm run dev
```

### 3. Open in Browser

Navigate to: **http://localhost:3002**

## Example Prompts

### Single Charts
- "Create a bar chart showing quarterly sales: Q1: 45000, Q2: 62000, Q3: 58000, Q4: 71000"
- "Make a line chart showing temperature over a week"
- "Create a scatter plot showing correlation between study hours and test scores"
- "Show a pie chart of browser market share: Chrome 65%, Safari 18%, Firefox 10%, Edge 7%"

### Dashboards
- "Create a 2x2 dashboard with a revenue KPI card, bar chart, line chart, and pie chart"
- "Build an analytics dashboard with 3 KPI cards at the top and charts below"
- "Make an executive dashboard showing sales metrics"

## How It Works

```
User: "Create a bar chart"
  ↓
Browser sends message to Express server
  ↓
Server streams to Claude API
  ↓
Claude generates D3.js code in markdown
  ↓
Frontend parses stream and finds JavaScript blocks
  ↓
Code executes automatically in browser
  ↓
📊 Chart appears in visualization panel!
```

## Project Structure

```
d3/
├── server.js              # Express backend with Claude API integration
├── public/
│   ├── index.html         # Main UI with chat and visualization panels
│   └── app.js             # Frontend logic for streaming and D3 execution
├── package.json           # Dependencies
├── sample_data.csv        # Example data for testing
└── README.md              # This file
```

## Color Palette

The chatbot uses a consistent, professional color scheme:

- **Primary/Critical**: `#E3120B` (Red) - alerts, negative trends
- **Technical/Blue**: `#006BA2` (Blue) - main data, bars, lines
- **Success/Green**: `#379A8B` (Green) - positive trends, success states
- **Warning/Yellow**: `#EBB434` (Yellow) - warnings, highlights
- **Secondary/Grey**: `#758D99` (Grey) - labels, axes, secondary info

## API Endpoints

### `POST /api/chat`
Streams responses from Claude API using Server-Sent Events (SSE)

**Request:**
```json
{
  "message": "Create a bar chart",
  "conversationHistory": [...]
}
```

**Response:** SSE stream with `text/event-stream` content type

### `GET /api/health`
Health check endpoint - returns server status

### `GET /`
Serves the main application interface

## Technologies

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Node.js** | Backend runtime | >=18.0.0 |
| **Express** | Web server | 4.18.2 |
| **D3.js** | Data visualization | v7 (CDN) |
| **Claude API** | AI code generation | Sonnet 4.5 |
| **Marked.js** | Markdown rendering | Latest (CDN) |
| **SSE** | Real-time streaming | Native |

## Development

Run with auto-reload (requires nodemon):
```bash
npm run dev
```

The server will restart automatically when you modify files.

## Configuration

### API Key
The Anthropic API key is currently set in `server.js` (line 8). For production, use environment variables:

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
node server.js
```

### Port
Default port is 3002. To change it, modify `PORT` in `server.js` (line 6).

## D3.js Best Practices

The chatbot's system prompt teaches Claude to follow modern D3.js patterns:

- ✅ Use `.join()` for data binding (not enter/update/exit)
- ✅ Add smooth transitions with `.transition().duration()`
- ✅ Include interactive tooltips on hover
- ✅ Format numbers with `d3.format()`
- ✅ Use the margin convention for axes
- ✅ For dashboards: create separate containers for each chart
- ✅ Use CSS Grid for responsive layouts

## Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari

## Troubleshooting

### Port already in use
```bash
# Find and kill the process
lsof -ti:3002 | xargs kill -9

# Or change the port in server.js
const PORT = 3003;
```

### Dependencies not installed
```bash
npm install
```

### API Key error
Make sure the API key in `server.js` is valid or set the `ANTHROPIC_API_KEY` environment variable.

## Tips for Best Results

1. **Be specific with data** - Include actual numbers in your prompt
2. **Request interactivity** - Ask for "hover effects" or "clickable bars"
3. **Specify layout** - For dashboards, say "2x2 grid" or "3 columns"
4. **Ask for styling** - Request "professional styling" or "modern design"
5. **Iterate** - Ask Claude to "make the bars bigger" or "change colors to blue"

## License

MIT

---

**Made with ❤️ using Claude & D3.js**
