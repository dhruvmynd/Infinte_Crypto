// Script to check the deployment status and configuration
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Define the endpoints to check
const ENDPOINTS = [
  { path: '/', description: 'Frontend application' },
  { path: '/health', description: 'Health check endpoint' },
  { path: '/api/health', description: 'API health check endpoint' },
  { path: '/.netlify/functions/api/health', description: 'Direct Netlify function health endpoint' },
  { path: '/.netlify/functions/api', description: 'Direct Netlify function root endpoint' }
];

async function checkEndpoint(baseUrl, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  console.log(`\n🔍 Checking ${url}...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const status = response.status;
    const contentType = response.headers.get('content-type') || '';
    console.log(`📊 Status: ${status}`);
    console.log(`📄 Content-Type: ${contentType}`);
    
    let responseText;
    try {
      responseText = await response.text();
      
      // Determine response type
      if (contentType.includes('application/json')) {
        try {
          const json = JSON.parse(responseText);
          console.log('📦 JSON Response:', json);
        } catch (e) {
          console.log('⚠️ Invalid JSON response');
          console.log(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
        }
      } else if (contentType.includes('text/html')) {
        console.log('🌐 HTML Response (first 200 chars):');
        console.log(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      } else {
        console.log('📝 Text Response:');
        console.log(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      }
      
      // Determine if this is a successful response for this endpoint type
      let isSuccess = status >= 200 && status < 300;
      
      // For API endpoints, we expect JSON responses
      if (endpoint.path.includes('/api/') || endpoint.path.includes('/.netlify/functions/')) {
        isSuccess = isSuccess && contentType.includes('application/json');
      }
      
      console.log(`${isSuccess ? '✅ Success' : '❌ Failed'} - ${endpoint.description}`);
      
      return { 
        path: endpoint.path,
        status,
        contentType,
        isSuccess,
        isHtml: contentType.includes('text/html'),
        isJson: contentType.includes('application/json')
      };
    } catch (e) {
      console.log(`⚠️ Error parsing response: ${e.message}`);
      return { 
        path: endpoint.path,
        status,
        contentType,
        isSuccess: false,
        error: e.message
      };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { 
      path: endpoint.path,
      status: 'Error',
      isSuccess: false,
      error: error.message
    };
  }
}

async function main() {
  // Get the site URL from command line or use default
  const siteUrl = process.argv[2] || 'https://infinite-ideas.ai';
  
  console.log(`\n🚀 Checking deployment at ${siteUrl}`);
  console.log('===========================================');
  
  const results = [];
  
  // Check each endpoint with a delay between requests
  for (const endpoint of ENDPOINTS) {
    const result = await checkEndpoint(siteUrl, endpoint);
    results.push(result);
    // Add a small delay between requests
    await setTimeout(1000);
  }
  
  // Summarize results
  console.log('\n📋 Deployment Check Summary');
  console.log('===========================================');
  
  const successCount = results.filter(r => r.isSuccess).length;
  console.log(`✅ ${successCount}/${ENDPOINTS.length} endpoints are working correctly.`);
  
  const htmlApiResponses = results.filter(r => 
    (r.path.includes('/api/') || r.path.includes('/.netlify/functions/')) && 
    r.isHtml
  );
  
  if (htmlApiResponses.length > 0) {
    console.log('\n⚠️ WARNING: Some API endpoints are returning HTML instead of JSON:');
    htmlApiResponses.forEach(r => {
      console.log(`  - ${r.path}`);
    });
    console.log('\nThis suggests the API server is not properly configured or the endpoints are being redirected to the frontend application.');
    console.log('Check your Netlify configuration in netlify.toml to ensure API routes are correctly mapped to serverless functions.');
  }
  
  const directNetlifyEndpoint = results.find(r => r.path === '/.netlify/functions/api/health');
  if (directNetlifyEndpoint) {
    if (!directNetlifyEndpoint.isSuccess) {
      console.log('\n⚠️ Direct access to Netlify functions is not working.');
      console.log('This suggests the serverless functions may not be deployed correctly or are encountering errors.');
      console.log('Check your Netlify deployment logs and function configuration.');
    } else {
      console.log('\n✅ Direct access to Netlify functions is working correctly.');
    }
  }
  
  // Provide recommendations
  console.log('\n🔧 Recommendations:');
  
  if (successCount === ENDPOINTS.length) {
    console.log('✅ All endpoints are working correctly. No action needed.');
  } else {
    if (htmlApiResponses.length > 0) {
      console.log('1. Check your Netlify redirects configuration in netlify.toml');
      console.log('2. Ensure your serverless functions are deployed correctly');
      console.log('3. Check the Netlify deployment logs for any errors');
      console.log('4. Verify that the API server code in netlify/functions/api.js is correct');
    }
    
    if (directNetlifyEndpoint && !directNetlifyEndpoint.isSuccess) {
      console.log('5. Check if your serverless function has any runtime errors');
      console.log('6. Verify that all required dependencies are included in netlify/functions/package.json');
    }
  }
}

main().catch(error => {
  console.error('Error running deployment check:', error);
  process.exit(1);
});