// Deterministic recommendation rules engine (100% offline, zero external API dependencies)

// Utility to format stream names for user messages
function formatStreamName(streamType) {
  switch (streamType) {
    case 'brand_deal': return 'Brand Deal';
    case 'adsense': return 'AdSense';
    case 'affiliate': return 'Affiliate';
    case 'subscription': return 'Subscription';
    case 'merch': return 'Merch';
    default: return streamType;
  }
}

/**
 * Computes recommendations based on a creator's historical monthly income streams.
 * 
 * @param {Object} monthsData - Grouped monthly totals: { "YYYY-MM": { totals: { adsense: 0, ... }, totalOverall: 0 } }
 * @param {Array<string>} sortedMonths - Chronologically sorted array of month strings (e.g. ["2026-04", "2026-05", "2026-06"])
 * @returns {Array<Object>} List of up to 3 recommendations sorted by priority.
 */
export function generateRulesRecommendations(monthsData, sortedMonths) {
  if (!sortedMonths || sortedMonths.length === 0) {
    return [];
  }

  const latestMonth = sortedMonths[sortedMonths.length - 1];
  const previousMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;

  const currentTotals = monthsData[latestMonth].totals;
  const currentOverall = monthsData[latestMonth].totalOverall;

  const triggeredRecs = [];

  // If there's no revenue, return empty list
  if (currentOverall === 0) {
    return [];
  }

  // =========================================================================
  // RULE 1: Concentration Risk Rule (Priority 4)
  // Concentration risk: if any single stream exceeds 60% of total monthly income.
  // =========================================================================
  for (const [stream, amount] of Object.entries(currentTotals)) {
    const ratio = amount / currentOverall;
    if (ratio > 0.60) {
      const percentage = Math.round(ratio * 100);
      triggeredRecs.push({
        tag: "warning",
        title: "High Concentration Risk",
        message: `${percentage}% of your income depends on a single stream (${formatStreamName(stream)}). This is a stability risk.`,
        suggestedAction: "Diversify into at least one additional income stream.",
        impact: Math.round(currentOverall * 0.15),
        priority: 4
      });
    }
  }

  // =========================================================================
  // RULE 2: Month-over-Month Decline Rule (Priority 3)
  // MoM decline: if any stream's amount dropped more than 20% compared to previous month.
  // =========================================================================
  if (previousMonth) {
    const previousTotals = monthsData[previousMonth].totals;
    for (const [stream, currentAmount] of Object.entries(currentTotals)) {
      const previousAmount = previousTotals[stream] || 0;
      if (previousAmount > 0) {
        const declinePercent = ((previousAmount - currentAmount) / previousAmount) * 100;
        if (declinePercent > 20) {
          triggeredRecs.push({
            tag: "warning",
            title: `${formatStreamName(stream)} Revenue Drop`,
            message: `Your ${formatStreamName(stream)} income dropped ${Math.round(declinePercent)}% this month.`,
            suggestedAction: "Review recent activity in this stream.",
            impact: Math.round((previousAmount - currentAmount) * 0.25),
            priority: 3
          });
        }
      }
    }
  }

  // =========================================================================
  // RULE 3: Underutilized Stream Rule (Priority 2)
  // Underutilized stream: if affiliate income exists but share is below 10%, 
  // while at least 2 other streams exceed 20% of total monthly income.
  // =========================================================================
  const affiliateAmount = currentTotals.affiliate || 0;
  if (affiliateAmount > 0) {
    const affiliateShare = affiliateAmount / currentOverall;
    if (affiliateShare < 0.10) {
      // Check other streams that exceed 20%
      let otherStreamsExceed20 = 0;
      for (const [stream, amount] of Object.entries(currentTotals)) {
        if (stream !== 'affiliate') {
          const share = amount / currentOverall;
          if (share > 0.20) {
            otherStreamsExceed20++;
          }
        }
      }

      if (otherStreamsExceed20 >= 2) {
        triggeredRecs.push({
          tag: "opportunity",
          title: "Optimize Affiliate Placements",
          message: "Your affiliate income is underutilized — diversifying here could add meaningful revenue.",
          suggestedAction: "Add more affiliate links to recent high-engagement content.",
          impact: Math.round(currentOverall * 0.10),
          priority: 2
        });
      }
    }
  }

  // =========================================================================
  // RULE 4: Growth Momentum Rule (Priority 1)
  // Growth momentum: if a stream grew more than 25% over the last 2 months consecutively.
  // Requires at least 3 consecutive months: Month A -> Month B -> Month C
  // =========================================================================
  if (sortedMonths.length >= 3) {
    const m1 = sortedMonths[sortedMonths.length - 3];
    const m2 = sortedMonths[sortedMonths.length - 2];
    const m3 = sortedMonths[sortedMonths.length - 1];

    const totals1 = monthsData[m1].totals;
    const totals2 = monthsData[m2].totals;
    const totals3 = monthsData[m3].totals;

    for (const stream of Object.keys(currentTotals)) {
      const v1 = totals1[stream] || 0;
      const v2 = totals2[stream] || 0;
      const v3 = totals3[stream] || 0;

      if (v1 > 0 && v2 > 0 && v3 > 0) {
        const growth1 = (v2 - v1) / v1;
        const growth2 = (v3 - v2) / v2;

        if (growth1 > 0.25 && growth2 > 0.25) {
          triggeredRecs.push({
            tag: "insight",
            title: `${formatStreamName(stream)} Growth Momentum`,
            message: `Your ${formatStreamName(stream)} income is growing consistently — consider doubling down here.`,
            suggestedAction: "Increase focus/output on this stream.",
            impact: Math.round(currentTotals[stream] * 0.20),
            priority: 1
          });
        }
      }
    }
  }

  // =========================================================================
  // PRIORITY SORT & DEDUPLICATION
  // Sort by priority DESC: Concentration (4) > Decline (3) > Opportunity (2) > Growth (1)
  // =========================================================================
  triggeredRecs.sort((a, b) => b.priority - a.priority);

  // Take up to 3 highest priority items, and map to clean client object
  return triggeredRecs.slice(0, 3).map(item => ({
    tag: item.tag,
    title: item.title,
    message: item.message,
    suggestedAction: item.suggestedAction,
    impact: item.impact || 0
  }));
}
