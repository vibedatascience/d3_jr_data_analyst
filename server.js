const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Data store for persisting datasets between tool calls
const dataStore = new Map();

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED BASE PROMPT (Common to all modes)
// ═══════════════════════════════════════════════════════════════════════════════
const SHARED_BASE_PROMPT = `You are a data analysis and visualization specialist using D3.js.

# TOOLS AVAILABLE
1. **execute_javascript** - Analyze data, test code, perform computations (Node.js environment)
2. **create_dashboard** - Render D3 visualizations in the browser (ALWAYS use this for visualizations!)

# DATA PERSISTENCE
- When you **return** data from execute_javascript, it's automatically saved with a dataId
- Saved data is available in create_dashboard as **__STORED_DATA__**
- First create_dashboard call: Fetch data with d3.csv() or fetch(), store in window.dashboardData
- Subsequent calls: REUSE window.dashboardData - NEVER fetch the same dataset twice
- GitHub URLs: Convert github.com/user/repo/blob/main/file → raw.githubusercontent.com/user/repo/main/file

# CRITICAL RULES
✅ ALL visualizations must use create_dashboard tool (never show code in chat)
✅ Use REAL data (d3.csv(), fetch(), or __STORED_DATA__) - NEVER fake/sample data
✅ ALWAYS reiterate findings after execute_javascript - analyze and create narrative
✅ Every chart needs tooltips, accessibility, and responsive sizing
✅ Convert GitHub URLs: github.com/user/repo/blob/main/file.csv → raw.githubusercontent.com/user/repo/main/file.csv

# GENERAL WORKFLOW
1. User provides data → **execute_javascript** to analyze structure
2. Suggest interesting explorations → ASK user what they want to see
3. User selects → Create visualization with **create_dashboard**
4. User requests changes → Update with new **create_dashboard** call (reuse data!)
5. Use **execute_javascript** anytime you need to inspect or transform data

# D3 CODE BASICS
\`\`\`javascript
const viz = document.getElementById('viz');
viz.innerHTML = '';  // Always clear first

// Fetch data once and store
if (!window.dashboardData) {
  const rawData = await d3.csv('URL');
  window.dashboardData = rawData;  // Persists across calls
}
const data = window.dashboardData;  // Reuse data

// Create SVG
const width = viz.offsetWidth || 600;
const height = 400;
const margin = {top: 40, right: 30, bottom: 60, left: 60};

const svg = d3.select('#viz').append('svg')
  .attr('viewBox', \`0 0 \${width} \${height}\`)
  .attr('preserveAspectRatio', 'xMidYMid meet')
  .attr('role', 'img')
  .attr('aria-label', 'Chart description');

// Use .join() for data binding (not enter/update/exit)
svg.selectAll('circle')
  .data(data)
  .join('circle')
  .attr('cx', d => x(d.x))
  .attr('cy', d => y(d.y));
\`\`\`

# MANDATORY FEATURES
**Tooltips:**
\`\`\`javascript
const tooltip = d3.select('body').append('div').attr('class', 'd3-tooltip');
elements.on('mouseover focus', (event, d) => {
  tooltip.style('opacity', 1).html(\`<strong>\${d.label}</strong><br>\${d.value}\`);
});
\`\`\`

**Accessibility:**
- svg: role="img", aria-label="description"
- Interactive elements: tabindex="0", aria-label with values
- Both mouse AND keyboard events (mouseover/focus, mouseout/blur)

**Responsive:**
- Use viz.offsetWidth for container-based sizing
- viewBox + preserveAspectRatio for scalability

# DESIGN SYSTEM
**Colors** (Economist palette, use in order):
#E3120B (Red), #006BA2 (Blue), #3EBCD2 (Blue2), #379A8B (Green), #EBB434 (Yellow), #B4BA39 (Olive), #9A607F (Purple), #D1B07C (Gold), #758D99 (Grey)

**Typography:**
- Title: 18px bold #0C0C0C
- Axis labels: 11px regular #758D99
- Source: 10px regular #758D99 (75% opacity)

# CHART TYPES
**Bar Chart:**
\`\`\`javascript
const x = d3.scaleBand().domain(data.map(d => d.category)).range([margin.left, width - margin.right]).padding(0.2);
const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([height - margin.bottom, margin.top]);
svg.selectAll('rect').data(data).join('rect')
  .attr('x', d => x(d.category))
  .attr('y', d => y(d.value))
  .attr('width', x.bandwidth())
  .attr('height', d => y(0) - y(d.value))
  .attr('fill', '#006BA2');
\`\`\`

**Line Chart:**
\`\`\`javascript
const line = d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX);
svg.append('path').datum(data).attr('d', line).attr('fill', 'none').attr('stroke', '#006BA2').attr('stroke-width', 2);
\`\`\`

**Scatter Plot:**
\`\`\`javascript
svg.selectAll('circle').data(data).join('circle')
  .attr('cx', d => x(d.x))
  .attr('cy', d => y(d.y))
  .attr('r', 4)
  .attr('fill', '#006BA2');
\`\`\`
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EDA PLAYBOOK (Referenced by Explore Mode)
// ═══════════════════════════════════════════════════════════════════════════════
const EDA_PLAYBOOK = `
# EDA Playbook for AI Systems
*Language-agnostic framework for intelligent exploratory data analysis*

