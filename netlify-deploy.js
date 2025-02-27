// Script to deploy the application to Netlify
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
import { setTimeout } from 'timers/promises';

const execAsync = promisify(exec);

// Function to get deployment status
async function getDeploymentStatus(deployId) {
  try {
    const { stdout } = await execAsync(`netlify api getDeployment --data '{"deploy_id":"${deployId}"}'`);
    const deployment = JSON.parse(stdout);
    return deployment;
  } catch (error) {
    console.error('Error getting deployment status:', error.message);
    return null;
  }
}

// Function to check if a URL is accessible
async function checkUrl(url) {
  try {
    const response = await fetch(url, { 
      method: 'GET',
      timeout: 5000
    });
    return {
      status: response.status,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 'Error',
      ok: false,
      error: error.message
    };
  }
}

// Deploy to Netlify
async function deployToNetlify() {
  console.log('Building and deploying to Netlify...');
  try {
    // Ensure function dependencies are installed
    console.log('Installing function dependencies...');
    try {
      await execAsync('cd netlify/functions && npm install');
    } catch (funcError) {
      console.warn('Warning: Could not install function dependencies locally:', funcError.message);
      console.log('Continuing with deployment - dependencies will be installed during build...');
    }
    
    // Build the application
    console.log('Building the application...');
    await execAsync('npm run build');
    
    // Deploy to Netlify
    console.log('Deploying to Netlify...');
    const { stdout } = await execAsync('netlify deploy --prod --json');
    
    try {
      const deployData = JSON.parse(stdout);
      console.log(`Deployed successfully!`);
      console.log(`Deploy URL: ${deployData.deploy_url}`);
      console.log(`Site URL: ${deployData.url}`);
      
      // Store the deploy ID for future reference
      const deployId = deployData.deploy_id;
      await fs.writeFile('.deploy_id', deployId);
      
      // Wait for the deployment to be fully live
      console.log('Waiting for deployment to be fully live...');
      let isLive = false;
      let attempts = 0;
      
      while (!isLive && attempts < 10) {
        attempts++;
        await setTimeout(5000); // Wait 5 seconds between checks
        
        // Check if the site is accessible
        const siteCheck = await checkUrl(deployData.url);
        const apiCheck = await checkUrl(`${deployData.url}/api/health`);
        
        if (siteCheck.ok) {
          console.log(`Site is now accessible at ${deployData.url}`);
          isLive = true;
          
          // Check API endpoint
          if (apiCheck.ok) {
            console.log(`API endpoint is accessible at ${deployData.url}/api/health`);
          } else {
            console.log(`API endpoint is not yet accessible (status: ${apiCheck.status})`);
          }
        } else {
          console.log(`Site not yet accessible (attempt ${attempts}/10)`);
        }
      }
      
      if (!isLive) {
        console.log('Site did not become accessible within the timeout period.');
        console.log('You may need to check the Netlify dashboard for deployment status.');
      }
      
      return {
        success: true,
        deployId,
        url: deployData.url,
        deploy_url: deployData.deploy_url
      };
    } catch (parseError) {
      console.error('Error parsing deployment output:', parseError.message);
      console.log('Raw output:', stdout);
      return { success: false };
    }
  } catch (error) {
    console.error('Deployment failed:', error.message);
    return { success: false };
  }
}

// Main function
async function main() {
  console.log('Starting Netlify deployment process...');
  
  // Check if we're already logged in to Netlify
  try {
    const { stdout } = await execAsync('netlify status');
    if (!stdout.includes('Logged in')) {
      console.log('You need to log in to Netlify first.');
      console.log('Run: netlify login');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error checking Netlify status:', error.message);
    console.log('Make sure Netlify CLI is installed and you are logged in.');
    console.log('Run: npm install -g netlify-cli && netlify login');
    process.exit(1);
  }
  
  // Deploy to Netlify
  const result = await deployToNetlify();
  
  if (result.success) {
    console.log('\nDeployment completed successfully!');
    console.log(`Site URL: ${result.url}`);
    console.log(`Deploy URL: ${result.deploy_url}`);
    console.log(`Deploy ID: ${result.deployId}`);
    
    // Run the deployment check
    console.log('\nRunning deployment check...');
    try {
      await execAsync(`node deployment-check.js ${result.url}`);
    } catch (error) {
      console.error('Error running deployment check:', error.message);
    }
  } else {
    console.error('Deployment failed.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error in deployment process:', error);
  process.exit(1);
});