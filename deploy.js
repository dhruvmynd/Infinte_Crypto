// Script to deploy the application to Netlify
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Check if Netlify CLI is installed
async function checkNetlifyCLI() {
  try {
    await execAsync('netlify --version');
    return true;
  } catch (error) {
    return false;
  }
}

// Install Netlify CLI if not installed
async function installNetlifyCLI() {
  console.log('Installing Netlify CLI...');
  try {
    await execAsync('npm install -g netlify-cli');
    console.log('Netlify CLI installed successfully.');
    return true;
  } catch (error) {
    console.error('Failed to install Netlify CLI:', error.message);
    return false;
  }
}

// Check if the functions directory has the required files
async function checkFunctionsDirectory() {
  try {
    const functionsDir = path.join(process.cwd(), 'netlify', 'functions');
    const apiJsPath = path.join(functionsDir, 'api.js');
    const packageJsonPath = path.join(functionsDir, 'package.json');
    
    await fs.access(apiJsPath);
    await fs.access(packageJsonPath);
    
    console.log('Functions directory is properly configured.');
    return true;
  } catch (error) {
    console.error('Functions directory is not properly configured:', error.message);
    return false;
  }
}

// Deploy to Netlify
async function deployToNetlify() {
  console.log('Building and deploying to Netlify...');
  try {
    // Build the application
    console.log('Building the application...');
    await execAsync('npm run build');
    
    // Deploy to Netlify
    console.log('Deploying to Netlify...');
    const { stdout } = await execAsync('netlify deploy --prod');
    console.log(stdout);
    
    // Extract the deploy URL from the output
    const deployUrlMatch = stdout.match(/Website Draft URL: (https:\/\/[^\s]+)/);
    if (deployUrlMatch && deployUrlMatch[1]) {
      const deployUrl = deployUrlMatch[1];
      console.log(`Deployed successfully to: ${deployUrl}`);
      
      // Check the deployed site
      console.log('\nChecking the deployed site...');
      await execAsync(`node deployment-check.js ${deployUrl}`);
    } else {
      console.log('Deployment completed, but could not extract the deploy URL.');
    }
    
    return true;
  } catch (error) {
    console.error('Deployment failed:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('Starting deployment process...');
  
  // Check if Netlify CLI is installed
  const hasNetlifyCLI = await checkNetlifyCLI();
  if (!hasNetlifyCLI) {
    const installed = await installNetlifyCLI();
    if (!installed) {
      console.error('Cannot proceed without Netlify CLI.');
      process.exit(1);
    }
  }
  
  // Check functions directory
  const functionsOk = await checkFunctionsDirectory();
  if (!functionsOk) {
    console.error('Cannot proceed with deployment due to issues with the functions directory.');
    process.exit(1);
  }
  
  // Deploy to Netlify
  const deployed = await deployToNetlify();
  if (!deployed) {
    console.error('Deployment failed.');
    process.exit(1);
  }
  
  console.log('Deployment process completed successfully.');
}

main().catch(error => {
  console.error('Error in deployment process:', error);
  process.exit(1);
});