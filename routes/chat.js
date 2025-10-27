import { getSystemPrompt } from '../prompts/index.js';
import { TOOL_DEFINITIONS } from '../tools/index.js';
import { StreamHandler } from '../services/streamHandler.js';
import {
  ANTHROPIC_API_KEY,
  ANTHROPIC_API_URL,
  CLAUDE_MODEL,
  MAX_TOKENS,
  ANTHROPIC_VERSION,
  ANTHROPIC_BETA,
  MAX_LOOPS
} from '../config/constants.js';

/**
 * Call Claude API with streaming enabled
 * @param {Array} messages - Conversation history
 * @param {string} mode - Current mode (explore, dashboard, story)
 * @returns {Promise<Response>} Fetch response with streaming body
 */
async function callClaudeAPI(messages, mode) {
  const apiRequestBody = {
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: getSystemPrompt(mode || 'explore'),
    tools: TOOL_DEFINITIONS,
    messages: messages,
    stream: true
  };

  console.log('🚀 Calling Claude API with STREAMING...');
  console.log(`   Model: ${CLAUDE_MODEL}`);
  console.log(`   Max tokens: ${MAX_TOKENS}`);
  console.log('   Stream: TRUE');
  console.log(`   Tools provided: ${TOOL_DEFINITIONS.length}`);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': ANTHROPIC_BETA
    },
    body: JSON.stringify(apiRequestBody)
  });

  console.log('📡 API Response status:', response.status, response.statusText);

  if (!response.ok) {
    const errorData = await response.text();
    console.error('\n❌ API ERROR:');
    console.error('   Status:', response.status);
    console.error('   Error data:', errorData);
    throw new Error(`API error: ${response.status} - ${errorData}`);
  }

  return response;
}

/**
 * Chat endpoint handler
 * Handles streaming conversations with Claude including tool execution
 */
export async function handleChat(req, res) {
  const { message, conversationHistory, mode, uploadedData } = req.body;

  console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      📨 NEW CHAT REQUEST                               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');
  console.log('📝 User message:', message.substring(0, 150) + (message.length > 150 ? '...' : ''));
  console.log('📚 Conversation history length:', conversationHistory?.length || 0);
  console.log('🎯 Mode:', mode || 'explore (default)');
  console.log('📊 Uploaded data:', uploadedData ? `${uploadedData.length} rows` : 'none');

  // Build messages array
  let messages = [...(conversationHistory || [])];
  
  // Prepare user message content
  let userContent = message;
  if (uploadedData && uploadedData.length > 0) {
    const columns = Object.keys(uploadedData[0]);
    const sample = uploadedData.slice(0, 3);
    userContent += `\n\n**UPLOADED DATA:**\n- ${uploadedData.length} rows\n- Columns: ${columns.join(', ')}\n- Sample data (first 3 rows):\n\`\`\`json\n${JSON.stringify(sample, null, 2)}\n\`\`\``;
  }
  
  messages.push({ role: 'user', content: userContent });
  console.log('📨 Total messages in context:', messages.length);

  try {
    let continueLoop = true;
    let loopCount = 0;

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    console.log('   📡 SSE headers set for streaming');

    while (continueLoop && loopCount < MAX_LOOPS) {
      loopCount++;
      console.log('\n╔════════════════════════════════════════════════════════════════════════╗');
      console.log(`║                    🔄 API CALL LOOP ${loopCount}/${MAX_LOOPS}                              ║`);
      console.log('╚════════════════════════════════════════════════════════════════════════╝');

      // Call Claude API
      const apiResponse = await callClaudeAPI(messages, mode);

      // Process the streaming response
      const streamHandler = new StreamHandler();
      const results = await streamHandler.processStream(apiResponse.body, res);

      // Add Claude's response to messages
      messages.push({
        role: 'assistant',
        content: results.assistantContent
      });

      // Check if Claude wants to use more tools
      if (results.stopReason === 'tool_use') {
        console.log(`\n✅ Tool execution complete. Found ${results.toolResults.length} results.`);

        // Add tool results to messages
        messages.push({
          role: 'user',
          content: results.toolResults
        });

        // Continue loop to get final response
        continueLoop = true;
        console.log('\n🔄 Continuing loop to get Claude\'s final response...');
      } else {
        // No more tools needed
        continueLoop = false;

        console.log('\n✅ ══════════════════════════════════════════════════════════════');
        console.log('✅ NO MORE TOOLS NEEDED - Final response complete');
        console.log('✅ ══════════════════════════════════════════════════════════════');

        // Send message_stop event
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

      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Max tool use loops reached' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
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
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
}
