/**
 * Execute JavaScript code in Node.js environment
 * Captures console output and automatically saves returned data
 * @param {string} code - JavaScript code to execute
 * @param {number} timeout - Execution timeout in milliseconds
 * @param {Map} dataStore - Data store for persisting returned data
 * @returns {Promise<Object>} Execution result with stdout, stderr, and optionally saved data
 */
export async function executeJavaScript(code, timeout = 30000, dataStore) {
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
