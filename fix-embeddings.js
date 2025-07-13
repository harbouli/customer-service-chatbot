const { execSync } = require('child_process');

console.log('🔧 Fixing embedding dimension issue...');

try {
  // Stop any running containers
  console.log('⏹️ Stopping containers...');
  execSync('docker-compose down', { stdio: 'inherit' });

  // Remove volumes to clear data
  console.log('🗑️ Clearing volumes...');
  execSync('docker-compose down -v', { stdio: 'inherit' });

  // Start fresh
  console.log('🚀 Starting fresh containers...');
  execSync('docker-compose up -d', { stdio: 'inherit' });

  console.log('✅ Fixed! Weaviate has been reset with clean data.');
  console.log('🔄 Now restart your application: npm run dev');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Manual fix:');
  console.log('1. Stop your app (Ctrl+C)');
  console.log('2. Run: docker-compose down -v');
  console.log('3. Run: docker-compose up -d');
  console.log('4. Restart your app: npm run dev');
}

// 5. Add this to your package.json scripts:
/*
"scripts": {
  "fix-embeddings": "node fix-embeddings.js",
  "reset-weaviate": "docker-compose down -v && docker-compose up -d"
}
*/
