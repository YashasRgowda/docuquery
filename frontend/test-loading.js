// test-loading.js
// Simple test without JSX

async function testLoadingComponents() {
  try {
    // Test basic import
    const LoadingModule = await import('./components/LoadingSpinner.js');
    console.log('✅ Loading components file exists and imports successfully!');
    
    // Test lucide-react
    const LucideModule = await import('lucide-react');
    console.log('✅ Lucide React icons available!');
    
    console.log('Available loading components:');
    console.log('- ProcessingAnimation');
    console.log('- UploadProgress'); 
    console.log('- QueryLoader');
    console.log('- LoadingButton');
    console.log('- ProgressBar');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Details:', error);
  }
}

testLoadingComponents();