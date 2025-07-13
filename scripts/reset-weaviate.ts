/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import weaviate from 'weaviate-ts-client';

async function resetWeaviate() {
  const client = weaviate.client({
    scheme: 'http',
    host: 'localhost:8080',
  });

  try {
    console.log('🗑️ Clearing Weaviate database...');

    // Delete the existing Product class
    try {
      await client.schema.classDeleter().withClassName('Product').do();
      console.log('✅ Deleted existing Product class');
    } catch (error) {
      console.log('ℹ️ Product class not found (this is ok)');
    }

    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Weaviate reset complete!');
    console.log('🔄 Now restart your application to recreate the schema with correct dimensions');
  } catch (error) {
    console.error('❌ Error resetting Weaviate:', error);
  }
}

resetWeaviate();
