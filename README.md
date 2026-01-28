# Onchain Flows

Live crypto intelligence dashboard that tracks onchain flows across multiple blockchains. Share interesting whale movements, DeFi activities, and smart money moves instantly on Twitter.

## Features

- 🐋 **Whale Movements** - Track large transfers and smart money flows
- 💰 **DeFi Activities** - Monitor swaps, liquidity, and yield farming
- 🚀 **Token Launches** - Discover new trending tokens
- 🧠 **Smart Money** - Follow top trader activities
- 🔥 **What's Hot** - See trending onchain activity

### Twitter Sharing
- One-click share to Twitter with pre-formatted tweets
- Beautiful auto-generated card images (OG images)
- Copy-to-clipboard for quick sharing
- Optimized for virality with emojis and formatting

### Multi-Chain Support
- Solana (SOL) - Priority
- Ethereum (ETH) - Priority
- Base - Priority
- Arbitrum, Optimism, Polygon

### Live Updates
- Auto-refresh every 30 seconds
- Real-time flow tracking
- Visual update indicators

## Getting Started

### Development

1. Clone the repository
```bash
git clone https://github.com/onlyshauns/onchain-flows.git
cd onchain-flows
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file:
```bash
NANSEN_API_KEY=your_nansen_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### Production Deployment

Deployed on Vercel with automatic deployments from the `main` branch.

Environment variables are configured in Vercel dashboard:
- `NANSEN_API_KEY` - Your Nansen API key
- `NEXT_PUBLIC_APP_URL` - Your production URL

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **API**: Nansen API
- **Icons**: Lucide React
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (Nansen integration)
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── layout/           # Header, tabs, filters
│   ├── flows/            # Flow cards and lists
│   └── shared/           # Reusable components
├── context/              # React Context (state management)
├── lib/                  # Utilities and helpers
│   ├── nansen/          # Nansen API client
│   └── utils/           # Formatting, chains, Twitter
└── types/               # TypeScript type definitions
```

## API Routes

- `/api/flows/whale-movements` - Whale movement data
- `/api/flows/defi-activities` - DeFi activity data (coming soon)
- `/api/flows/token-launches` - Token launch data (coming soon)
- `/api/flows/smart-money` - Smart money flows (coming soon)
- `/api/og` - OpenGraph image generation (coming soon)

## Contributing

This project tracks live onchain flows using Nansen's API. Contributions welcome!

## License

MIT
