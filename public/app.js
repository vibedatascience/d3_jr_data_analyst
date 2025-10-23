// Conversation state
let conversationHistory = [];
let isStreaming = false;
let currentMessageElement = null;
let currentMessageContent = '';
let currentMode = localStorage.getItem('vizMode') || 'explore'; // Default to explore mode

// Mode configuration
const MODE_CONFIG = {
  explore: {
    icon: '📈',
    label: 'Explore',
    description: 'Quick data exploration and discovery',
    subtitle: 'Rapid EDA - Fast iterations, simple visualizations'
  },
  dashboard: {
    icon: '📊',
    label: 'Dashboard',
    description: 'Interactive multi-chart dashboards',
    subtitle: 'Polished dashboards - Multiple charts, filters, interactivity'
  },
  story: {
    icon: '📖',
    label: 'Story',
    description: 'Scrollytelling narratives (Pudding.cool style)',
    subtitle: 'Data storytelling - Scroll-driven narrative visualizations'
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('═══════════════════════════════════════');
  console.log('🚀 D3.JS VISUALIZATION CHATBOT');
  console.log('═══════════════════════════════════════');
  console.log('✅ App initialized');
  console.log('✅ D3.js version:', d3.version);
  console.log('✅ Marked.js loaded:', typeof marked !== 'undefined');
  console.log('✅ Scrollama.js loaded:', typeof scrollama !== 'undefined');
  console.log('🎯 Current mode:', currentMode);
  console.log('═══════════════════════════════════════');

  // Initialize mode toggle
  initializeModeToggle();
  updateModeIndicator();

  document.getElementById('chatInput').focus();
});

// Initialize mode toggle buttons
function initializeModeToggle() {
  const modeButtons = document.querySelectorAll('.mode-btn');

  modeButtons.forEach(btn => {
    const mode = btn.dataset.mode;

    // Set active state based on current mode
    if (mode === currentMode) {
      btn.classList.add('active');
    }

    // Add click handler
    btn.addEventListener('click', () => {
      switchMode(mode);
    });
  });
}

