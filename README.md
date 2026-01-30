# Onchain Flows

Real-time cryptocurrency intelligence dashboard that tracks and visualizes significant blockchain transactions across multiple networks. Discover whale movements, smart money flows, and emerging onchain trends.

**Built with Next.js 16, TypeScript, and Nansen API**

## What It Does

Onchain Flows aggregates high-value onchain activity from Ethereum, Solana, and Base blockchains, helping traders and researchers stay ahead of significant market movements. The platform identifies:

- **Whale Movements**: Large transfers ($2-5M+) between wallets
- **Smart Money Tracking**: DEX trades from identified smart traders ($1K+)
- **DeFi Activities**: Swaps, liquidity additions/removals, and protocol interactions
- **Public Figures**: Movements from notable individuals and influencers ($1K+)
- **Exchange Flows**: Deposits and withdrawals from centralized exchanges
- **Fund Activity**: Movements from crypto funds and institutional players

Each flow is scored for "interestingness" (0-100) based on data source quality, transaction size, entity reputation, and recency.

## Key Features

### 🎯 Multi-Tier Intelligence System
- **Tier 1**: Smart Money DEX trades ($1K+) - Highest priority
- **Tier 2**: Labeled entity transfers ($500K+) - Medium priority
- **Tier 3**: Large whale movements ($2-5M+) - Fallback
- Automatic deduplication and same-entity self-transfer filtering

### 📊 Flow Intelligence Dashboard
- Aggregated metrics showing net flows by category (whales, smart traders, exchanges, fresh wallets)
- 1-hour and 24-hour views
- Per-token breakdown for detailed analysis
- Visual sentiment gauge

### 🔍 Smart Filtering
- **Chain Filters**: Ethereum, Solana, Base
- **Tab Views**: All Flows, Deposits, Large Deposits, Large Withdrawals, Funds, Market Makers
- **Dollar Thresholds**: Configurable minimums (e.g., $5M+ for exchange deposits)

### 🐦 Twitter Integration
- One-click sharing with pre-formatted tweets
- Auto-generated OG images for rich previews
- Copy-to-clipboard functionality
- Optimized for engagement with emojis and formatting

### ⚡ Real-Time Updates
- Auto-refresh every 2 minutes (movements) and 10 minutes (intelligence)
- Last updated timestamps
- Visual loading indicators
- Stale-while-revalidate caching strategy

### 🎨 Clean, Dark-Themed Interface
- Optimized for night trading
- Responsive grid layout
- Color-coded flow types
- Entity badges and chain indicators

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Frontend**: React 19.2.3
- **Styling**: Tailwind CSS v4 with custom dark theme
- **Icons**: Lucide React (v0.563.0)
- **OG Images**: Vercel OG (v0.8.6)
- **Caching**: lru-cache (v11.2.5) for in-memory caching
- **Date Utils**: date-fns (v4.1.0)
- **Deployment**: Vercel (serverless platform)

## Data Sources

### Nansen API Integration
The primary data source providing smart money labels, onchain flow data, and entity classifications.

**Key Endpoints Used:**
- `/smart-money/dex-trades` - Smart trader activity ($1K+)
- `/transfers` - Labeled entity transfers ($500K+)
- `/whale-movements` - Large transactions ($2-5M+)
- `/public-figures` - Notable individual activity ($1K+)

**Data Fetching Strategy:**
1. Smart Money DEX trades (highest priority, lowest threshold)
2. Labeled entity transfers (medium priority)
3. Large whale movements (fallback for generic large transfers)
4. Public figure tracking (special category)

### Caching Strategy
- **Movements Data**: 2-minute cache with CDN
- **Intelligence Data**: 10-minute cache with CDN
- **In-Memory Cache**: LRU cache for frequently accessed data
- **Fallback**: Returns stale cache if API fails

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── api/
│   │   ├── movements/               # Main endpoint (all flows)
│   │   └── intelligence/            # Aggregated metrics
│   ├── layout.tsx                   # Root layout with theming
│   └── page.tsx                     # Main dashboard
│
├── components/                       # React components
│   ├── flows/
│   │   ├── FlowCard.tsx            # Individual flow display
│   │   ├── FlowList.tsx            # Grid layout
│   │   └── FlowSkeleton.tsx        # Loading states
│   ├── intelligence/                # Intelligence summary
│   │   ├── IntelligenceSummary.tsx
│   │   ├── IntelligenceCard.tsx
│   │   └── SentimentGauge.tsx
│   ├── layout/                      # Header, tabs, filters
│   │   ├── Header.tsx
│   │   ├── TabNavigation.tsx
│   │   ├── ChainFilter.tsx
│   │   └── FilterPills.tsx
│   └── shared/                      # Reusable components
│       ├── ShareButton.tsx
│       ├── ChainBadge.tsx
│       └── XIcon.tsx
│
├── server/                          # Server-side logic
│   ├── nansen/
│   │   ├── client.ts               # Nansen API client
│   │   └── normalizers.ts          # Response normalization
│   ├── flows/
│   │   ├── mapper.ts               # Movement → Flow conversion
│   │   ├── scorer.ts               # Interestingness scoring
│   │   └── intelligence.ts         # Metrics aggregation
│   ├── enrichers/                  # Data enrichment
│   │   ├── entity-enricher.ts      # Entity label enrichment
│   │   └── tag-enricher.ts         # Tag classification
│   ├── cache.ts                    # Caching layer
│   └── deduplicator.ts             # Duplicate removal
│
├── lib/                            # Client utilities
│   ├── nansen/                     # Type definitions
│   └── utils/                      # Formatting, Twitter helpers
│
└── types/                          # TypeScript types
    ├── flows.ts                    # Flow definitions
    └── movement.ts                 # Raw movement types
