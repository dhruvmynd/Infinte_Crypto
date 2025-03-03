// ES Module version of the server for Bolt environment
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createServer } from 'http';
import { once } from 'events';

// Get current file path (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const DEFAULT_PORT = 3000;
let port = process.env.PORT || DEFAULT_PORT;

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add API health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'api' });
});

// Create a checkout session - handle both /api/create-checkout-session and /create-checkout-session
app.post(['/api/create-checkout-session', '/create-checkout-session'], async (req, res) => {
  try {
    console.log('Received checkout request:', req.body);
    const { packId, packType, userId, selectedWords, directPayment } = req.body;
    
    if (!packId || !packType || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Find the package
    let packageDetails;
    
    if (packType === 'custom_words' && selectedWords && selectedWords.length > 0) {
      // Handle custom word selection
      const wordCount = selectedWords.length;
      const wordPrice = 199; // $1.99 per word in cents
      
      packageDetails = {
        name: `${wordCount} Custom Words`,
        description: `Purchase ${wordCount} specific words you've selected`,
        price: wordPrice * wordCount,
        amount: wordCount
      };
    } else {
      // Standard package
      const packages = packType === 'words' ? WORD_PACKS : TOKEN_PACKAGES;
      packageDetails = packages.find(p => p.id === packId);
      
      if (!packageDetails) {
        return res.status(400).json({ error: `Package ${packId} not found` });
      }
    }
    
    // If this is a direct payment (in-page checkout), return a simulated session
    if (directPayment) {
      console.log('Processing direct payment request');
      
      const sessionId = `sim_direct_${Date.now()}_${packId}`;
      
      const session = {
        id: sessionId,
        url: null, // No URL needed for direct payment
        payment_status: 'paid',
        metadata: {
          userId,
          packId,
          packType,
          amount: packageDetails.amount.toString(),
          selectedWords: selectedWords ? JSON.stringify(selectedWords) : null,
          directPayment: 'true'
        }
      };
      
      console.log('Created direct payment session:', session);
      
      return res.json({
      }
      )
    }
  }
}
)