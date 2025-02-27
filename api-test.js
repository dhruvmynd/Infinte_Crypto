// Simple script to test API endpoints
import fetch from 'node-fetch';

const BASE_URL = process.env.SITE_URL || 'https://infinite-ideas.ai';
const ENDPOINTS = [
  '/health',
  '/api/health',
  '/.netlify/functions/api/health'
];

async function testEndpoint(url) {
  try {
    console.log(`Testing endpoint: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    const status = response.status;
    console.log(`Status: ${status}`);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      data = await response.text();
      console.log('Response:', data.substring(0, 200));
    }
    
    console.log('-------------------');
    return { status, data, success: status >= 200 && status < 300 };
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    console.log('-------------------');
    return { status: 'Error', error: error.message, success: false };
  }
}

async function testStripeEndpoint(url, data = {}) {
  try {
    console.log(`Testing Stripe endpoint: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        packId: 'basic',
        packType: 'words',
        userId: 'test-user-id',
        ...data
      })
    });
    
    const status = response.status;
    console.log(`Status: ${status}`);
    
    let responseData;
    try {
      responseData = await response.json();
      console.log('Response:', JSON.stringify(responseData, null, 2));
    } catch (e) {
      responseData = await response.text();
      console.log('Response:', responseData.substring(0, 200));
    }
    
    console.log('-------------------');
    return { status, data: responseData, success: status >= 200 && status < 300 };
  } catch (error) {
    console.error(`Error testing ${url}:`, error.message);
    console.log('-------------------');
    return { status: 'Error', error: error.message, success: false };
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node api-test.js <site-url>');
    console.log('Example: node api-test.js https://your-site.netlify.app');
    console.log('Example: node api-test.js http://localhost:3001');
    process.exit(1);
  }

  const siteUrl = process.argv[2];
  console.log(`Testing API endpoints for ${siteUrl}`);
  console.log('===================');
  
  // Test health endpoints
  let allSuccessful = true;
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(`${siteUrl}${endpoint}`);
    if (!result.success) allSuccessful = false;
  }
  
  // Test Stripe endpoints
  console.log('\nTesting Stripe integration:');
  console.log('===================');
  
  const stripeResult = await testStripeEndpoint(`${siteUrl}/api/create-checkout-session`);
  if (!stripeResult.success) allSuccessful = false;
  
  // Test direct function endpoint
  const directFunctionResult = await testStripeEndpoint(`${siteUrl}/.netlify/functions/api/create-checkout-session`);
  if (!directFunctionResult.success) allSuccessful = false;
  
  console.log('\nTest Summary:');
  console.log('===================');
  console.log(allSuccessful ? '✅ All tests passed!' : '❌ Some tests failed!');
  
  if (stripeResult.success && stripeResult.data && stripeResult.data.url) {
    console.log('\nStripe checkout URL was generated successfully.');
    console.log('To test the full checkout flow, visit:');
    console.log(stripeResult.data.url);
  }
}

main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});