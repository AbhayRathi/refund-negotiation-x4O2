# Refund Negotiation System

AI-powered payment negotiation middleware for web crawls with SLA-based refunds.

## Overview

This Next.js application implements an intelligent payment negotiation system where AI agents automatically negotiate crawl prices based on content value, track SLA compliance, and handle refunds when service levels aren't met.

## Features

### 🤖 HTML-Aware Crawl Value Optimizer
- Analyzes HTML structure and content quality
- Computes information value based on:
  - Structured data (JSON-LD, microdata)
  - Content elements (tables, lists, headings)
  - Metadata and rich snippets
  - Word count and multimedia presence
- Calculates Willingness to Pay (WTP) dynamically

### 💡 Intelligent Negotiation Logic
- **Accept/Counter/Reject Decision Engine**
  - Evaluates offers against computed value
  - Considers SLA terms and risks
  - Supports multi-round negotiations (up to 3 counter-offers)
- **SLA-Based Evaluation**
  - Response time guarantees
  - Success rate commitments
  - Automatic refund calculations on SLA failures

### 💳 Mocked Locus/x402 Payment System
- Payment initiation and processing
- Signed receipt generation with HMAC signatures
- Refund handling with reason tracking
- x402 protocol headers support

### 📊 In-Memory Transaction Store
- Complete transaction history
- Negotiation thread tracking
- SLA compliance monitoring
- Dashboard metrics aggregation

### 🎨 Tailwind Dashboard
- **Real-time metrics display**
  - Total transactions and revenue
  - Refund amounts
  - SLA success rates
  - Active negotiations
- **Transaction table view**
  - Status tracking (negotiating, agreed, paid, completed, refunded)
  - Amount and SLA compliance
  - Refund information
- **Detailed transaction modal**
  - Full negotiation thread
  - Payment receipts with signatures
  - SLA evaluation results
  - Refund details

### 🔄 Next.js Middleware
- Request interception for payment requirements
- Automatic negotiation triggering
- x402 protocol support

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── crawl/          # Crawl simulation endpoint
│   │   │   ├── negotiate/      # Negotiation API
│   │   │   ├── transactions/   # Transaction listing
│   │   │   └── metrics/        # Dashboard metrics
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx            # Dashboard UI
│   ├── components/             # React components
│   ├── lib/
│   │   ├── crawl-value-optimizer.ts  # HTML analysis & WTP calculation
│   │   ├── negotiation-engine.ts     # Decision logic
│   │   ├── payment-system.ts         # Payment & refund processing
│   │   └── transaction-store.ts      # In-memory data store
│   ├── types/
│   │   └── index.ts            # TypeScript type definitions
│   └── middleware.ts           # Next.js middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## API Endpoints

### POST /api/crawl
Simulates a web crawl with automatic negotiation.

**Request:**
```json
{
  "url": "https://example.com/page",
  "htmlContent": "<html>...</html>"
}
```

**Response:**
```json
{
  "crawlRequest": {...},
  "crawlValue": {
    "informationValue": 75,
    "contentQuality": 80,
    "dataPoints": 45,
    "uniqueness": 65,
    "willingnessToPayCents": 89
  },
  "transaction": {...},
  "negotiationResponse": {...}
}
```

### POST /api/negotiate
Handles negotiation rounds.

**Request:**
```json
{
  "crawlRequest": {...},
  "offer": {
    "proposedPriceCents": 50,
    "sla": {
      "expectedResponseTimeMs": 3000,
      "expectedSuccessRate": 0.95,
      "refundPercentageOnFailure": 0.6
    }
  }
}
```

### GET /api/transactions
Lists all transactions with optional filters.

**Query Parameters:**
- `status`: Filter by transaction status
- `limit`: Maximum number of results

### GET /api/metrics
Returns dashboard metrics.

## How It Works

### 1. Crawl Value Computation
When a crawl request arrives, the system:
1. Parses HTML content
2. Analyzes structure (tables, lists, metadata)
3. Assesses content quality (word count, multimedia)
4. Calculates uniqueness score
5. Computes WTP in cents based on weighted factors

### 2. Negotiation Process
1. **Initial Offer**: Client proposes a price and SLA
2. **Evaluation**: Server assesses offer against computed value
3. **Response**: 
   - **Accept**: If offer meets threshold (>70% of WTP)
   - **Counter**: If offer is low but negotiable
   - **Reject**: If offer is too low after max rounds
4. **Agreement**: Finalize terms and initiate payment

### 3. SLA Tracking
- Response time is monitored
- Success/failure is tracked
- Automatic refund calculation if SLA violated
- Refund percentage based on severity of violation

### 4. Payment Flow
1. Agreement reached → Payment initiated
2. Signed receipt generated (HMAC-SHA256)
3. Crawl executed with timing
4. SLA evaluated
5. Refund processed if needed

## Dashboard Usage

### Simulate Crawls
Click "Simulate New Crawl" to generate a test transaction with:
- Random URL from sample set
- Sample HTML content
- Automatic negotiation
- Simulated crawl execution
- SLA evaluation and potential refund

### View Transactions
- Click "View" on any transaction to see details
- Negotiation thread shows full conversation
- Payment receipts include cryptographic signatures
- SLA results show compliance status

### Monitor Metrics
The dashboard auto-refreshes every 3 seconds showing:
- Total transaction count
- Revenue and refunds
- SLA success rate
- Active negotiations

## Key Algorithms

### Value Calculation
```
WTP = Base(10¢) + 
      InformationValue(0-50¢) + 
      ContentQuality(0-30¢) + 
      DataPoints(0-40¢) + 
      Uniqueness(0-30¢)
```

### Negotiation Thresholds
- **Accept**: Offer ≥ 70% of WTP (with SLA adjustment)
- **Counter**: Offer < 70% but within range
- **Reject**: After 3 rounds or offer too low

### SLA Risk Scoring
- Response time penalty
- Success rate penalty  
- Refund percentage consideration
- Combined risk score (max 50%)

## Technology Stack

- **Next.js 14**: App Router, API Routes, Middleware
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **React**: Interactive UI components
- **Crypto**: HMAC signatures for receipts

## Future Enhancements

- [ ] Persistent storage (database integration)
- [ ] Real payment gateway integration
- [ ] Machine learning for value prediction
- [ ] Multi-currency support
- [ ] Advanced SLA templates
- [ ] Negotiation history analytics
- [ ] WebSocket for real-time updates
- [ ] API authentication and rate limiting

## License

MIT