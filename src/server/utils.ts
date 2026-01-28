import { Movement, Confidence } from '@/types/movement';

/**
 * Calculate confidence score for a movement based on data quality
 *
 * Scoring:
 * - Label quality (most important): +3 points per good label
 * - Entity ID presence (strong signal): +2 points per entity ID
 * - Data source quality: +2 points for Nansen
 * - Amount confidence (large = more likely accurate): +1 point if >$10M
 *
 * Total score ranges:
 * - 10-13: high confidence
 * - 6-9: medium confidence
 * - 0-5: low confidence
 */
export function calculateConfidence(movement: Movement): Confidence {
  let score = 0;

  // Label quality (most important)
  if (movement.fromLabel && movement.fromLabel !== 'Unknown Wallet') {
    score += 3;
  }
  if (movement.toLabel && movement.toLabel !== 'Unknown Wallet') {
    score += 3;
  }

  // Entity ID presence (strong signal)
  if (movement.fromEntityId) {
    score += 2;
  }
  if (movement.toEntityId) {
    score += 2;
  }

  // Data source quality
  if (movement.dataSource === 'nansen') {
    score += 2;
  }

  // Amount confidence (large = more likely accurate)
  if (movement.amountUsd > 10_000_000) {
    score += 1;
  }

  // Determine confidence level
  if (score >= 10) return 'high';
  if (score >= 6) return 'med';
  return 'low';
}
