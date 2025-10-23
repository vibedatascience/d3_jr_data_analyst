/**
 * Create dashboard - validates and returns D3 code for client execution
 * Optionally injects stored data into the code
 * @param {string} code - D3.js visualization code
 * @param {string} title - Dashboard title
 * @param {string} description - Dashboard description
 * @param {string|null} dataId - ID of stored data to inject
 * @param {Map} dataStore - Data store for retrieving saved data
 * @returns {Object} Validation result with code ready for rendering
 */
export function createDashboard(code, title = '', description = '', dataId = null, dataStore) {
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