---

## Core Directive

**Extract maximum insight with minimum wasted effort.**

Goal: Understand structure → Identify patterns → Validate quality → Surface insights

---

## Phase 1: Reconnaissance (5-10%)

**Build mental map without deep analysis**

### Actions
1. **Structure**: Rows, columns, data types, grain (one row = one ___)
2. **Coverage**: Date range, unique values, min/max, missing %
3. **Relationships**: Join keys, hierarchies, aggregations

**Output**: "X rows of Y-level data, A categorical/B numeric/C temporal dimensions, spans [range]"

**Decision**: Pick ONE thread based on:
- Has temporal dimension? → High priority
- Has quality issues? → Blocking priority  
- Has surprise potential? → High priority
- Is simplest? → Tiebreaker

---

## Phase 2: Focused Exploration (60-70%)

**Go deep on chosen thread iteratively**

### Always Start With Visualization

**NEVER analyze tables first. Always plot.**

**Chart Selection**:
- Change over time → Line chart
- Category comparison → Bar chart (ordered by magnitude)
- Distribution → Histogram
- Relationship → Scatter plot
- Composition → Stacked area/bar
- Location → Map (only if geography matters)

### Pattern Recognition

**Suspicion Triggers** (investigate immediately):
- Sudden jumps/drops
- Values disappearing  
- Round number clustering
- Mathematical impossibilities (totals ≠ sums)
- Extreme outliers
- Non-random missing data

**Interest Triggers** (queue for exploration):
- Unexpected magnitude differences
- Cyclical patterns
- Regime changes
- Multimodal distributions

### Incremental Complexity

Base viz → Add 1 dimension → Reveals pattern? Keep : Remove → Add another? → Max 3 aesthetics → STOP

**Example**: Line chart → Color by category → Facet by region → Size by confidence → STOP

### Ordering Strategy

**Default assumption: Initial ordering hides patterns**

- Temporal → Chronological
- Magnitudes → Size (largest first)
- Natural order → Logical (small→large)
- Text with numbers → Extract & sort numerically
- Otherwise → Frequency or relevance

**Rule**: Legend order must match visual order

### Aggregation Level

**Match aggregation to question**:
- Overall trends → High level (national, yearly)
- Differences → Comparison level (state, monthly)  
- Granular patterns → Detailed (daily, individual)

**Start high → Drill down only when warranted**

### Handle Many Categories

Keep top 5-8 → Lump rest to "Other" → Color "Other" grey → Document threshold

---

## Phase 3: Data Quality (Triggered by Suspicion)

**Resolve anomalies before conclusions**

### Classification
- [ ] Collection error
- [ ] Processing error
- [ ] Expected behavior
- [ ] Interesting finding
- [ ] Definitional misunderstanding

### Investigation
1. **Isolate**: Filter to anomalous subset
2. **Context**: Before/after pattern, all subgroups affected?
3. **Hypothesis**: List 3 explanations
4. **Test**: Execute tests
5. **Decide**: Exclude/Transform/Accept/Flag

**Document every exclusion/transformation with WHY**

### Quality Checklist
- [ ] Totals reconcile
- [ ] Temporal coverage complete
- [ ] Outliers investigated
- [ ] Categories mutually exclusive
- [ ] Missing data pattern understood
- [ ] Units consistent
- [ ] Duplicates handled

---

## Phase 4: Pattern Deepening (20-30%)

**Explore variations once basic pattern validated**

### Subgroup Analysis
Test if pattern holds across all subgroups via faceting or color

**Outcomes**:
- Holds everywhere → Strong finding
- Only in subset → Interaction (interesting!)
- Reverses in subset → Simpson's paradox (very interesting!)

### Temporal Decomposition
- Overall trend (full history)
- Year-over-year changes  
- Seasonal patterns (within-year)
- Recent behavior (last 3-6 periods)

### Distribution Check
**Always check distribution before using means**
- Normal → Mean valid
- Skewed → Use median
- Multimodal → Split by subgroup

---

## Phase 5: Insight Synthesis (10%)

**Distill findings into clear statements**

### Classification

**Tier 1 - Primary**: Answers core question, actionable, robust  
**Tier 2 - Supporting**: Adds nuance, explains why  
**Tier 3 - Observations**: Interesting but not actionable

### Confidence Assessment

For each finding document:
- **Data Quality**: High/Medium/Low
- **Sample Size**: Sufficient/Marginal/Insufficient  
- **Robustness**: Consistent/Variable/Fragile

**Format**: "[Finding] | Confidence: [Level] | Caveat: [What could challenge this]"

### Visualization Polish (Final deliverables only)

