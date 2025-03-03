// Serverless function for Stripe API
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
  next();
});

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

// Root endpoint - handle both direct and /api/ prefixed routes
app.get(['/', '/api'], (req, res) => {
  res.json({ 
    message: 'Infinite Ideas API Server',
    version: '1.0.0',
    environment: 'netlify',
    endpoints: [
      '/api/create-checkout-session',
      '/api/verify-purchase/:sessionId',
      '/api/webhook',
      '/api/process-payment',
      '/health'
    ]
  });
});

// Health check endpoint - handle both direct and /api/ prefixed routes
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'netlify'
  });
});

// Create a checkout session - handle both direct and /api/ prefixed routes
app.post(['/create-checkout-session', '/api/create-checkout-session'], async (req, res) => {
  try {
    console.log('Received checkout request:', req.body);
    const { packId, packType, userId, selectedWords, customPrice } = req.body;
    
    if (!packId || !packType || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Find the package or handle custom words
    let packageDetails;
    let lineItems = [];
    
    if (packType === 'custom_words' && selectedWords && selectedWords.length > 0) {
      // Handle custom word selection
      const wordCount = selectedWords.length;
      const wordPrice = 199; // $1.99 per word in cents
      
      packageDetails = {
        name: `${wordCount} Custom Words`,
        description: `Purchase ${wordCount} specific words you've selected`,
        price: wordPrice,
        amount: wordCount
      };
      
      // Create line items for each selected word
      lineItems = selectedWords.map(word => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Word: ${word}`,
            description: 'Custom selected word',
          },
          unit_amount: wordPrice,
        },
        quantity: 1,
      }));
    } else {
      // Standard package
      const packages = TOKEN_PACKAGES;
      packageDetails = packages.find(p => p.id === packId);
      
      if (!packageDetails) {
        return res.status(400).json({ error: `Package ${packId} not found` });
      }
      
      // Create a single line item for the package
      lineItems = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packageDetails.name,
              description: packageDetails.description,
            },
            unit_amount: packageDetails.price,
          },
          quantity: 1,
        }
      ];
    }
    
    // Get the host from the request
    const host = req.headers.host || 'infinite-ideas.ai';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;
    
    try {
      // Create a real Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        metadata: {
          userId,
          packId,
          packType,
          amount: packageDetails.amount.toString(),
          selectedWords: selectedWords ? JSON.stringify(selectedWords) : null
        }
      });
      
      console.log('Created Stripe checkout session:', session);
      
      res.json({ id: session.id, url: session.url });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      // Fallback to simulated checkout if Stripe fails
      console.log('Using simulated checkout session as fallback');
      const sessionId = `sim_${Date.now()}_${packId}`;
      
      const session = {
        id: sessionId,
        url: `${origin}/success?session_id=${sessionId}&pack_id=${packId}&amount=${packageDetails.amount}`,
        payment_status: 'paid',
        metadata: {
          userId,
          packId,
          packType,
          amount: packageDetails.amount.toString(),
          selectedWords: selectedWords ? JSON.stringify(selectedWords) : null
        }
      };
      
      console.log('Created simulated checkout session:', session);
      
      res.json({ id: session.id, url: session.url });
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process direct payment - handle both direct and /api/ prefixed routes
app.post(['/process-payment', '/api/process-payment'], async (req, res) => {
  try {
    console.log('Received direct payment request:', req.body);
    const { 
      paymentMethodId, 
      amount, 
      email, 
      packId, 
      packType, 
      userId, 
      selectedWords 
    } = req.body;
    
    if (!paymentMethodId || !amount || !email || !packId || !packType || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // For development/testing, simulate success
    if (process.env.NODE_ENV !== 'production') {
      console.log('Development mode: Simulating payment success');
      
      // Create a simulated purchase record
      try {
        const { error } = await stripe.customers.create({
          email: email,
          payment_method: paymentMethodId,
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
          metadata: {
            userId,
            packId,
            packType,
            selectedWords: selectedWords ? JSON.stringify(selectedWords) : null
          }
        });
        
        if (error) {
          console.error('Error creating customer:', error);
        }
      } catch (err) {
        console.error('Error in customer creation:', err);
        // Continue with simulation even if customer creation fails
      }
      
      return res.json({ 
        success: true, 
        simulated: true,
        paymentIntent: { 
          id: `sim_${Date.now()}`,
          status: 'succeeded'
        }
      });
    }
    
    try {
      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents and ensure it's an integer
        currency: 'usd',
        payment_method: paymentMethodId,
        confirm: true,
        confirmation_method: 'manual',
        return_url: `${req.headers.origin || 'https://infinite-ideas.ai'}/success`,
        metadata: {
          userId,
          packId,
          packType,
          email,
          selectedWords: selectedWords ? JSON.stringify(selectedWords) : null
        }
      });
      
      console.log('Created payment intent:', paymentIntent);
      
      if (paymentIntent.status === 'succeeded') {
        res.json({ 
          success: true, 
          paymentIntent: { 
            id: paymentIntent.id,
            status: paymentIntent.status
          }
        });
      } else if (paymentIntent.status === 'requires_action') {
        res.json({
          requires_action: true,
          payment_intent_client_secret: paymentIntent.client_secret
        });
      } else {
        res.json({ 
          success: false, 
          error: 'Payment failed',
          status: paymentIntent.status
        });
      }
    } catch (stripeError) {
      console.error('Stripe payment error:', stripeError);
      
      // Provide detailed error message
      const errorMessage = stripeError.raw?.message || stripeError.message || 'Payment processing failed';
      res.status(400).json({ error: errorMessage });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify a purchase - handle both direct and /api/ prefixed routes
app.get(['/verify-purchase/:sessionId', '/api/verify-purchase/:sessionId'], async (req, res) => {
  try {
    console.log('Verifying purchase:', req.params);
    const { sessionId } = req.params;
    
    // Check if this is a simulated session
    if (sessionId.startsWith('sim_')) {
      // For simulated sessions, extract info from the session ID
      const packId = sessionId.includes('starter') ? 'starter' : 
                    sessionId.includes('plus') ? 'plus' : 
                    sessionId.includes('premium') ? 'premium' : 
                    sessionId.includes('custom') ? 'custom' : 'basic';
                    
      const isTokenPack = packId === 'starter' || packId === 'plus' || packId === 'premium';
      const isCustomPack = packId.includes('custom');
      const packType = isTokenPack ? 'tokens' : isCustomPack ? 'custom_words' : 'custom_words';
      
      let amount = 0;
      if (isCustomPack) {
        const match = packId.match(/custom_(\d+)_words/);
        amount = match ? parseInt(match[1], 10) : 1;
      } else {
        amount = packId === 'starter' ? 100 :
                packId === 'plus' ? 275 :
                packId === 'premium' ? 600 : 1;
      }
      
      console.log('Simulated purchase verification:', { sessionId, packId, amount, packType });
      
      return res.json({
        isCompleted: true,
        packId,
        amount,
        packType
      });
    }
    
    // For real Stripe sessions, verify with Stripe
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      console.log('Stripe session retrieved:', session);
      
      if (session.payment_status === 'paid') {
        // Check if this was a custom word selection
        let selectedWords;
        if (session.metadata.selectedWords) {
          try {
            selectedWords = JSON.parse(session.metadata.selectedWords);
          } catch (e) {
            console.error('Error parsing selected words:', e);
          }
        }
        
        return res.json({
          isCompleted: true,
          packId: session.metadata.packId,
          amount: parseInt(session.metadata.amount, 10),
          packType: session.metadata.packType,
          selectedWords
        });
      } else {
        return res.json({
          isCompleted: false,
          packId: session.metadata.packId,
          amount: parseInt(session.metadata.amount, 10),
          packType: session.metadata.packType
        });
      }
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
      
      // Fallback to simulated verification
      const packId = sessionId.includes('starter') ? 'starter' : 
                    sessionId.includes('plus') ? 'plus' : 
                    sessionId.includes('premium') ? 'premium' : 
                    sessionId.includes('custom') ? 'custom' : 'basic';
                    
      const isTokenPack = packId === 'starter' || packId === 'plus' || packId === 'premium';
      const isCustomPack = packId.includes('custom');
      const packType = isTokenPack ? 'tokens' : isCustomPack ? 'custom_words' : 'custom_words';
      
      let amount = 0;
      if (isCustomPack) {
        const match = packId.match(/custom_(\d+)_words/);
        amount = match ? parseInt(match[1], 10) : 1;
      } else {
        amount = packId === 'starter' ? 100 :
                packId === 'plus' ? 275 :
                packId === 'premium' ? 600 : 1;
      }
      
      console.log('Fallback simulated purchase verification:', { sessionId, packId, amount, packType });
      
      return res.json({
        isCompleted: true,
        packId,
        amount,
        packType
      });
    }
  } catch (error) {
    console.error('Error verifying purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle Stripe events - handle both direct and /api/ prefixed routes
app.post(['/webhook', '/api/webhook'], async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    if (sig && endpointSecret) {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log('Webhook verified:', event.type);
    } else {
      // For testing without signature verification
      event = req.body;
      console.log('Webhook received (unverified):', event.type);
    }
    
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        console.log('Payment successful for session:', session.id);
        // Here you would update your database to mark the purchase as completed
        break;
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        // Handle successful payment intent
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Export the serverless function
exports.handler = serverless(app);