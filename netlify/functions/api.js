// Serverless function for Stripe API
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');

// Create Express app
const app = express();

// Configure CORS to allow requests from any origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Ensure proper content type for all responses
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Word pack definitions
const WORD_PACKS = [
  {
    id: 'basic',
    name: 'Basic Pack',
    description: 'Get started with 10 new word combinations',
    price: 499, // in cents
    amount: 10
  },
  {
    id: 'pro',
    name: 'Pro Pack',
    description: 'Unlock 25 new word combinations',
    price: 999, // in cents
    amount: 25
  },
  {
    id: 'ultimate',
    name: 'Ultimate Pack',
    description: 'Master the game with 50 new combinations',
    price: 1999, // in cents
    amount: 50
  }
];

// Token package definitions
const TOKEN_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Tokens',
    description: '100 tokens to unlock hints and power-ups',
    price: 499, // in cents
    amount: 100
  },
  {
    id: 'plus',
    name: 'Plus Tokens',
    description: '250 tokens with 10% bonus',
    price: 999, // in cents
    amount: 275
  },
  {
    id: 'premium',
    name: 'Premium Tokens',
    description: '500 tokens with 20% bonus',
    price: 1999, // in cents
    amount: 600
  }
];

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Infinite Ideas API Server',
    version: '1.0.0',
    endpoints: [
      '/create-checkout-session',
      '/verify-purchase/:sessionId',
      '/api/webhook',
      '/health'
    ]
  });
});

// Health check endpoint - handle both paths for compatibility
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create a checkout session - handle both paths for compatibility
app.post(['/api/create-checkout-session', '/create-checkout-session'], async (req, res) => {
  try {
    console.log('Received checkout request:', req.body);
    const { packId, packType, userId } = req.body;
    
    if (!packId || !packType || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Find the package
    const packages = packType === 'words' ? WORD_PACKS : TOKEN_PACKAGES;
    const packageDetails = packages.find(p => p.id === packId);
    
    if (!packageDetails) {
      return res.status(400).json({ error: `Package ${packId} not found` });
    }
    
    // In production, we would use Stripe here
    // For now, we'll simulate the Stripe session
    const sessionId = `sim_${Date.now()}_${packId}`;
    
    // Get the host from the request
    const host = req.headers.host || 'infinite-ideas.ai';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    
    // Create a simulated session response
    const session = {
      id: sessionId,
      url: `${protocol}://${host}/success?session_id=${sessionId}&pack_id=${packId}&amount=${packageDetails.amount}`,
      payment_status: 'paid',
      metadata: {
        userId,
        packId,
        packType,
        amount: packageDetails.amount.toString()
      }
    };
    
    console.log('Created simulated checkout session:', session);
    
    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify a purchase - handle both paths for compatibility
app.get(['/api/verify-purchase/:sessionId', '/verify-purchase/:sessionId'], async (req, res) => {
  try {
    console.log('Verifying purchase:', req.params);
    const { sessionId } = req.params;
    
    // For now, we'll simulate a successful purchase
    const packId = sessionId.includes('basic') ? 'basic' : 
                  sessionId.includes('pro') ? 'pro' : 
                  sessionId.includes('ultimate') ? 'ultimate' : 
                  sessionId.includes('starter') ? 'starter' : 
                  sessionId.includes('plus') ? 'plus' : 
                  sessionId.includes('premium') ? 'premium' : 'basic';
                  
    const isTokenPack = packId === 'starter' || packId === 'plus' || packId === 'premium';
    const packType = isTokenPack ? 'tokens' : 'words';
    
    const amount = packId === 'basic' ? 10 : 
                  packId === 'pro' ? 25 : 
                  packId === 'ultimate' ? 50 :
                  packId === 'starter' ? 100 :
                  packId === 'plus' ? 275 :
                  packId === 'premium' ? 600 : 10;
    
    console.log('Simulated purchase verification:', { sessionId, packId, amount, packType });
    
    res.json({
      isCompleted: true,
      packId,
      amount,
      packType
    });
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle Stripe events - handle both paths for compatibility
app.post(['/api/webhook', '/webhook'], (req, res) => {
  console.log('Received webhook event');
  res.json({ received: true });
});

// Handle OPTIONS requests for CORS preflight
app.options('*', cors());

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Export the serverless function
module.exports.handler = serverless(app);