import { NextRequest, NextResponse } from 'next/server';
import { getNansenClient } from '@/server/nansen/client';
import { normalizeTransfer } from '@/server/nansen/normalizers';
import { EntityEnricher } from '@/server/enrichers/entity-enricher';
import { Deduplicator } from '@/server/deduplicator';

export async function GET(request: NextRequest) {
  try {
    const client = getNansenClient();
    const entityEnricher = new EntityEnricher();
    const deduplicator = new Deduplicator();

    // Fetch transfers
    const transfers = await client.getTransfers({
      chains: ['ethereum'],
      minUsd: 5000000,
      since: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    // Normalize and enrich
    const movements = transfers.map(t => {
      const normalized = normalizeTransfer(t, 'ethereum');
      return entityEnricher.enrichMovement(normalized);
    });

    // Analyze entity pairs
    const entityPairs = movements.map(m => ({
      from: m.fromLabel,
      to: m.toLabel,
      fromEntity: m.fromEntityId,
      toEntity: m.toEntityId,
      sameEntity: m.fromEntityId === m.toEntityId,
    }));

    const sameEntityCount = entityPairs.filter(p => p.sameEntity).length;
    const crossEntityCount = entityPairs.filter(p => !p.sameEntity).length;

    // Test deduplication
    const deduplicated = deduplicator.deduplicate(movements);

    return NextResponse.json({
      totalTransfers: transfers.length,
      sameEntityTransfers: sameEntityCount,
      crossEntityTransfers: crossEntityCount,
      afterDeduplication: deduplicated.length,
      samplePairs: entityPairs.slice(0, 10),
      deduplicated: deduplicated.slice(0, 5).map(m => ({
        from: m.fromLabel,
        to: m.toLabel,
        amountUsd: m.amountUsd,
      })),
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