**Checklist**:
- [ ] Axes in plain language
- [ ] Title states finding, not just content
- [ ] Units explicit
- [ ] Colors meaningful
- [ ] Legend ordered logically
- [ ] Source/date noted
- [ ] Key points annotated
- [ ] Readable at display size

**Title Examples**:
- Bad: "Revenue by Quarter"
- Good: "Revenue declined 15% in Q3 before recovering"

---

## Decision Trees

### What to Explore First?

Has temporal dimension? → YES: Explore trends [High]  
Has quality issues? → YES: Investigate/fix [Blocking]  
High-cardinality categories? → YES: Aggregate [Medium]  
Multiple datasets? → YES: Start with simplest  
Text data? → YES: Extract features first  
DEFAULT → Explore largest differences

### How to Visualize?

**Match visualization to question**:
- "Changed over time?" → Line/bar chart
- "Categories compare?" → Bar (horizontal if many)
- "Distribution?" → Histogram/density
- "Variables relate?" → Scatter
- "Composition?" → Stacked area/bar
- "Location?" → Map
- "Vary across dimensions?" → Facets (max 9)

### Data Issue or Real Pattern?

Mathematically impossible? → ERROR: exclude/fix  
Affects only subset? → LIKELY COLLECTION ISSUE: investigate  
Aligns with known events? → LIKELY REAL: validate  
Sample size tiny (<10)? → COULD BE NOISE: flag uncertain  
DEFAULT → Potentially real, document uncertainty

### Add Another Dimension?

Can articulate what question it answers? NO → Don't add  
Reveals new pattern? NO → Don't add  
Obscures existing patterns? YES → Don't add (use facets)  
Now have >3 aesthetics? YES → Too complex, simplify  
Understandable in <10 seconds? NO → Too complex, simplify  
YES → Add dimension

---

## Tactical Patterns

### Parsing Text-Number Columns
"1-10 years" → Extract first number → Order numerically → Handle "Other" with low number

### Creating Time Variables
Separate year/month/day → Combine immediately to single date → Enables time-series operations

### Checking Totals
Identify total rows → Exclude from analysis → Verify sum(details) ≈ total → Investigate mismatch

### Handling Outliers
1. Investigate (error or real?)
2. If error: Fix/exclude, document
3. If real: Log scale OR cap display OR show separately
4. Always report count/magnitude

### Color Selection
- **Sequential**: Single hue, varying lightness (ordered data)
- **Diverging**: Two hues at neutral center (pos/neg)
- **Qualitative**: Distinct hues (5-8 max, unordered)
- **Special**: Grey for "Other/Unknown"

### Faceting vs Color
**Use color**: 2-5 subgroups, compare on same axes  
**Use facets**: 6+ subgroups, patterns crowded, need independent scales  
**Use both**: Two categorical dimensions

---

## Anti-Patterns

### Don't Do This
❌ **Analysis paralysis**: "One more thing..." endlessly  
❌ **Kitchen sink viz**: Too many aesthetics, uninterpretable  
❌ **Premature sophistication**: Complex methods when simple works  
❌ **Ignoring quality**: Proceeding despite obvious errors  
❌ **HARKing**: Treating exploratory finding as confirmed hypothesis  
❌ **Percentage without base**: "Increased 50%" without absolute numbers  
❌ **Misleading axes**: Bar charts not starting at 0  
❌ **Correlation = causation**: "Associated with" not "causes"

---

## Implementation Protocol

### Starting New Dataset (20 min)

0-5 min: Load, dimensions, types, column names  
5-10 min: Coverage (dates, unique values, min/max, missing %)  
10-15 min: Grain, relationships, aggregations  
15-20 min: First visualization - does it look right?  
20+ min: Iterate based on what viz revealed

### Investigating Anomaly (20 min)

0-2 min: Isolate to subset  
2-5 min: Context (before/after, all subgroups?)  
5-10 min: List 3 hypotheses  
10-20 min: Test explanations  
20-22 min: Decide (exclude/transform/accept/flag)

---

## Critical Rules

1. **Start with visualization, not tables**
2. **Question default orderings**
3. **Investigate anomalies immediately**
4. **Start simple, add complexity incrementally**
5. **Document WHY, not WHAT**
6. **Check distributions before using means**
7. **Never quote percentages without base numbers**
8. **State association, not causation**
9. **Stop when insights plateau**
10. **Perfect is the enemy of shipped**

---

## Meta-Skills

**Bias Toward Action**: Don't overthink → Try it → Learn from result

**Comfort With Messiness**: First plots are ugly → That's fine → Polish later

**Explicit Reasoning**: Narrate decisions → "I'm doing X because Y"

**Pattern Recognition**: Zoom in and out fluidly (macro → meso → micro)

**Healthy Skepticism**: Question data, question self, question defaults

**Prioritization**: Know when to stop exploring and move on

---

## The Rhythm

Get data → Look → Notice thing → Visualize → Looks wrong → Fix → Better →  
Add dimension → More interesting → Notice anomaly → Investigate →  
Polish → Done

