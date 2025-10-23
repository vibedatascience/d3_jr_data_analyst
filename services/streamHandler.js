import { executeJavaScript, createDashboard } from '../tools/index.js';
import { dataStore } from './dataStore.js';

/**
 * StreamHandler
 * Processes streaming responses from Claude API and executes tools
 */
export class StreamHandler {
  constructor() {
    this.buffer = '';
    this.currentToolUse = null;
    this.currentTextBlock = null;
    this.toolResults = [];
    this.assistantContent = [];
    this.stopReason = null;
    this.latestDataId = null;
  }

  /**
   * Process a streaming response from Claude API
   * @param {ReadableStream} stream - The response body stream
   * @param {Response} res - Express response object for SSE
   * @returns {Promise<Object>} Processing results
   */
  async processStream(stream, res) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    console.log('\n📥 Processing streaming events...');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      this.buffer += decoder.decode(value, { stream: true });
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        if (line === 'data: [DONE]') continue;

        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const event = JSON.parse(data);
          await this.handleEvent(event, res);
        } catch (parseError) {
          console.error('   ❌ Error parsing event:', parseError);
        }
      }
    }

    console.log(`\n✅ Stream complete. Stop reason: ${this.stopReason}`);

    return {
      assistantContent: this.assistantContent,
      toolResults: this.toolResults,
      stopReason: this.stopReason,
      latestDataId: this.latestDataId
    };
  }

  /**
   * Handle individual SSE events from Claude
   * @param {Object} event - Parsed SSE event
   * @param {Response} res - Express response object for SSE
   */
  async handleEvent(event, res) {
    switch (event.type) {
      case 'message_start':
        console.log('   📨 Message started');
        break;

      case 'content_block_start':
        this.handleContentBlockStart(event, res);
        break;

      case 'content_block_delta':
        this.handleContentBlockDelta(event, res);
        break;

      case 'content_block_stop':
        await this.handleContentBlockStop(res);
        break;

      case 'message_delta':
        if (event.delta.stop_reason) {
          this.stopReason = event.delta.stop_reason;
          console.log(`   🛑 Stop reason: ${this.stopReason}`);
        }
        break;

      case 'message_stop':
        console.log('   ✅ Message complete');
        break;
    }
  }

  /**
   * Handle content block start events
   */
  handleContentBlockStart(event, res) {
    if (event.content_block.type === 'tool_use') {
      this.currentToolUse = {
        id: event.content_block.id,
        name: event.content_block.name,
        input: ''
      };
      console.log(`   🔧 Tool started: ${event.content_block.name} (ID: ${event.content_block.id})`);

      res.write(`data: ${JSON.stringify({
        type: 'tool_start',
        name: event.content_block.name,
        id: event.content_block.id
      })}\n\n`);
    } else if (event.content_block.type === 'text') {
      this.currentTextBlock = { type: 'text', text: '' };
      console.log('   📝 Text block started');
    }
  }

  /**
   * Handle content block delta events (streaming chunks)
   */
  handleContentBlockDelta(event, res) {
    if (event.delta.type === 'input_json_delta') {
      // Tool input streaming
      this.currentToolUse.input += event.delta.partial_json;
      console.log(`   🔧 Tool input chunk: ${event.delta.partial_json}`);

      res.write(`data: ${JSON.stringify({
        type: 'tool_input_delta',
        delta: event.delta.partial_json
      })}\n\n`);
    } else if (event.delta.type === 'text_delta') {
      // Text streaming
      if (this.currentTextBlock) {
        this.currentTextBlock.text += event.delta.text;
      }

      res.write(`data: ${JSON.stringify({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: event.delta.text }
      })}\n\n`);
    }
  }

  /**
   * Handle content block stop events (execute tools)
   */
  async handleContentBlockStop(res) {
    if (this.currentToolUse) {
      console.log(`   🔧 Tool input complete: ${this.currentToolUse.input}`);

      try {
        const toolInput = JSON.parse(this.currentToolUse.input);

        // Store tool use in assistant content
        this.assistantContent.push({
          type: 'tool_use',
          id: this.currentToolUse.id,
          name: this.currentToolUse.name,
          input: toolInput
        });

        // Execute the tool
        await this.executeTool(this.currentToolUse.name, this.currentToolUse.id, toolInput, res);

        this.currentToolUse = null;
      } catch (parseError) {
        console.error('   ❌ Error parsing tool input:', parseError);
      }
    }

    // Save completed text block
    if (this.currentTextBlock) {
      console.log(`   📝 Text block complete: ${this.currentTextBlock.text.length} chars`);
      this.assistantContent.push(this.currentTextBlock);
      this.currentTextBlock = null;
    }
  }

  /**
   * Execute a tool based on its name
   */
  async executeTool(toolName, toolId, toolInput, res) {
    console.log(`\n🔨 Executing tool: ${toolName}`);

    if (toolName === 'execute_javascript') {
      const timeout = toolInput.timeout || 30000;
      const result = await executeJavaScript(toolInput.code, timeout, dataStore);

      // Store the latest dataId
      if (result.dataId) {
        this.latestDataId = result.dataId;
      }

      // Stream console output to client
      if (result.stdout || result.stderr) {
        res.write(`data: ${JSON.stringify({
          type: 'console_output',
          stdout: result.stdout,
          stderr: result.stderr,
          toolId: toolId
        })}\n\n`);
      }

      // Stream data preview to client
      if (result.dataPreview) {
        res.write(`data: ${JSON.stringify({
          type: 'data_preview',
          preview: result.dataPreview,
          toolId: toolId
        })}\n\n`);
      }

      this.toolResults.push({
        type: "tool_result",
        tool_use_id: toolId,
        content: JSON.stringify(result, null, 2)
      });

      res.write(`data: ${JSON.stringify({
        type: 'tool_complete',
        name: toolName
      })}\n\n`);

    } else if (toolName === 'create_dashboard') {
      const result = createDashboard(
        toolInput.code,
        toolInput.title || '',
        toolInput.description || '',
        this.latestDataId,
        dataStore
      );

      this.toolResults.push({
        type: "tool_result",
        tool_use_id: toolId,
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

      res.write(`data: ${JSON.stringify({
        type: 'tool_complete',
        name: toolName
      })}\n\n`);
    }
  }
}
