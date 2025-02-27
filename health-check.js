// Simple script to check the health of the API
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

// Try multiple ports to find the running server
const tryPorts = [3000, 3001, 3002, 3003];
const ENDPOINTS = [
  '/health',
  '/api/health',
  '/'
];

async function checkEndpoint(url) {
  try {
    console.log(`Checking ${url}...`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const status = response.status;
    let data;
    let contentType = response.headers.get('content-type') || '';
    let isHtml = contentType.includes('text/html');
    
    try {
      const text = await response.text();
      
      // Check if response is HTML
      if (isHtml || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.log(`Status: ${status} (HTML response)`);
        console.log('Response: HTML content (frontend application)');
        console.log('NOTE: Expected JSON API response but received HTML. This endpoint may be misconfigured.');
      } else {
        try {
          data = JSON.parse(text);
          console.log(`Status: ${status}`);
          console.log('Response:', data);
        } catch (e) {
          console.log(`Status: ${status}`);
          console.log('Response: (non-JSON text)');
          console.log(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
        }
      }
    } catch (e) {
      data = `Error parsing response: ${e.message}`;
      console.log(`Status: ${status}`);
      console.log('Response:', data);
    }
    
    console.log('-------------------');
    
    return { 
      status, 
      isHtml, 
      success: status >= 200 && status < 300 && !isHtml 
    };
  } catch (error) {
    console.error(`Error checking ${url}:`, error.message);
    console.log('-------------------');
    return { status: 'Error', error: error.message, success: false };
  }
}

async function findActiveServer() {
  for (const port of tryPorts) {
    const url = `http://localhost:${port}/health`;
    try {
      const response = await fetch(url, { 
        method: 'GET',
        timeout: 2000, // 2 second timeout
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache'
        }
      });
      if (response.ok) {
        console.log(`Found active server on port ${port}`);
        return port;
      }
    } catch (error) {
      console.log(`No server found on port ${port}`);
    }
  }
  return null;
}

async function main() {
  console.log('Checking for active API server...');
  
  // If VITE_API_URL is set, use it directly
  if (process.env.VITE_API_URL) {
    const BASE_URL = process.env.VITE_API_URL;
    console.log(`Using API server at ${BASE_URL}`);
    console.log('===================');
    
    let successCount = 0;
    let htmlResponseCount = 0;
    
    // Check each endpoint with a delay between requests
    for (const endpoint of ENDPOINTS) {
      const url = `${BASE_URL}${endpoint}`;
      const result = await checkEndpoint(url);
      if (result.success) {
        successCount++;
      }
      if (result.isHtml) {
        htmlResponseCount++;
      }
      // Add a small delay between requests
      await setTimeout(1000);
    }
    
    console.log('Health check complete.');
    console.log(`${successCount}/${ENDPOINTS.length} endpoints are healthy.`);
    
    if (htmlResponseCount > 0) {
      console.log(`WARNING: ${htmlResponseCount} endpoints returned HTML instead of JSON.`);
      console.log('This suggests the API server is not properly configured or the endpoints are being redirected to the frontend application.');
      console.log('Check your Netlify configuration in netlify.toml to ensure API routes are correctly mapped to serverless functions.');
    }
    
    if (successCount === 0) {
      console.error('All health checks failed. Please check your server configuration.');
      process.exit(1);
    }
    
    return;
  }
  
  // Otherwise, try to find a local server
  const activePort = await findActiveServer();
  
  if (!activePort) {
    console.error('No active API server found on any of the expected ports.');
    console.error('Please make sure the server is running.');
    process.exit(1);
  }
  
  const BASE_URL = `http://localhost:${activePort}`;
  
  console.log(`Using API server at ${BASE_URL}`);
  console.log('===================');
  
  let successCount = 0;
  let htmlResponseCount = 0;
  
  // Check each endpoint with a delay between requests
  for (const endpoint of ENDPOINTS) {
    const url = `${BASE_URL}${endpoint}`;
    const result = await checkEndpoint(url);
    if (result.success) {
      successCount++;
    }
    if (result.isHtml) {
      htmlResponseCount++;
    }
    // Add a small delay between requests
    await setTimeout(1000);
  }
  
  console.log('Health check complete.');
  console.log(`${successCount}/${ENDPOINTS.length} endpoints are healthy.`);
  
  if (htmlResponseCount > 0) {
    console.log(`WARNING: ${htmlResponseCount} endpoints returned HTML instead of JSON.`);
    console.log('This suggests the API server is not properly configured or the endpoints are being redirected to the frontend application.');
  }
  
  if (successCount === 0) {
    console.error('All health checks failed. Please check your server configuration.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error running health check:', error);
  process.exit(1);
});