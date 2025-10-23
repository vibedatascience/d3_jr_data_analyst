export const EDA_PLAYBOOK = `
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
