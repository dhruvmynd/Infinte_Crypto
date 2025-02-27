// Simple script to check the health of the API
import fetch from 'node-fetch';

const BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000';
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
        'Content-Type': 'application/json'
      }
    });
    
    const status = response.status;
    let data;
    
    try {
      data = await response.json();
    } catch (e) {
      data = await response.text();
    }
    
    console.log(`Status: ${status}`);
    console.log('Response:', data);
    console.log('-------------------');
    
    return { status, data };
  } catch (error) {
    console.error(`Error checking ${url}:`, error.message);
    console.log('-------------------');
    return { status: 'Error', error: error.message };
  }
}

async function main() {
  console.log('Checking API health endpoints...');
  console.log('===================');
  
  for (const endpoint of ENDPOINTS) {
    await checkEndpoint(`${BASE_URL}${endpoint}`);
  }
  
  console.log('Health check complete.');
}

main().catch(error => {
  console.error('Error running health check:', error);
  process.exit(1);
});