**This is cyclical, not linear. Loop multiple times, going deeper each iteration.**

---

*The real skill: Knowing what to ignore. You can't explore everything. Choose the right rabbit holes.*
`;

// ═══════════════════════════════════════════════════════════════════════════════
// MODE-SPECIFIC PROMPTS
// ═══════════════════════════════════════════════════════════════════════════════

const EDA_MODE_PROMPT = `
# 📈 EDA MODE - Exploratory Data Analysis

You are in **EXPLORE MODE** - focused on rapid data exploration and discovery.

## MINDSET
- **Move fast**: Quick iterations, simple visualizations first
- **Ask questions**: What's surprising? What's missing? What patterns emerge?
- **Stay curious**: Follow interesting threads, pivot when needed


## WORKFLOW
1. FOLLOW THE PLAYBOOK (detailed below)

## VISUALIZATION STYLE
- Single charts (not dashboards)
- Clear titles stating key insight
- Add annotations for surprising findings
- Create Charts

## FOCUS AREAS (detailed in EDA Playbook below)
- Distributions (histograms, box plots)
- Trends over time (line charts)
- Category comparisons (bar charts)
- Outlier detection (scatter plots with highlights)
- Relationships (correlation matrices)


DO NOT:
❌ Build complex multi-chart dashboards (use Dashboard mode for that)
❌ Add extensive interactivity (dropdowns, filters)
❌ Spend time on perfect styling
❌ Create scrollytelling stories (use Story mode for that)

DO:
✅ Create one focused chart at a time
✅ Highlight outliers and anomalies
✅ Suggest what to explore next
✅ Iterate quickly based on findings
` + EDA_PLAYBOOK;

const DASHBOARD_MODE_PROMPT = `
# 📊 DASHBOARD MODE - Interactive Data Dashboards

You are in **DASHBOARD MODE** - focused on polished, interactive multi-chart dashboards.

## MINDSET
- **User-driven exploration**: Enable users to filter, drill down, compare
- **Multiple views**: Show data from different angles simultaneously
- **Professional quality**: Polished styling, smooth interactions
- **Interconnected**: Charts that work together to tell a complete story

## WORKFLOW
1. **Analyze data** with execute_javascript
2. **Suggest 10 dashboard ideas** - each with multiple charts
3. **User picks one** → Create ASCII mockup layout
4. **User approves** → Build full interactive dashboard

## DASHBOARD DESIGN PRINCIPLES
1. **INTERACTIVITY FIRST**: Add multiple selectors, filters, dropdowns
2. **BIG PICTURE → DEEP DIVE**: Overview first, then enable drilling down
3. **IDENTIFY KEY FILTERS**: Find most important dimensions (time, category, region)
4. **ANSWER QUESTIONS**: Every chart answers a specific question
5. **HIGHLIGHT OUTLIERS**: Visually emphasize outliers with color/annotations
6. **TRANSFORM DATA**: Aggregate, rank, normalize - don't show raw data

## LAYOUT PATTERNS
**Grid Layout** (3-4 charts):
\`\`\`html
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px;">
  <div id="chart1"></div>
  <div id="chart2"></div>
  <div id="chart3"></div>
  <div id="chart4"></div>
</div>
\`\`\`

**Hero + Supporting** (1 large, 2 small):
\`\`\`html
<div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
  <div id="main-chart" style="grid-row: span 2;"></div>
  <div id="chart2"></div>
  <div id="chart3"></div>
</div>
\`\`\`

## INTERACTIVE FILTERS
Always implement at least 2-3 filters:
- **Dropdown**: Category selection
- **Slider**: Numeric range
- **Buttons**: Toggle between views
- **Date range**: Time period selection

## MANDATORY FEATURES
- Tooltips on all interactive elements
- Responsive grid layout
- Cross-filtering (one chart filters others)
- Clear titles and labels
- Legend with proper ordering

DO NOT:
❌ Create single-chart visualizations (use Explore mode)
❌ Skip user approval of layout mockup
❌ Forget interactive filters
❌ Create scrollytelling (use Story mode)

DO:
✅ Create ASCII mockup before coding
✅ Implement multiple charts (3-6 ideal)
✅ Add interactive filters
✅ Polish styling and spacing
✅ Ensure responsive design
`;

