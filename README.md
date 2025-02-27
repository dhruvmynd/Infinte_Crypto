# Infinite Ideas - Element Combinations

A creative web application where users can combine elements to discover endless possibilities. Built with React, TypeScript, and Tailwind CSS.

## Features

- Combine elements to create new ones
- Multiple game modes: Basic, Timed, Category, and 1v1
- Web3 integration with ThirdWeb
- User authentication with Supabase
- In-app purchases with Stripe
- AI-powered element combinations with Groq

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment variables:

```bash
cp .env.example .env
```

4. Update the `.env` file with your own API keys

### Running the Application

Start the development server:

```bash
npm run dev
```

Start the backend server (for Stripe integration):

```bash
npm run server
```

### Testing

Test the API endpoints:

```bash
npm run test:api http://localhost:3000
```

Test the Stripe integration:

```bash
npm run test:stripe http://localhost:3000
```

### Building for Production

```bash
npm run build
```

### Deployment

Deploy to Netlify:

```bash
npm run deploy
```

Check deployment status:

```bash
npm run test:deployment https://your-site.netlify.app
```

## Stripe Integration

This application uses Stripe for processing payments. To set up Stripe:

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe dashboard
3. Update the `.env` file with your Stripe API keys
4. Set up a webhook endpoint in the Stripe dashboard pointing to `/api/webhook`
5. Get the webhook signing secret and add it to the `.env` file

## Supabase Integration

This application uses Supabase for authentication and database. To set up Supabase:

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your API keys from the project settings
4. Update the `.env` file with your Supabase API keys
5. Run the migrations in the `supabase/migrations` folder

## License

This project is licensed under the MIT License - see the LICENSE file for details.