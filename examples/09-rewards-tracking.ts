/**
 * Example 09: Market Maker Rewards Tracking
 *
 * Demonstrates how to:
 * - Find high-reward markets
 * - Check if orders are scoring
 * - Track daily earnings
 * - Optimize for maximum rewards
 *
 * NOTE: Requires a wallet with trading history to see earnings.
 */

import {
  TradingClient,
  RateLimiter,
  PolymarketSDK,
  formatUSDC,
} from '../src/index.js';

// Test wallet private key
const PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY || '0xYOUR_PRIVATE_KEY_HERE';

async function main() {
  console.log('=== Polymarket Rewards Tracking ===\n');

  const sdk = new PolymarketSDK();
  const rateLimiter = new RateLimiter();
  const tradingClient = new TradingClient(rateLimiter, {
    privateKey: PRIVATE_KEY,
  });

  // ===== 1. Get Markets with Active Rewards =====
  console.log('1. Finding markets with active rewards...\n');

  try {
    await tradingClient.initialize();
    console.log(`   Wallet: ${tradingClient.getAddress()}\n`);

    const rewards = await tradingClient.getCurrentRewards();
    console.log(`   Found ${rewards.length} markets with active rewards\n`);

    if (rewards.length > 0) {
      console.log('   Top 5 reward markets:');
      console.log('   ' + '─'.repeat(70));

      for (const reward of rewards.slice(0, 5)) {
        console.log(`\n   Market: ${reward.question?.slice(0, 50)}...`);
        console.log(`   Slug: ${reward.marketSlug}`);
        console.log(`   Max Spread: ${reward.rewardsMaxSpread}`);
        console.log(`   Min Size: ${reward.rewardsMinSize}`);

        if (reward.rewardsConfig.length > 0) {
          const config = reward.rewardsConfig[0];
          console.log(`   Daily Rate: ${config.ratePerDay}`);
          console.log(`   Total Pool: ${config.totalRewards}`);
          console.log(`   Period: ${config.startDate} to ${config.endDate}`);
        }

        // Show token prices
        if (reward.tokens.length > 0) {
          const yesToken = reward.tokens.find(t => t.outcome === 'Yes');
          const noToken = reward.tokens.find(t => t.outcome === 'No');
          if (yesToken && noToken) {
            console.log(`   YES Price: $${yesToken.price.toFixed(2)} | NO Price: $${noToken.price.toFixed(2)}`);
          }
        }
      }
      console.log('\n   ' + '─'.repeat(70));
    }

    // ===== 2. Check Order Scoring Status =====
    console.log('\n2. Checking if orders are scoring...\n');

    const openOrders = await tradingClient.getOpenOrders();
    console.log(`   Open orders: ${openOrders.length}`);

    if (openOrders.length > 0) {
      console.log('\n   Order scoring status:');

      // Check first 5 orders
      for (const order of openOrders.slice(0, 5)) {
        const isScoring = await tradingClient.isOrderScoring(order.id);
        const status = isScoring ? '✅ SCORING' : '❌ NOT SCORING';
        console.log(`   - ${order.side} ${order.originalSize} @ $${order.price.toFixed(4)}: ${status}`);
      }

      // Batch check
      if (openOrders.length > 1) {
        const orderIds = openOrders.slice(0, 5).map(o => o.id);
        const scoringStatus = await tradingClient.areOrdersScoring(orderIds);
        const scoringCount = Object.values(scoringStatus).filter(Boolean).length;
        console.log(`\n   Summary: ${scoringCount}/${orderIds.length} orders are scoring`);
      }
    } else {
      console.log('   No open orders. Place limit orders to earn rewards.');
    }

    // ===== 3. Track Earnings =====
    console.log('\n3. Tracking earnings...\n');

    // Get last 7 days of earnings
    const dates: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log('   Daily earnings (last 7 days):');
    console.log('   ' + '─'.repeat(40));

    let totalWeeklyEarnings = 0;

    for (const date of dates) {
      try {
        const earnings = await tradingClient.getTotalEarningsForDay(date);
        totalWeeklyEarnings += earnings.totalEarnings;

        if (earnings.totalEarnings > 0) {
          console.log(`   ${date}: ${formatUSDC(earnings.totalEarnings)}`);
        } else {
          console.log(`   ${date}: $0.00`);
        }
      } catch {
        console.log(`   ${date}: (no data)`);
      }
    }

    console.log('   ' + '─'.repeat(40));
    console.log(`   Weekly Total: ${formatUSDC(totalWeeklyEarnings)}`);

    // ===== 4. Get Reward Percentages =====
    console.log('\n4. Market reward percentages...\n');

    try {
      const percentages = await tradingClient.getRewardPercentages();
      const entries = Object.entries(percentages);

      if (entries.length > 0) {
        console.log('   Top markets by reward percentage:');

        // Sort by percentage (descending)
        const sorted = entries.sort((a, b) => b[1] - a[1]).slice(0, 10);

        for (const [market, percentage] of sorted) {
          console.log(`   - ${market.slice(0, 30)}...: ${(percentage * 100).toFixed(2)}%`);
        }
      } else {
        console.log('   No reward percentages available');
      }
    } catch (error) {
      console.log('   Reward percentages not available');
    }

    // ===== 5. Check Balance =====
    console.log('\n5. Account balance...\n');

    try {
      const balance = await tradingClient.getBalanceAllowance('COLLATERAL');
      console.log(`   USDC Balance: ${balance.balance}`);
      console.log(`   USDC Allowance: ${balance.allowance}`);
    } catch {
      console.log('   Balance check not available');
    }

    // ===== 6. Reward Optimization Tips =====
    console.log('\n6. Reward Optimization Tips\n');
    console.log('   ┌─────────────────────────────────────────────────────────────┐');
    console.log('   │ How to maximize market making rewards:                       │');
    console.log('   ├─────────────────────────────────────────────────────────────┤');
    console.log('   │ 1. Keep orders within max_spread of the midpoint            │');
    console.log('   │ 2. Maintain minimum size (check rewardsMinSize)             │');
    console.log('   │ 3. Quote both sides (YES and NO) for higher score           │');
    console.log('   │ 4. Stay active throughout the day (rewards sample minutely) │');
    console.log('   │ 5. Focus on markets with higher daily rates                 │');
    console.log('   │ 6. Avoid wide spreads - tighter = higher score              │');
    console.log('   └─────────────────────────────────────────────────────────────┘');

  } catch (error) {
    console.log(`   Initialization failed: ${error}`);
    console.log('   Set POLYMARKET_PRIVATE_KEY to access rewards data');
  }

  console.log('\n=== Example Complete ===');
}

main().catch(console.error);