const STORY_MODE_PROMPT = `
# 📖 STORY MODE - Scrollytelling Narratives (Pudding.cool Style)

You are in **STORY MODE** - focused on scroll-driven narrative visualizations.

## MINDSET
- **Author-driven**: You control the narrative flow
- **Linear progression**: Take user through a journey
- **Reveal gradually**: One insight per step
- **Compelling copy**: Write clear, engaging text
- **Visual continuity**: Smooth transitions between states

## WHEN TO USE
- Data has a clear narrative arc (rise/fall, before/after)
- Multiple related insights that build on each other
- You want to tell a specific story (not enable exploration)
- User explicitly requests "story", "narrative", or "Pudding-style"

## LIBRARIES AVAILABLE
- **Scrollama.js** (window.scrollama) - scroll-driven events
- **D3.js** (window.d3) - visualizations with smooth transitions
- **IntersectionObserver** (built-in) - automatic scroll detection

## STORY STRUCTURE (3-7 steps)
1. **Introduction**: Set the stage, show initial state
2. **Rising action**: Reveal key changes/patterns (2-4 steps)
3. **Climax**: The main insight/surprising finding
4. **Resolution**: What it means, current state

## SCROLLYTELLING CODE PATTERN
\`\`\`javascript
const viz = document.getElementById('viz');
viz.innerHTML = '';

viz.innerHTML = \`
  <div class="scrolly-container">
    <figure class="scrolly-figure">
      <svg id="scrolly-viz" width="100%" height="80%"></svg>
    </figure>
    <article class="scrolly-article">
      <div class="scrolly-step" data-step="0">
        <div class="scrolly-step-content">
          <h2>Step 1: Introduction</h2>
          <p>Set the stage with context...</p>
        </div>
      </div>
      <div class="scrolly-step" data-step="1">
        <div class="scrolly-step-content">
          <h2>Step 2: The Shift</h2>
          <p>Notice what changes...</p>
        </div>
      </div>
      <!-- 3-5 more steps -->
    </article>
  </div>
\`;

const svg = d3.select('#scrolly-viz');
const scroller = scrollama();

scroller.setup({ step: '.scrolly-step', offset: 0.5 })
  .onStepEnter(response => {
    updateVisualization(response.index);
  });

function updateVisualization(step) {
  // Transition chart based on step (0, 1, 2, etc.)
  // Use d3.transition().duration(1000) for smooth changes
}
\`\`\`

## COMMON STORY PATTERNS
**Pattern 1: Time Progression**
- Step 0: Show earliest data
- Steps 1-N: Progress through time
- Final: Full timeline with annotations

**Pattern 2: Zoom & Focus**
- Step 0: Full dataset overview
- Step 1: Zoom into interesting region
- Step 2: Highlight specific outliers
- Step 3: Detail view with annotations

**Pattern 3: Category Breakdown**
- Step 0: Aggregated total
- Step 1: Split by main category
- Step 2: Further subdivide
- Step 3: Highlight key segment

**Pattern 4: Comparison**
- Step 0: Show baseline
- Step 1: Introduce comparison
- Step 2: Overlay both groups
- Step 3: Highlight key differences

## WRITING GUIDELINES
- **Concise**: 2-4 sentences per step
- **Active voice**: "Revenue grew 50%" not "There was growth"
- **Highlight key numbers**: Use <strong> for important values
- **Create anticipation**: "But then something unexpected happened..."
- **Ask questions**: "What caused this spike?"

## VISUAL TRANSITIONS
- Use .transition().duration(800-1200ms)
- Transform existing elements (don't rebuild)
- Maintain visual continuity
- Highlight what changed with color
- Add/remove annotations as needed

DO NOT:
❌ Create static dashboards (use Dashboard mode)
❌ Add interactive filters (conflicts with narrative)
❌ Use for simple data exploration (use Explore mode)
❌ Create more than 7 steps (overwhelming)

DO:
✅ Write compelling narrative copy
✅ Use smooth D3 transitions
✅ Keep 3-7 steps total
✅ Progressive disclosure (one insight per step)
✅ Test scroll direction (up/down)
`;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION TO COMBINE PROMPTS BASED ON MODE
// ═══════════════════════════════════════════════════════════════════════════════
function getSystemPrompt(mode = 'explore') {
  const modePrompts = {
    explore: EDA_MODE_PROMPT,
    dashboard: DASHBOARD_MODE_PROMPT,
    story: STORY_MODE_PROMPT
  };

  const modePrompt = modePrompts[mode] || EDA_MODE_PROMPT;
  return SHARED_BASE_PROMPT + '\n\n' + modePrompt;
}
// General-purpose JavaScript executor
async function executeJavaScript(code, timeout = 30000) {
  console.log('\n=== 🔧 TOOL EXECUTION START: execute_javascript ===');
  console.log('📥 Code to execute:');
  console.log('─'.repeat(80));
  console.log(code.substring(0, 500) + (code.length > 500 ? '\n... (truncated)' : ''));
  console.log('─'.repeat(80));
  console.log(`⏱️  Timeout: ${timeout}ms`);

  const startTime = Date.now();
  let stdout = [];
  let stderr = [];

  // Capture console output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    const output = args.map(a => {
      if (typeof a === 'object') {
        try {
          return JSON.stringify(a, null, 2);
        } catch (e) {
          return String(a);
        }
      }
      return String(a);
    }).join(' ');
    stdout.push(output);
    originalLog('📤 [stdout]', output);
  };

  console.error = (...args) => {
    const output = args.map(a => String(a)).join(' ');
    stderr.push(output);
    originalError('📤 [stderr]', output);
  };

  console.warn = (...args) => {
    const output = args.map(a => String(a)).join(' ');
    stderr.push(output);
    originalWarn('📤 [stderr]', output);
  };

  try {
    // Execute with timeout
    const result = await Promise.race([
      (async () => {
        // Create async function from code
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const fn = new AsyncFunction(code);
        return await fn();
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Execution timeout after ${timeout}ms`)), timeout)
      )
    ]);

    const executionTime = Date.now() - startTime;

    // Restore console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    // Check if returned value is data that should be persisted
    let savedData = null;
    let dataPreview = null;

    if (result !== undefined && result !== null && typeof result === 'object') {
      // If it's an array or object, save it to the data store
      const dataId = `dataset_${Date.now()}`;
      dataStore.set(dataId, result);
      savedData = dataId;

      console.log(`💾 Data saved to store with ID: ${dataId}`);
      console.log(`📊 Data type: ${Array.isArray(result) ? 'Array' : 'Object'}`);
      console.log(`📏 Data size: ${Array.isArray(result) ? result.length + ' items' : Object.keys(result).length + ' keys'}`);

      // Generate data preview for display
      if (Array.isArray(result) && result.length > 0) {
        const previewRows = result.slice(0, 10); // First 10 rows
        const totalRows = result.length;
        const columns = Object.keys(result[0] || {});

        dataPreview = {
          type: 'array',
          rows: totalRows,
          columns: columns.length,
          columnNames: columns,
          previewData: previewRows,
          truncated: totalRows > 10
        };
      } else if (typeof result === 'object') {
        const keys = Object.keys(result);
        dataPreview = {
          type: 'object',
          keys: keys.length,
          keyNames: keys.slice(0, 10),
          truncated: keys.length > 10
        };
      }
    }

    const output = {
      success: true,
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n'),
      result: result !== undefined ? String(result) : null,
      dataId: savedData, // Include dataId so Claude knows data was saved
      dataPreview: dataPreview, // Include preview for UI display
      executionTime: `${executionTime}ms`
    };

    console.log('✅ Execution successful');
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    console.log('📤 stdout lines:', stdout.length);
    console.log('📤 stderr lines:', stderr.length);
    if (result !== undefined) {
      console.log('📤 Return value:', String(result).substring(0, 200));
    }
    console.log('\n=== 🔧 TOOL EXECUTION END: execute_javascript ===\n');

    return output;

  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Restore console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    const output = {
      success: false,
      stdout: stdout.join('\n'),
      stderr: stderr.join('\n'),
      error: error.message,
      stack: error.stack,
      executionTime: `${executionTime}ms`
    };

    console.error('❌ Execution error:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.log(`⏱️  Execution time: ${executionTime}ms`);
    console.log('📤 stdout lines:', stdout.length);
    console.log('📤 stderr lines:', stderr.length);
    console.log('\n=== 🔧 TOOL EXECUTION END (ERROR): execute_javascript ===\n');

    return output;
  }
}

// Create dashboard - validates and returns D3 code for client execution
function createDashboard(code, title = '', description = '', dataId = null) {
  console.log('\n=== 🔧 TOOL EXECUTION START: create_dashboard ===');
  console.log(`📊 Dashboard title: ${title || '(no title)'}`);
  console.log(`📝 Description: ${description || '(no description)'}`);
  console.log('📥 Code length:', code.length, 'characters');
  console.log(`💾 Data ID: ${dataId || '(none)'}`);
  console.log('─'.repeat(80));
  console.log(code.substring(0, 300) + (code.length > 300 ? '\n... (truncated)' : ''));
  console.log('─'.repeat(80));

  try {
    // Basic validation - just check code exists
    if (!code || code.trim().length === 0) {
      throw new Error('Code cannot be empty');
    }

    console.log('✅ Code validation passed');

    // Inject stored data if available
    let finalCode = code;
    let injectedData = null;

    if (dataId && dataStore.has(dataId)) {
      const data = dataStore.get(dataId);
      injectedData = data;

      console.log(`💾 Injecting stored data from ID: ${dataId}`);
      console.log(`📊 Data type: ${Array.isArray(data) ? 'Array' : 'Object'}`);
      console.log(`📏 Data size: ${Array.isArray(data) ? data.length + ' items' : Object.keys(data).length + ' keys'}`);

      // Prepend data injection to the code
      const dataInjection = `// 💾 Data injected from execute_javascript
const __STORED_DATA__ = ${JSON.stringify(data, null, 2)};

`;
      finalCode = dataInjection + code;
      console.log(`✅ Data injected (${dataInjection.length} chars added)`);
    }

    const result = {
      success: true,
      code: finalCode,
      title: title,
      description: description,
      hasData: injectedData !== null,
      message: injectedData ? 'Dashboard code ready with injected data' : 'Dashboard code ready for rendering'
    };

    console.log('📤 Returning validated dashboard code');
    console.log('\n=== 🔧 TOOL EXECUTION END: create_dashboard ===\n');

    return result;

  } catch (error) {
    console.error('❌ Validation error:', error.message);
    const result = {
      success: false,
      error: error.message,
      code: null
    };
    console.log('📤 Returning error result');
    console.log('\n=== 🔧 TOOL EXECUTION END (ERROR): create_dashboard ===\n');
    return result;
  }
}

// Chat endpoint with tool use support
app.post('/api/chat', async (req, res) => {
  const { message, conversationHistory, mode } = req.body;

  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      📨 NEW CHAT REQUEST                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log('📝 User message:', message.substring(0, 150) + (message.length > 150 ? '...' : ''));
  console.log('📚 Conversation history length:', conversationHistory?.length || 0);
  console.log('🎯 Mode:', mode || 'explore (default)');

  // Build messages array
  let messages = [...(conversationHistory || [])];
  messages.push({ role: 'user', content: message });
  console.log('📨 Total messages in context:', messages.length);

  // Define tools
  const tools = [
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
  console.log('🔧 Tools available:', tools.map(t => t.name).join(', '));

  try {
    let continueLoop = true;
    let loopCount = 0;
    const MAX_LOOPS = 10; // Allow enough loops for: analyze → create viz → user feedback → adjust

    while (continueLoop && loopCount < MAX_LOOPS) {
      loopCount++;
      console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
      console.log(`║                    🔄 API CALL LOOP ${loopCount}/${MAX_LOOPS}                              ║`);
      console.log('╚════════════════════════════════════════════════════════════════════════╝');

      // Call Claude API (STREAMING with tool use!)
      console.log('🚀 Calling Claude API with STREAMING...');
      console.log('   Model: claude-sonnet-4-5-20250929');
      console.log('   Max tokens: 64000');
      console.log('   Stream: TRUE (with fine-grained-tool-streaming)');
      console.log('   Tools provided:', tools.length);

      const apiRequestBody = {
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 64000,
        system: getSystemPrompt(mode || 'explore'),  // ✅ Use mode-specific prompt
        tools: tools,
        messages: messages,
        stream: true  // ✅ Streaming enabled!
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'context-1m-2025-08-07'  // ✅ Enable tool streaming
        },
        body: JSON.stringify(apiRequestBody)
      });

      console.log('📡 API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('\n❌ API ERROR:');
        console.error('   Status:', response.status);
        console.error('   Error data:', errorData);
        return res.status(response.status).json({
          error: `API error: ${response.status}`,
          details: errorData
        });
      }

      // ✅ Process streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      let currentToolUse = null;
      let currentTextBlock = null;  // ✅ Track text blocks
      let toolResults = [];
      let assistantContent = [];
      let stopReason = null;

      // Set up SSE headers if this is first loop
      if (loopCount === 1) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        console.log('   📡 SSE headers set for streaming');
      }

      console.log('\n📥 Processing streaming events...');

      // Read and process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          if (line === 'data: [DONE]') continue;

          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const event = JSON.parse(data);

            switch (event.type) {
              case 'message_start':
                console.log('   📨 Message started');
                break;

              case 'content_block_start':
                if (event.content_block.type === 'tool_use') {
                  currentToolUse = {
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: ''
                  };
                  console.log(`   🔧 Tool started: ${event.content_block.name} (ID: ${event.content_block.id})`);

                  // Stream tool start to client
                  res.write(`data: ${JSON.stringify({
                    type: 'tool_start',
                    name: event.content_block.name,
                    id: event.content_block.id
                  })}\n\n`);
                } else if (event.content_block.type === 'text') {
                  // ✅ Start tracking text block
                  currentTextBlock = { type: 'text', text: '' };
                  console.log('   📝 Text block started');
                }
                break;

              case 'content_block_delta':
                if (event.delta.type === 'input_json_delta') {
                  // Tool input streaming
                  currentToolUse.input += event.delta.partial_json;
                  console.log(`   🔧 Tool input chunk: ${event.delta.partial_json}`);

                  // Stream tool input to client
                  res.write(`data: ${JSON.stringify({
                    type: 'tool_input_delta',
                    delta: event.delta.partial_json
                  })}\n\n`);
                } else if (event.delta.type === 'text_delta') {
                  // ✅ Accumulate text AND stream to client
                  if (currentTextBlock) {
                    currentTextBlock.text += event.delta.text;
                  }

                  // Forward to client immediately
                  res.write(`data: ${JSON.stringify({
                    type: 'content_block_delta',
                    delta: { type: 'text_delta', text: event.delta.text }
                  })}\n\n`);
                }
                break;

              case 'content_block_stop':
                if (currentToolUse) {
                  // Tool input complete - parse and execute
                  console.log(`   🔧 Tool input complete: ${currentToolUse.input}`);

                  try {
                    const toolInput = JSON.parse(currentToolUse.input);

                    // Store tool use in assistant content
                    assistantContent.push({
                      type: 'tool_use',
                      id: currentToolUse.id,
                      name: currentToolUse.name,
                      input: toolInput
                    });

                    // Execute tool
                    console.log(`\n🔨 Executing tool: ${currentToolUse.name}`);

                    if (currentToolUse.name === 'execute_javascript') {
                      const timeout = toolInput.timeout || 30000;
                      const result = await executeJavaScript(toolInput.code, timeout);

                      // Store the latest dataId for use by create_dashboard
                      if (result.dataId) {
                        res.locals = res.locals || {};
                        res.locals.latestDataId = result.dataId;
                      }

                      // Stream console output to client if available
                      if (result.stdout || result.stderr) {
                        res.write(`data: ${JSON.stringify({
                          type: 'console_output',
                          stdout: result.stdout,
                          stderr: result.stderr,
                          toolId: currentToolUse.id
                        })}\n\n`);
                      }

                      // Stream data preview to client if available
                      if (result.dataPreview) {
                        res.write(`data: ${JSON.stringify({
                          type: 'data_preview',
                          preview: result.dataPreview,
                          toolId: currentToolUse.id
                        })}\n\n`);
                      }

                      toolResults.push({
                        type: "tool_result",
                        tool_use_id: currentToolUse.id,
                        content: JSON.stringify(result, null, 2)
                      });

                      // Stream tool completion to client
                      res.write(`data: ${JSON.stringify({
                        type: 'tool_complete',
                        name: currentToolUse.name
                      })}\n\n`);

                    } else if (currentToolUse.name === 'create_dashboard') {
                      // Get the latest dataId if available
                      const dataId = res.locals?.latestDataId || null;

                      const result = createDashboard(
                        toolInput.code,
                        toolInput.title || '',
                        toolInput.description || '',
                        dataId
                      );

                      toolResults.push({
                        type: "tool_result",
                        tool_use_id: currentToolUse.id,
                        content: JSON.stringify(result, null, 2)
                      });

                      // Stream dashboard code to client for rendering
                      if (result.success) {
                        res.write(`data: ${JSON.stringify({
                          type: 'dashboard_render',
                          code: result.code,
                          title: result.title,
                          description: result.description
                        })}\n\n`);
                      }

                      // Stream tool completion to client
                      res.write(`data: ${JSON.stringify({
                        type: 'tool_complete',
                        name: currentToolUse.name
                      })}\n\n`);
                    }

                    currentToolUse = null;
                  } catch (parseError) {
                    console.error('   ❌ Error parsing tool input:', parseError);
                  }
                }

                // ✅ Save completed text block
                if (currentTextBlock) {
                  console.log(`   📝 Text block complete: ${currentTextBlock.text.length} chars`);
                  assistantContent.push(currentTextBlock);
                  currentTextBlock = null;
                }
                break;

              case 'message_delta':
                if (event.delta.stop_reason) {
                  stopReason = event.delta.stop_reason;
                  console.log(`   🛑 Stop reason: ${stopReason}`);
                }
                break;

              case 'message_stop':
                console.log('   ✅ Message complete');
                break;
            }
          } catch (parseError) {
            console.error('   ❌ Error parsing event:', parseError);
          }
        }
      }

      console.log(`\n✅ Stream complete. Stop reason: ${stopReason}`);

      // Add Claude's response to messages
      messages.push({
        role: 'assistant',
        content: assistantContent
      });

      // Check if Claude wants to use tools
      if (stopReason === 'tool_use') {
        console.log(`\n✅ Tool execution complete. Found ${toolResults.length} results.`);

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: toolResults
        });

        // Continue loop to get final response
        continueLoop = true;
        console.log('\n🔄 Continuing loop to get Claude\'s final response...');

      } else {
        // No more tools needed - already streamed to client!
        continueLoop = false;

        console.log('\n✅ ══════════════════════════════════════════════════════════════');
        console.log('✅ NO MORE TOOLS NEEDED - Final response complete');
        console.log('✅ ══════════════════════════════════════════════════════════════');

        // Send message_stop event to trigger code execution
        res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        console.log('   ✅ Stream complete and connection closed');
      }
    }

    if (loopCount >= MAX_LOOPS && continueLoop) {
      console.warn('\n⚠️ ══════════════════════════════════════════════════════════════');
      console.warn('⚠️ MAX LOOPS REACHED!');
      console.warn('⚠️ ══════════════════════════════════════════════════════════════');
      console.warn(`   Reached maximum of ${MAX_LOOPS} loops`);

      // Send error via SSE (headers already sent)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Max tool use loops reached' });
      } else {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Max tool use loops reached' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }

  } catch (error) {
    console.error('\n❌ ══════════════════════════════════════════════════════════════');
    console.error('❌ SERVER ERROR!');
    console.error('❌ ══════════════════════════════════════════════════════════════');
    console.error('   Error message:', error.message);
    console.error('   Error stack:', error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        details: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log('\n═══════════════════════════════════════');
  console.log('🚀 D3.JS VISUALIZATION CHATBOT SERVER');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`✅ Claude model: claude-sonnet-4-5-20250929`);
  console.log(`✅ API key: ${ANTHROPIC_API_KEY ? '***configured***' : '⚠️  MISSING'}`);
  console.log('═══════════════════════════════════════\n');
});
