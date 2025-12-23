/**
 * Example 7: Real-time WebSocket
 *
 * This example demonstrates real-time price updates:
 * - WebSocketManager for low-level access
 * - RealtimeService for subscription management
 *
 * Run: npx tsx examples/07-realtime-websocket.ts
 */

import { PolymarketSDK } from '../src/index.js';
import { WebSocketManager } from '../src/clients/websocket-manager.js';
import { RealtimeService } from '../src/services/realtime-service.js';

async function main() {
  console.log('=== Real-time WebSocket Demo ===\n');

  const sdk = new PolymarketSDK();

  // 1. Get a trending market to subscribe to
  console.log('1. Getting trending market...');
  const trendingMarkets = await sdk.markets.getTrendingMarkets(1);
  if (trendingMarkets.length === 0) {
    console.log('No trending markets found');
    return;
  }

  const market = trendingMarkets[0];
  console.log(`   Market: ${market.question.slice(0, 60)}...`);
  console.log(`   Condition ID: ${market.conditionId}\n`);

  // 2. Get market details for token IDs
  console.log('2. Getting market details...');
  const unifiedMarket = await sdk.markets.getMarket(market.conditionId);
  const yesTokenId = unifiedMarket.tokens.yes.tokenId;
  const noTokenId = unifiedMarket.tokens.no.tokenId;
  console.log(`   YES Token: ${yesTokenId.slice(0, 20)}...`);
  console.log(`   NO Token: ${noTokenId.slice(0, 20)}...`);
  console.log(`   Current YES Price: ${unifiedMarket.tokens.yes.price}`);
  console.log(`   Current NO Price: ${unifiedMarket.tokens.no.price}\n`);

  if (!yesTokenId || !noTokenId) {
    console.log('No token IDs available for this market');
    return;
  }

  // 3. Create RealtimeService and subscribe
  console.log('3. Subscribing to real-time updates...');
  const wsManager = new WebSocketManager({ enableLogging: true });
  const realtime = new RealtimeService(wsManager);

  let updateCount = 0;
  const maxUpdates = 10;

  const subscription = await realtime.subscribeMarket(yesTokenId, noTokenId, {
    onPriceUpdate: (update) => {
      updateCount++;
      const side = update.assetId === yesTokenId ? 'YES' : 'NO';
      console.log(`   [${new Date().toLocaleTimeString()}] ${side} Price: ${update.price.toFixed(4)} (mid: ${update.midpoint.toFixed(4)}, spread: ${update.spread.toFixed(4)})`);
    },
    onBookUpdate: (update) => {
      const side = update.assetId === yesTokenId ? 'YES' : 'NO';
      const bestBid = update.bids[0];
      const bestAsk = update.asks[0];
      console.log(`   [${new Date().toLocaleTimeString()}] ${side} Book: Bid ${bestBid?.price.toFixed(4)} (${bestBid?.size.toFixed(0)}) | Ask ${bestAsk?.price.toFixed(4)} (${bestAsk?.size.toFixed(0)})`);
    },
    onLastTrade: (trade) => {
      const side = trade.assetId === yesTokenId ? 'YES' : 'NO';
      console.log(`   [${new Date().toLocaleTimeString()}] ${side} Trade: ${trade.side} ${trade.size} @ ${trade.price.toFixed(4)}`);
    },
    onPairUpdate: (update) => {
      const spread = update.spread;
      const arbSignal = spread < 0.99 ? '🔴 ARB!' : spread > 1.01 ? '🔴 ARB!' : '✅';
      console.log(`   [${new Date().toLocaleTimeString()}] PAIR: YES ${update.yes.price.toFixed(4)} + NO ${update.no.price.toFixed(4)} = ${spread.toFixed(4)} ${arbSignal}`);
    },
    onError: (error) => {
      console.error(`   Error: ${error.message}`);
    },
  });

  console.log(`   Subscription ID: ${subscription.id}`);
  console.log(`   Subscribed to: ${subscription.assetIds.length} assets`);
  console.log(`\n   Waiting for updates (max ${maxUpdates})...\n`);

  // 4. Wait for some updates
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (updateCount >= maxUpdates) {
        clearInterval(interval);
        resolve();
      }
    }, 500);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, 30000);
  });

  // 5. Check cached prices
  console.log('\n4. Cached prices:');
  const prices = realtime.getAllPrices();
  for (const [assetId, price] of prices) {
    const side = assetId === yesTokenId ? 'YES' : 'NO';
    console.log(`   ${side}: ${price.price.toFixed(4)}`);
  }

  // 6. Cleanup
  console.log('\n5. Cleaning up...');
  await subscription.unsubscribe();
  console.log('   Unsubscribed');

  console.log('\n=== Done ===');
}

main().catch(console.error);