```

## API Routes

### GET `/api/movements`
Returns all onchain flows with multi-tier intelligence fetching.

**Query Parameters:**
- `chain` (optional): Filter by chain (ethereum, solana, base)
- `type` (optional): Filter by type (whale, smart-money, defi-activity)

**Response:**
```json
{
  "flows": [
    {
      "id": "...",
      "type": "smart-money",
      "chain": "ethereum",
      "timestamp": "2026-01-30T12:00:00Z",
      "amountUsd": 1000000,
      "token": { "symbol": "ETH", "address": "0x...", "name": "Ethereum" },
      "from": { "address": "0x...", "label": "Smart Trader" },
      "to": { "address": "0x...", "label": "Exchange: Binance" },
      "txHash": "0x...",
      "metadata": {
        "tags": ["exchange_deposit", "smart_money"],
        "confidence": 0.95,
        "interestingnessScore": 85
      }
    }
  ]
}
```

**Cache**: 2 minutes

### GET `/api/intelligence`
Returns aggregated flow intelligence metrics.

**Response:**
```json
{
  "oneHour": {
    "whale": { "netFlowUsd": 5000000, "avgFlowUsd": 500000, "walletCount": 10 },
    "smartTrader": { "netFlowUsd": 2000000, "avgFlowUsd": 50000, "walletCount": 40 },
    "exchange": { "netFlowUsd": -3000000, "avgFlowUsd": 150000, "walletCount": 20 },
    "freshWallet": { "netFlowUsd": 100000, "avgFlowUsd": 10000, "walletCount": 10 }
  },
  "twentyFourHour": { ... },
  "topTokens": [
    { "symbol": "ETH", "netFlowUsd": 10000000, "flowCount": 100 }
  ]
}
```

**Cache**: 10 minutes

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Nansen API key ([Get one here](https://www.nansen.ai/api))

### Installation

```bash
# Clone the repository
git clone https://github.com/onlyshauns/onchain-flows.git
cd onchain-flows

# Install dependencies
npm install

# Set up environment variables
# Create a .env.local file:
NANSEN_API_KEY=your_nansen_api_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NANSEN_API_KEY` | Yes | Your Nansen API key for onchain data |
| `NEXT_PUBLIC_APP_URL` | No | App URL for OG image generation (defaults to localhost) |

## Deployment

### Deploy to Vercel

The project is configured for automatic Vercel deployment:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NANSEN_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your production URL)
4. Deploy

Automatic deployments will trigger on pushes to the `main` branch.

## Development Commands

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Flow Scoring System

Each flow receives an "interestingness score" (0-100) based on:

1. **Data Source / Flow Type** (40 points max)
   - Smart Money trades: 40 points
   - Labeled entity transfers: 30 points
   - Whale movements: 20 points

2. **Transaction Size** (30 points max)
   - $50M+: 30 points
   - $10M-$50M: 25 points
   - $5M-$10M: 20 points
   - $1M-$5M: 15 points
   - <$1M: 10 points

3. **Entity Quality** (20 points max)
   - Known smart trader/fund: 20 points
   - Known exchange: 15 points
   - Public figure: 15 points
   - Generic whale: 10 points

4. **Recency** (10 points max)
   - <1 hour: 10 points
   - 1-6 hours: 8 points
   - 6-24 hours: 5 points
   - >24 hours: 2 points

**Bonuses** (up to +15 points):
- Exchange deposit/withdrawal: +5
- Public figure involvement: +5
- High confidence classification: +5

## Contributing

Contributions are welcome! Areas for improvement:
- Additional chain support (Arbitrum, Optimism, Polygon)
- Token launch detection
- Enhanced DeFi activity tracking
- More sophisticated sentiment analysis
- Historical flow data and trends

## License

MIT

---

**Powered by Nansen API** • **Deployed on Vercel**
