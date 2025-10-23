/**
 * Tool definitions for Claude API
 * These define what tools are available to the AI assistant
 */
export const TOOL_DEFINITIONS = [
  {
    name: "execute_javascript",
    description: `Execute JavaScript code to analyze data, test code, perform computations, or understand data structures.

🚨 CRITICAL USAGE RULES:
1. **FIRST**: Use this tool to FETCH and ANALYZE data from user-provided URLs OR CREATE DATASET USING UNFORMATTED DATA
3. **CHECK TOOL RESULTS** - If previous execute_javascript returned dataId, DATA IS ALREADY SAVED!
4. Use console.log() to output results - all output will be captured and returned
5. Code runs in Node.js environment with fetch, Buffer, URL, etc. available
6. USE THIS SPARINGLY AS IT COSTS 10000 USD PER TOOL CALL

💾 **DATA PERSISTENCE - CRITICAL:**
- If you **return** an array or object, it's AUTOMATICALLY SAVED with a dataId
- Tool result will show: "dataId": "dataset_1234567890" ← DATA IS SAVED!
- The saved data is AUTOMATICALLY available in create_dashboard as **__STORED_DATA__**
- **DO NOT** hard-code data in create_dashboard if dataId exists!
- Just use: const data = __STORED_DATA__; (it's already there!)

⚠️ GITHUB DATA - SPECIAL CASE:
- For GitHub URLs (raw.githubusercontent.com or api.github.com), **DO NOT save locally**
- Instead, **fetch directly in create_dashboard** using the GitHub URL
- GitHub's API is reliable and always up-to-date, no need for local persistence
- Example: Use fetch() directly in the dashboard code to get latest data

⚠️ WHEN TO SAVE DATA:
- Save data (by returning it) for: user-provided data, CSV uploads, computed datasets
- DON'T save data for: GitHub URLs, external APIs that should stay fresh
- ONLY call execute_javascript again if:
  1. User provides a DIFFERENT data source
  2. User asks to transform/filter existing data
- Otherwise, just use __STORED_DATA__ in create_dashboard (for saved data)

EXAMPLE WITH DATA PERSISTENCE:
\`\`\`javascript
// Step 1: Fetch and return data in execute_javascript
const response = await fetch('https://raw.githubusercontent.com/user/repo/data.csv');
const text = await response.text();
const rows = text.trim().split('\\n');
const data = rows.slice(1).map(row => {
  const [name, value] = row.split(',');
  return { name, value: +value };
});

console.log('Loaded', data.length, 'rows');
return data; // 💾 THIS GETS SAVED AUTOMATICALLY
\`\`\`

\`\`\`javascript
// Step 2: Use the data in create_dashboard
const viz = document.getElementById('viz');
viz.innerHTML = '';

// 💾 __STORED_DATA__ is automatically available!
const data = __STORED_DATA__;

// Build your D3 chart with the saved data
// No need to fetch() or hard-code anything!
\`\`\`
k`,
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript code to execute. Use console.log() for output. Code runs as async function, so you can use await."
        },
        timeout: {
          type: "number",
          description: "Optional execution timeout in milliseconds (default: 30000, max: 60000)"
        }
      },
      required: ["code"]
    }
  },
  {
    name: "create_dashboard",
    description: `Create a D3.js visualization, dashboard, OR scrollytelling story. This tool validates your D3 code and sends it to the client for rendering.

📖 **SCROLLYTELLING SUPPORT:**
- Scrollama.js is available (window.scrollama)
- Use scrollytelling for narrative data stories (Pudding.cool style)
- See SCROLLYTELLING section in system prompt for full examples
- Use when user requests "story", "narrative", or "scrollytelling"

💾 **DATA PERSISTENCE:**
- If you RETURNED data from execute_javascript, it's automatically available as **__STORED_DATA__**
- Use this instead of fetch() or hard-coding data
- Just reference: const data = __STORED_DATA__;

YOU CAN USE TO CREATE: VISUALIZATIONS, DASHBOARDS, AND SCROLLYTELLING STORIES.
IF DOING EDA, CREATE GRAPHS FIRST AND THEN MAYBE WE CAN BUILD DASHBOARDS/STORIES LATER.

ENSURE YOU FOLLOW THE PLAYBOOK GUIDELINES FOR EFFECTIVE VISUALIZATIONS.

CODE REQUIREMENTS:
✅ Must start with: const viz = document.getElementById('viz');
✅ Must clear ONCE: viz.innerHTML = '';
✅ Must use REAL data: __STORED_DATA__ (if available) OR d3.csv() OR fetch() (NEVER fake/sample data)
✅ Dashboard Must include: tooltips on all interactive elements
✅ Dashboard Must include: accessibility (role, aria-label, tabindex, focus states)
✅ Dashboard Must include: responsive sizing (viz.offsetWidth)
✅ Must use: .join() for data binding (not enter/update/exit)
✅ Dashboard Must use: Economist color palette (#006BA2, #E3120B, #3EBCD2, #EBB434, #379A8B)
✅ Dashboard Must include: title, axis labels, source attribution
✅ Dashboard Must handle: both mouse (mouseover/mouseout) and keyboard (focus/blur) events


\`\`\`

RETURN: Server validates code and frontend renders the visualization immediately.`,
    input_schema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Complete D3.js visualization code. Must be self-contained and executable."
        },
        title: {
          type: "string",
          description: "Optional title for the dashboard"
        },
        description: {
          type: "string",
          description: "Optional description of what the visualization shows"
        }
      },
      required: ["code"]
    }
  }
];