// Switch visualization mode
function switchMode(newMode) {
  if (newMode === currentMode) return;

  console.log(`🔄 Switching mode: ${currentMode} → ${newMode}`);

  const oldMode = currentMode;
  currentMode = newMode;

  // Save to localStorage
  localStorage.setItem('vizMode', newMode);

  // Update button states
  document.querySelectorAll('.mode-btn').forEach(btn => {
    if (btn.dataset.mode === newMode) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update mode indicator
  updateModeIndicator();

  // Clear conversation history when switching modes
  if (confirm(`Switch to ${MODE_CONFIG[newMode].label} mode? This will start a new conversation.`)) {
    conversationHistory = [];
    console.log('✅ Conversation history cleared for new mode');

    // Add mode change notification to chat
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';

    // Add new welcome message
    const welcomeMsg = document.createElement('div');
    welcomeMsg.className = 'welcome-message';
    welcomeMsg.innerHTML = `
      <h2>👋 ${MODE_CONFIG[newMode].icon} ${MODE_CONFIG[newMode].label} Mode</h2>
      <p>${MODE_CONFIG[newMode].subtitle}</p>
    `;
    messagesDiv.appendChild(welcomeMsg);
  } else {
    // Revert if cancelled
    currentMode = oldMode;
    localStorage.setItem('vizMode', oldMode);
    document.querySelectorAll('.mode-btn').forEach(btn => {
      if (btn.dataset.mode === oldMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

// Update mode indicator in chat subtitle
function updateModeIndicator() {
  const chatSubtitle = document.querySelector('.chat-subtitle');
  if (chatSubtitle) {
    const config = MODE_CONFIG[currentMode];
    chatSubtitle.textContent = `${config.icon} ${config.subtitle}`;
  }
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
}

// Set example prompt
function setPrompt(text) {
  document.getElementById('chatInput').value = text;
  document.getElementById('chatInput').focus();
}

// Send message to Claude
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message || isStreaming) return;

  // Clear input and disable send button
  input.value = '';
  const sendBtn = document.getElementById('sendBtn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';

  // Remove empty state if present
  const emptyState = document.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }

  // Add user message to chat
  addMessage('user', message);

  // Add to conversation history
  conversationHistory.push({ role: 'user', content: message });

  // Show typing indicator
  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'message assistant';
  typingIndicator.innerHTML = `
    <div class="message-label">Claude</div>
    <div class="typing-indicator active">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  document.getElementById('messages').appendChild(typingIndicator);
  scrollToBottom();

  try {
    isStreaming = true;
    currentMessageContent = '';
    let needNewTextBlock = false; // Track when we need a new text block after tool

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversationHistory: conversationHistory.slice(0, -1),
        mode: currentMode  // ✅ Include current mode
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Remove typing indicator
    typingIndicator.remove();

    // Create assistant message element
    currentMessageElement = addMessage('assistant', '', true);
    const contentDiv = currentMessageElement.querySelector('.message-content');

    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('✅ Stream complete');
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Split by newlines but keep the last incomplete line in buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            console.log('✅ Stream finished');
            continue;
          }

          if (!data) continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.type === 'tool_start') {
              // 🎨 Show cool tool execution UI
              showToolExecution(parsed.name, parsed.id, contentDiv);
              needNewTextBlock = true; // Next text should go in a new block
            } else if (parsed.type === 'tool_input_delta') {
              // Update tool input display
              updateToolInput(parsed.delta);
            } else if (parsed.type === 'dashboard_render') {
              // 🎨 Render dashboard from create_dashboard tool
              console.log('🎨 Dashboard render event received');
              console.log('📊 Title:', parsed.title || '(no title)');
              console.log('📝 Description:', parsed.description || '(no description)');
              console.log('📏 Code length:', parsed.code.length, 'characters');

              // Execute the dashboard code immediately with title
              try {
                executeD3Code(parsed.code, parsed.title || '');
                console.log('✅ Dashboard rendered successfully');
              } catch (error) {
                console.error('❌ Dashboard render error:', error);
                showError('Failed to render dashboard: ' + error.message);
              }
            } else if (parsed.type === 'console_output') {
              // Show console output in tool card
              showConsoleOutput(parsed.stdout, parsed.stderr, parsed.toolId);
            } else if (parsed.type === 'data_preview') {
              // Show data preview in tool card
              showDataPreview(parsed.preview, parsed.toolId);
            } else if (parsed.type === 'tool_complete') {
              // Mark tool as complete
              completeToolExecution(parsed.name);
            } else if (parsed.type === 'content_block_delta') {
              const delta = parsed.delta;

              if (delta.type === 'text_delta') {
                const text = delta.text;

                // If we need a new text block (after tool), finalize the previous one
                if (needNewTextBlock) {
                  // Mark the last text block as finalized
                  const textContainers = contentDiv.querySelectorAll('.message-text-content');
                  const lastContainer = textContainers[textContainers.length - 1];
                  if (lastContainer) {
                    lastContainer.dataset.finalized = 'true';
                  }

                  // Reset for new text block
                  currentMessageContent = '';
                  needNewTextBlock = false;
                }

                currentMessageContent += text;

                // Update the display with markdown rendering
                updateMessageDisplay(contentDiv);
              }
            } else if (parsed.type === 'message_stop') {
              console.log('📝 Message complete');

              // Final update
              updateMessageDisplay(contentDiv);

              // Note: We no longer execute code blocks from text
              // All visualizations now come through create_dashboard tool
              // But keep the code block execution for backward compatibility

              // Add to conversation history
              conversationHistory.push({
                role: 'assistant',
                content: currentMessageContent
              });
            }
          } catch (e) {
            console.error('❌ Error parsing SSE data:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);

    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
      indicator.closest('.message').remove();
    }

    addMessage('assistant', `❌ Error: ${error.message}`);
  } finally {
    isStreaming = false;
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    input.focus();
  }
}

// Update message display with markdown AND live HTML rendering
function updateMessageDisplay(contentDiv) {
  if (!currentMessageContent) return; // Skip if no content

  // Parse markdown first
  let html = marked.parse(currentMessageContent);

  // Enable HTML pass-through for rich content (SVG, styled divs, etc.)
  // marked.parse already converts markdown, but preserves HTML tags
  // We render it directly to support inline SVG, styled divs, tables, etc.

  // Find or create the LAST text content container (to support multiple text blocks)
  let textContainers = contentDiv.querySelectorAll('.message-text-content');
  let textContainer = textContainers[textContainers.length - 1];

  // If no container exists OR the last one is already finalized (has content), create new one
  // We detect finalized blocks by checking if currentMessageContent matches the container
  const needsNewContainer = !textContainer || (textContainer.dataset.finalized === 'true');

  if (needsNewContainer) {
    // Create a new container for text content
    textContainer = document.createElement('div');
    textContainer.className = 'message-text-content';
    textContainer.style.marginTop = '8px'; // Add spacing above text content

    contentDiv.appendChild(textContainer);
  }

  // Update only the last text container (tool cards and previous text stay untouched)
  textContainer.innerHTML = html;

  scrollToBottom();
}


// Extract and execute D3.js code blocks
function executeD3CodeBlocks(content) {
  const codeBlockRegex = /```(?:javascript|js)\n([\s\S]*?)```/g;
  let match;
  let executedCount = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const code = match[1].trim();
    if (code) {
      console.log('🎨 Found D3.js code block, executing...');
      executeD3Code(code);
      executedCount++;
    }
  }

  if (executedCount > 0) {
    console.log(`✅ Executed ${executedCount} D3.js code block(s)`);
  }

  // Reset for next message
  lastExecutedCode = '';
}

// Dashboard history storage
let dashboardHistory = [];
let currentDashboardIndex = -1;

// Execute D3.js code
function executeD3Code(code, title = '', skipHistory = false) {
  try {
    console.log('🎨 EXECUTING D3.JS CODE');
    console.log('═══════════════════════════════════════');
    console.log('🔹 Code Length:', code.length, 'characters');
    console.log('═══════════════════════════════════════');

    // Execute the code in the global scope so it has access to d3 and #viz
    // Use AsyncFunction to support await in the code
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const func = new AsyncFunction(code);
    func();

    console.log('✅ D3.JS CODE EXECUTED SUCCESSFULLY');

    // Add to history (unless we're navigating history)
    if (!skipHistory) {
      const dashboard = {
        code: code,
        title: title || `Dashboard ${dashboardHistory.length + 1}`,
        timestamp: new Date().toISOString(),
        preview: code.substring(0, 100) + '...'
      };

      dashboardHistory.push(dashboard);
      currentDashboardIndex = dashboardHistory.length - 1;

      console.log(`📊 Saved to history (${dashboardHistory.length} total)`);
      updateDashboardNav();
    }

    // Add visual feedback to the code block
    highlightExecutedCode();
  } catch (error) {
    console.error('❌ Error executing D3.js code:', error);

    // Show error in visualization area
    const vizDiv = document.getElementById('viz');
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'color: #E3120B; padding: 20px; background: #fff0ef; border: 2px solid #E3120B; border-radius: 8px; max-width: 600px;';
    errorDiv.innerHTML = `
      <div style="font-weight: bold; font-size: 18px; margin-bottom: 10px;">⚠️ Execution Error</div>
      <div style="font-family: monospace; font-size: 14px;">${escapeHtml(error.message)}</div>
      <div style="margin-top: 10px; font-size: 12px; color: #758D99;">Check the browser console for more details</div>
    `;
    vizDiv.innerHTML = '';
    vizDiv.appendChild(errorDiv);

    // Send error back to Claude for automatic fixing
    sendErrorToClaudeForFix(error, code);
  }
}

// Send execution error to Claude for automatic fixing
function sendErrorToClaudeForFix(error, failedCode) {
  console.log('🔧 Sending error to Claude for automatic fix...');

  const errorMessage = `The dashboard code failed to execute with the following error:

**Error:** ${error.message}

**Stack trace:**
\`\`\`
${error.stack}
\`\`\`

**Failed code:**
\`\`\`javascript
${failedCode}
\`\`\`

Please analyze the error and provide a corrected version of the code.`;

  // Set the error message in the input field and trigger send
  const chatInput = document.getElementById('chatInput');
  chatInput.value = errorMessage;

  // Trigger the send message function
  setTimeout(() => {
    sendMessage();
  }, 100);
}

// Dashboard navigation functions
function updateDashboardNav() {
  const navContainer = document.getElementById('dashboard-nav');
  if (!navContainer) return;

  if (dashboardHistory.length === 0) {
    navContainer.style.display = 'none';
    return;
  }

  navContainer.style.display = 'flex';

  const current = currentDashboardIndex + 1;
  const total = dashboardHistory.length;
  const currentDashboard = dashboardHistory[currentDashboardIndex];

  navContainer.innerHTML = `
    <button onclick="navigateDashboard(-1)" ${currentDashboardIndex === 0 ? 'disabled' : ''}
            style="background: #f8f4eb; border: 1px solid #d9c6a6; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; ${currentDashboardIndex === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
      ← Prev
    </button>
    <span style="font-size: 12px; color: #758D99; padding: 0 12px; display: flex; align-items: center;">
      ${current} / ${total}
      <span style="margin-left: 8px; color: #0C0C0C; font-weight: 500;">${escapeHtml(currentDashboard.title)}</span>
    </span>
    <button onclick="navigateDashboard(1)" ${currentDashboardIndex === dashboardHistory.length - 1 ? 'disabled' : ''}
            style="background: #f8f4eb; border: 1px solid #d9c6a6; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; ${currentDashboardIndex === dashboardHistory.length - 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
      Next →
    </button>
    <button onclick="showDashboardList()"
            style="background: #e8f5f3; border: 1px solid #b8ddd8; color: #379A8B; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 12px; margin-left: 8px;">
      📊 All (${total})
    </button>
  `;
}

function navigateDashboard(direction) {
  const newIndex = currentDashboardIndex + direction;

  if (newIndex >= 0 && newIndex < dashboardHistory.length) {
    currentDashboardIndex = newIndex;
    const dashboard = dashboardHistory[currentDashboardIndex];

    console.log(`📊 Navigating to dashboard ${currentDashboardIndex + 1}/${dashboardHistory.length}`);

    // Re-execute the dashboard code (skip adding to history)
    executeD3Code(dashboard.code, dashboard.title, true);
    updateDashboardNav();
  }
}

function showDashboardList() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

  const listHTML = dashboardHistory.map((dash, idx) => {
    const date = new Date(dash.timestamp);
    const timeStr = date.toLocaleTimeString();
    const isActive = idx === currentDashboardIndex;

    return `
      <div onclick="loadDashboard(${idx}); event.stopPropagation();"
           style="padding: 12px; margin: 8px 0; background: ${isActive ? '#e8f5f3' : 'white'}; border: 2px solid ${isActive ? '#379A8B' : '#e6dcc8'}; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
        <div style="font-weight: 600; color: #0C0C0C; margin-bottom: 4px;">
          ${isActive ? '▶ ' : ''}${idx + 1}. ${escapeHtml(dash.title)}
        </div>
        <div style="font-size: 11px; color: #758D99;">${timeStr}</div>
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div onclick="event.stopPropagation()" style="background: #fdfaf3; border-radius: 12px; padding: 24px; max-width: 500px; max-height: 70vh; overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="margin: 0; color: #0C0C0C;">Dashboard History</h3>
        <button onclick="this.closest('[style*=fixed]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #758D99;">&times;</button>
      </div>
      <div style="margin-top: 16px;">
        ${listHTML}
      </div>
    </div>
  `;

  modal.onclick = () => modal.remove();
  document.body.appendChild(modal);
}

function loadDashboard(index) {
  if (index >= 0 && index < dashboardHistory.length) {
    currentDashboardIndex = index;
    const dashboard = dashboardHistory[index];

    console.log(`📊 Loading dashboard ${index + 1}/${dashboardHistory.length}`);

    executeD3Code(dashboard.code, dashboard.title, true);
    updateDashboardNav();

    // Close modal
    document.querySelector('[style*="fixed"]')?.remove();
  }
}

// Highlight executed code blocks in the chat
function highlightExecutedCode() {
  if (!currentMessageElement) return;

  const codeBlocks = currentMessageElement.querySelectorAll('pre code.language-javascript, pre code.language-js');
  codeBlocks.forEach((block, index) => {
    const pre = block.parentElement;
    if (!pre.querySelector('.executed-badge')) {
      const badge = document.createElement('div');
      badge.className = 'executed-badge';
      badge.style.cssText = 'position: absolute; top: 8px; right: 8px; background: #379A8B; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;';
      badge.textContent = '✓ EXECUTED';
      pre.style.position = 'relative';
      pre.appendChild(badge);
    }
  });
}

// 🎨 Tool execution UI functions
let currentToolElement = null;
let toolInputAccumulator = '';

function showToolExecution(toolName, toolId, contentDiv) {
  console.log('🔧 Tool execution started:', toolName);

  // Create cool tool execution UI
  const toolCard = document.createElement('div');
  toolCard.className = 'tool-execution-card';
  toolCard.id = `tool-${toolId}`;
  toolCard.innerHTML = `
    <div class="tool-header">
      <div class="tool-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      </div>
      <div class="tool-info">
        <div class="tool-name">${formatToolName(toolName)}</div>
        <div class="tool-status">
          <span class="status-dot pulsing"></span>
          <span class="status-text">Executing...</span>
        </div>
      </div>
      <div class="tool-spinner">
        <div class="spinner"></div>
      </div>
    </div>
    <div class="tool-params">
      <div class="params-label">Parameters:</div>
      <div class="params-content" id="params-${toolId}"></div>
    </div>
  `;

  // Append tool card in order (not at the top)
  contentDiv.appendChild(toolCard);
  currentToolElement = toolCard;
  toolInputAccumulator = '';
}

function updateToolInput(delta) {
  if (!currentToolElement) return;

  toolInputAccumulator += delta;

  // Try to parse and display nicely
  const paramsDiv = currentToolElement.querySelector('.params-content');
  if (paramsDiv) {
    try {
      const params = JSON.parse(toolInputAccumulator);
      paramsDiv.innerHTML = formatToolParams(params);
    } catch (e) {
      // Still accumulating, show raw JSON
      paramsDiv.innerHTML = `<code>${escapeHtml(toolInputAccumulator)}</code>`;
    }
  }
}

function completeToolExecution(toolName) {
  console.log('✅ Tool execution complete:', toolName);

  if (!currentToolElement) return;

  // Update status to complete
  const statusDot = currentToolElement.querySelector('.status-dot');
  const statusText = currentToolElement.querySelector('.status-text');
  const spinner = currentToolElement.querySelector('.tool-spinner');

  if (statusDot) {
    statusDot.classList.remove('pulsing');
    statusDot.classList.add('complete');
  }
  if (statusText) {
    statusText.textContent = 'Complete ✓';
  }
  if (spinner) {
    spinner.style.display = 'none';
  }

  // Parse and display final params nicely
  try {
    const params = JSON.parse(toolInputAccumulator);
    const paramsDiv = currentToolElement.querySelector('.params-content');
    if (paramsDiv) {
      paramsDiv.innerHTML = formatToolParams(params);
    }
  } catch (e) {
    // Keep raw display if parse fails
  }

  currentToolElement = null;
  toolInputAccumulator = '';
}

// Format tool parameters with code syntax highlighting and copy button
function formatToolParams(params) {
  let html = '';

  for (const [key, value] of Object.entries(params)) {
    if (key === 'code' && typeof value === 'string' && value.length > 50) {
      // Format code nicely with syntax highlighting and copy button
      const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      html += `
        <div style="margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: #758D99;">${key}</span>
            <button onclick="copyCode('${codeId}')" style="background: #379A8B; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: 600;">
              📋 Copy
            </button>
          </div>
          <pre id="${codeId}" style="background: rgba(0, 0, 0, 0.05); padding: 12px; border-radius: 6px; max-height: 300px; overflow-y: auto; margin: 0;"><code class="language-javascript">${escapeHtml(value)}</code></pre>
        </div>
      `;
    } else {
      // Regular parameter display
      const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      html += `
        <div style="margin: 8px 0;">
          <span style="font-weight: 600; font-size: 11px; text-transform: uppercase; color: #758D99;">${key}:</span>
          <span style="margin-left: 6px; font-family: monospace; font-size: 11px;">${escapeHtml(displayValue)}</span>
        </div>
      `;
    }
  }

  return html;
}

// Copy code to clipboard
function copyCode(elementId) {
  const codeElement = document.getElementById(elementId);
  if (!codeElement) return;

  const code = codeElement.textContent;
  navigator.clipboard.writeText(code).then(() => {
    // Show feedback
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '✓ Copied!';
    button.style.background = '#006BA2';

    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.background = '#379A8B';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function showDataPreview(preview, toolId) {
  console.log('📊 Data preview received:', preview);

  const toolCard = document.getElementById(`tool-${toolId}`);
  if (!toolCard) return;

  // Check if data preview section already exists
  let dataSection = toolCard.querySelector('.tool-data-preview');
  if (!dataSection) {
    dataSection = document.createElement('div');
    dataSection.className = 'tool-data-preview';
    toolCard.appendChild(dataSection);
  }

  if (preview.type === 'array') {
    const { rows, columns, columnNames, previewData, truncated } = preview;

    // Create table HTML
    const tableHTML = `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.8); font-weight: 600;">
            💾 Dataset Saved
          </div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.9);">
            ${rows.toLocaleString()} rows × ${columns} cols
          </div>
        </div>
        <div style="background: rgba(0, 0, 0, 0.2); border-radius: 6px; overflow: hidden; max-height: 200px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; color: white;">
            <thead style="position: sticky; top: 0; background: rgba(0, 0, 0, 0.4); z-index: 1;">
              <tr>
                ${columnNames.map(col => `<th style="padding: 6px 8px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.2); font-weight: 600;">${escapeHtml(col)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${previewData.map((row, idx) => `
                <tr style="background: ${idx % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};">
                  ${columnNames.map(col => `<td style="padding: 6px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">${escapeHtml(String(row[col] || ''))}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${truncated ? `<div style="margin-top: 6px; font-size: 10px; color: rgba(255, 255, 255, 0.7); text-align: center;">Showing first 10 rows</div>` : ''}
      </div>
    `;

    dataSection.innerHTML = tableHTML;
  } else if (preview.type === 'object') {
    const { keys, keyNames, truncated } = preview;

    dataSection.innerHTML = `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-weight: 600;">
          💾 Object Saved (${keys} keys)
        </div>
        <div style="background: rgba(0, 0, 0, 0.2); border-radius: 6px; padding: 10px 12px; font-family: 'Monaco', 'Menlo', monospace; font-size: 11px; color: white; max-height: 200px; overflow-y: auto;">
          ${keyNames.map(key => `<div>${escapeHtml(key)}</div>`).join('')}
          ${truncated ? '<div style="color: rgba(255, 255, 255, 0.6); margin-top: 8px;">... and more</div>' : ''}
        </div>
      </div>
    `;
  }
}

function showConsoleOutput(stdout, stderr, toolId) {
  console.log('📝 Console output received for tool:', toolId);

  const toolCard = document.getElementById(`tool-${toolId}`);
  if (!toolCard) return;

  // Check if console output section already exists
  let consoleSection = toolCard.querySelector('.tool-console-output');
  if (!consoleSection) {
    consoleSection = document.createElement('div');
    consoleSection.className = 'tool-console-output';
    // Insert before data preview if it exists, otherwise append
    const dataPreview = toolCard.querySelector('.tool-data-preview');
    if (dataPreview) {
      toolCard.insertBefore(consoleSection, dataPreview);
    } else {
      toolCard.appendChild(consoleSection);
    }
  }

  let html = '';

  if (stdout && stdout.trim()) {
    html += `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-weight: 600;">
          📝 Console Output
        </div>
        <div style="background: rgba(0, 0, 0, 0.3); border-radius: 6px; padding: 12px; font-family: 'Monaco', 'Menlo', monospace; font-size: 11px; color: #00ff00; max-height: 400px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5;">
${escapeHtml(stdout)}
        </div>
      </div>
    `;
  }

  if (stderr && stderr.trim()) {
    html += `
      <div style="margin-top: 8px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(255, 100, 100, 0.9); margin-bottom: 8px; font-weight: 600;">
          ⚠️ Errors
        </div>
        <div style="background: rgba(255, 0, 0, 0.1); border-radius: 6px; padding: 12px; font-family: 'Monaco', 'Menlo', monospace; font-size: 11px; color: #ff6b6b; max-height: 200px; overflow-y: auto; white-space: pre-wrap; line-height: 1.5;">
${escapeHtml(stderr)}
        </div>
      </div>
    `;
  }

  consoleSection.innerHTML = html;
}

function formatToolName(name) {
  // Convert snake_case to Title Case
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Add message to chat
function addMessage(role, content, isStreaming = false) {
  const messagesDiv = document.getElementById('messages');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const label = role === 'user' ? 'You' : 'Claude';
  const labelColor = role === 'user' ? '#006BA2' : '#379A8B';

  messageDiv.innerHTML = `
    <div class="message-label" style="color: ${labelColor}">${label}</div>
    <div class="message-content">${isStreaming ? '' : marked.parse(content)}</div>
  `;

  messagesDiv.appendChild(messageDiv);
  scrollToBottom();

  return messageDiv;
}

// Scroll to bottom of messages
function scrollToBottom() {
  const messagesDiv = document.getElementById('messages');
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Show error message
function showError(message) {
  const viz = document.getElementById('viz');
  viz.innerHTML = `
    <div style="padding: 40px; text-align: center; color: #E3120B;">
      <h3 style="margin-bottom: 20px;">⚠️ Error</h3>
      <p style="font-family: monospace; background: #fff; padding: 20px; border-radius: 8px; border: 2px solid #E3120B;">
        ${escapeHtml(message)}
      </p>
    </div>
  `;
}

// Escape HTML for error display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Configure marked.js
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function(code, lang) {
    return code;
  }
});

// Toggle fullscreen for visualization panel
function toggleFullscreen() {
  const vizSection = document.getElementById('vizSection');
  const icon = document.getElementById('fullscreenIcon');
  const text = document.getElementById('fullscreenText');

  if (vizSection.classList.contains('fullscreen')) {
    vizSection.classList.remove('fullscreen');
    icon.textContent = '⛶';
    text.textContent = 'Expand';
  } else {
    vizSection.classList.add('fullscreen');
    icon.textContent = '⛶';
    text.textContent = 'Exit';
  }
}

// Export visualization as PNG
async function exportAsPNG() {
  const viz = document.getElementById('viz');

  // Check if there's a visualization
  if (!viz.querySelector('svg') && !viz.querySelector('canvas')) {
    alert('⚠️ No visualization to export. Create a chart first!');
    return;
  }

  try {
    // Use html2canvas library (we'll load it dynamically)
    if (typeof html2canvas === 'undefined') {
      // Load html2canvas dynamically
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }

    // Create canvas from viz element
    const canvas = await html2canvas(viz, {
      backgroundColor: '#ffffff',
      scale: 2, // Higher resolution
      logging: false,
      useCORS: true
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `visualization-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      console.log('✅ PNG exported successfully');
      showToast('✅ PNG downloaded!');
    });
  } catch (error) {
    console.error('❌ PNG export failed:', error);
    alert('❌ PNG export failed. See console for details.');
  }
}

// Export visualization as SVG
function exportAsSVG() {
  const viz = document.getElementById('viz');
  const svgs = viz.querySelectorAll('svg');

  if (svgs.length === 0) {
    alert('⚠️ No SVG visualization to export. Create a chart first!');
    return;
  }

  try {
    let svgContent = '';

    if (svgs.length === 1) {
      // Single SVG
      const svg = svgs[0];
      svgContent = new XMLSerializer().serializeToString(svg);
    } else {
      // Multiple SVGs - wrap in a container SVG
      const containerWidth = viz.offsetWidth;
      const containerHeight = viz.offsetHeight;

      svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${containerWidth}" height="${containerHeight}">`;

      svgs.forEach((svg) => {
        const rect = svg.getBoundingClientRect();
        const vizRect = viz.getBoundingClientRect();
        const x = rect.left - vizRect.left;
        const y = rect.top - vizRect.top;

        svgContent += `<g transform="translate(${x},${y})">`;
        svgContent += svg.innerHTML;
        svgContent += '</g>';
      });

      svgContent += '</svg>';
    }

    // Add XML declaration
    const fullSvg = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgContent;

    // Download
    const blob = new Blob([fullSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `visualization-${Date.now()}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ SVG exported successfully');
    showToast('✅ SVG downloaded!');
  } catch (error) {
    console.error('❌ SVG export failed:', error);
    alert('❌ SVG export failed. See console for details.');
  }
}

// Export as standalone HTML
function exportAsHTML() {
  const viz = document.getElementById('viz');

  if (!viz.querySelector('svg') && !viz.innerHTML.trim()) {
    alert('⚠️ No visualization to export. Create a chart first!');
    return;
  }

  try {
    // Get the visualization HTML
    const vizHTML = viz.innerHTML;

    // Create standalone HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>D3.js Visualization - Exported ${new Date().toLocaleDateString()}</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f4efe3;
      padding: 20px;
      min-height: 100vh;
    }
    #viz {
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(45, 35, 20, 0.08);
      max-width: 1400px;
      margin: 0 auto;
    }
    svg {
      max-width: 100%;
      height: auto;
      display: block;
    }
    .watermark {
      text-align: center;
      margin-top: 20px;
      color: #758D99;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="viz">${vizHTML}</div>
  <div class="watermark">
    Created with D3.js Visualization AI • ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;

    // Download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `visualization-${Date.now()}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    console.log('✅ HTML exported successfully');
    showToast('✅ HTML downloaded!');
  } catch (error) {
    console.error('❌ HTML export failed:', error);
    alert('❌ HTML export failed. See console for details.');
  }
}

// Helper: Load external script dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Helper: Show toast notification
function showToast(message) {
  // Remove existing toast
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  // Create toast
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #379A8B;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
