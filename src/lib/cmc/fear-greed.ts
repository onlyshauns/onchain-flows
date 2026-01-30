/**
 * CoinMarketCap Fear & Greed Index
 * Free API endpoint - no key required for basic historical data
 */

export interface FearGreedReading {
  value: number; // 0-100
  classification: string; // "Extreme Fear", "Fear", "Neutral", "Greed", "Extreme Greed"
  timestamp: string;
}

/**
 * Fetch the latest Fear & Greed Index from CoinMarketCap
 * Using the free endpoint via proxy to avoid CORS
 */
export async function fetchCMCFearGreedIndex(): Promise<FearGreedReading | null> {
  try {
    // Alternative: Use the public API from alternative.me which tracks crypto fear/greed
    // This is more reliable and doesn't require CMC API key
    const response = await fetch('https://api.alternative.me/fng/?limit=1', {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Fear & Greed API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('No fear & greed data available');
    }

    const latest = data.data[0];

    return {
      value: parseInt(latest.value),
      classification: latest.value_classification,
      timestamp: new Date(parseInt(latest.timestamp) * 1000).toISOString(),
    };
  } catch (error) {
    console.error('[Fear & Greed] Failed to fetch index:', error);
    return null;
  }
}

/**
 * Get sentiment level from score
 */
export function getSentimentLevel(score: number): {
  level: string;
  emoji: string;
  color: string;
} {
  if (score >= 80) {
    return { level: 'Extreme Greed', emoji: '🔥', color: '#10b981' };
  } else if (score >= 60) {
    return { level: 'Greed', emoji: '😊', color: '#22c55e' };
  } else if (score >= 40) {
    return { level: 'Neutral', emoji: '😐', color: '#6b7280' };
  } else if (score >= 20) {
    return { level: 'Fear', emoji: '😰', color: '#f97316' };
  } else {
    return { level: 'Extreme Fear', emoji: '😱', color: '#ef4444' };
  }
}
