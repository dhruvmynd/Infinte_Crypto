// Script to test Stripe integration
import fetch from 'node-fetch';

const BASE_URL = process.env.SITE_URL || 'https://infinite-ideas.ai';

async function simulateCheckout(siteUrl, packId = 'basic', packType = 'words') {
  try {
    console.log(`Testing checkout for ${packType} pack: ${packId}`);
    
    // Step 1: Create checkout session
    console.log('\nStep 1: Creating checkout session...');
    const createResponse = await fetch(`${siteUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packId,
        packType,
        userId: 'test-user-id'
      })
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create checkout session: ${createResponse.status}`);
    }
    
    const session = await createResponse.json();
    console.log('Checkout session created:', session);
    
    if (!session.id) {
      throw new Error('No session ID returned');
    }
    
    // Step 2: Verify the purchase (simulate completion)
    console.log('\nStep 2: Verifying purchase...');
    const verifyResponse = await fetch(`${siteUrl}/api/verify-purchase/${session.id}`);
    
    if (!verifyResponse.ok) {
      throw new Error(`Failed to verify purchase: ${verifyResponse.status}`);
    }
    
    const verification = await verifyResponse.json();
    console.log('Purchase verification:', verification);
    
    return {
      success: true,
      session,
      verification
    };
  } catch (error) {
    console.error('Error in checkout flow:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function main() {
  if (process.argv.length < 3) {
    console.log('Usage: node stripe-test.js <site-url> [pack-id] [pack-type]');
    console.log('Example: node stripe-test.js https://your-site.netlify.app basic words');
    process.exit(1);
  }

  const siteUrl = process.argv[2];
  const packId = process.argv[3] || 'basic';
  const packType = process.argv[4] || 'words';
  
  console.log(`Testing Stripe integration for ${siteUrl}`);
  console.log('===================');
  
  const result = await simulateCheckout(siteUrl, packId, packType);
  
  console.log('\nTest Summary:');
  console.log('===================');
  console.log(result.success ? '✅ Stripe integration test passed!' : '❌ Stripe integration test failed!');
  
  if (result.success && result.session.url) {
    console.log('\nTo test the full checkout flow manually, visit:');
    console.log(result.session.url);
  }
}

main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});