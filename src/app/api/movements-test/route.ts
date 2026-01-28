import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/server/nansen/client';
import { normalizeTransfer } from '@/server/nansen/normalizers';
import { EntityEnricher } from '@/server/enrichers/entity-enricher';
import { enrichTags } from '@/server/enrichers/tag-enricher';
import { calculateConfidence } from '@/server/utils';
import { Movement } from '@/types/movement';

export async function GET(request: NextRequest) {
  const logs: string[] = [];

  try {
    logs.push('Step 1: Get Nansen client');
    const client = getNansenClient();

    logs.push('Step 2: Fetch transfers for ethereum');
    const transfers = await client.getTransfers({
      chains: ['ethereum'],
      minUsd: 5000000,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    logs.push(`  Got ${transfers.length} transfers`);

    if (transfers.length === 0) {
      return NextResponse.json({
        success: false,
        logs,
        message: 'No transfers returned from Nansen',
      });
    }

    logs.push('Step 3: Normalize first transfer');
    const firstTransfer = transfers[0];
    logs.push(`  Transfer: ${firstTransfer.transaction_hash}`);
    logs.push(`  Token symbol: ${firstTransfer.token_symbol || 'MISSING'}`);
    logs.push(`  Token address: ${firstTransfer.token_address || 'MISSING'}`);

    const normalized = normalizeTransfer(firstTransfer, 'ethereum');
    logs.push(`  Normalized ID: ${normalized.id}`);
    logs.push(`  Asset symbol: ${normalized.assetSymbol}`);

    logs.push('Step 4: Enrich entity');
    const entityEnricher = new EntityEnricher();
    const enriched = entityEnricher.enrichMovement(normalized);
    logs.push(`  From entity: ${enriched.fromEntityId || 'none'}`);
    logs.push(`  To entity: ${enriched.toEntityId || 'none'}`);

    logs.push('Step 5: Enrich tags');
    const tagged = enrichTags(enriched);
    logs.push(`  Tags: ${tagged.tags.join(', ')}`);

    logs.push('Step 6: Calculate confidence');
    const final = { ...tagged, confidence: calculateConfidence(tagged) };
    logs.push(`  Confidence: ${final.confidence}`);

    return NextResponse.json({
      success: true,
      logs,
      sampleMovement: final,
    });

  } catch (error) {
    logs.push(`ERROR at current step: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      logs.push(`Stack trace: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }

    return NextResponse.json({
      success: false,
      logs,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 10),
      } : String(error),
    }, { status: 500 });
  }
}
