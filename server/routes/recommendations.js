import express from 'express';
import { 
  getIncomeByCreator, 
  ALLOWED_STREAMS,
  getUserById,
  getCreatorProfile
} from '../services/db.js';
import { generateRulesRecommendations } from '../services/recommendationRules.js';

const router = express.Router();

// GET /api/recommendations/:creatorId
router.get('/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    
    // Retrieve the user/creator's niche configuration
    let niche = 'Tech';
    try {
      const user = await getUserById(creatorId);
      if (user && user.niche) {
        niche = user.niche;
      } else {
        const profile = await getCreatorProfile(creatorId);
        if (profile && profile.niche) {
          niche = profile.niche;
        }
      }
    } catch (dbErr) {
      console.warn(`Could not load niche for creatorId ${creatorId}, using default 'Tech':`, dbErr.message);
    }

    const records = await getIncomeByCreator(creatorId);

    if (!records || records.length === 0) {
      const emptyRecs = generateRulesRecommendations({}, [], niche);
      return res.json({
        summary: {
          creatorId,
          currentMonth: new Date().toISOString().split('T')[0].substring(0, 7),
          previousMonth: 'None',
          totalIncome: 0,
          overallMomChange: 'N/A',
          streamBreakdown: {}
        },
        recommendations: emptyRecs
      });
    }

    // 1. Group records by month and stream type
    const monthsData = {};
    for (const r of records) {
      if (!monthsData[r.month]) {
        monthsData[r.month] = {
          totals: {
            brand_deal: 0,
            adsense: 0,
            affiliate: 0,
            subscription: 0,
            merch: 0
          },
          totalOverall: 0
        };
      }
      if (monthsData[r.month].totals[r.streamType] !== undefined) {
        monthsData[r.month].totals[r.streamType] += r.amount;
        monthsData[r.month].totalOverall += r.amount;
      }
    }

    // Sort months chronologically
    const sortedMonths = Object.keys(monthsData).sort();

    // 2. Run deterministic offline recommendation rules engine
    const recommendations = generateRulesRecommendations(monthsData, sortedMonths, niche);

    // Compute basic summary breakdown for current month (legacy display format support)
    const latestMonth = sortedMonths[sortedMonths.length - 1];
    const latestOverall = monthsData[latestMonth].totalOverall;
    const previousMonth = sortedMonths.length > 1 ? sortedMonths[sortedMonths.length - 2] : null;

    const streamBreakdown = {};
    for (const s of ['brand_deal', 'adsense', 'affiliate', 'subscription', 'merch']) {
      const curAmount = monthsData[latestMonth].totals[s] || 0;
      const pct = latestOverall > 0 ? (curAmount / latestOverall) * 100 : 0;
      
      let momPercent = 'N/A';
      if (previousMonth) {
        const prevAmount = monthsData[previousMonth].totals[s] || 0;
        if (prevAmount > 0) {
          const diff = curAmount - prevAmount;
          momPercent = `${((diff / prevAmount) * 100).toFixed(1)}%`;
        } else if (curAmount > 0) {
          momPercent = '+100.0% (New stream)';
        }
      }

      streamBreakdown[s] = {
        amount: curAmount,
        percentage: `${pct.toFixed(1)}%`,
        momChange: momPercent
      };
    }

    let overallMomChange = 'N/A';
    if (previousMonth) {
      const prevOverall = monthsData[previousMonth].totalOverall;
      if (prevOverall > 0) {
        const diff = latestOverall - prevOverall;
        overallMomChange = `${((diff / prevOverall) * 100).toFixed(1)}%`;
      }
    }

    res.json({
      summary: {
        creatorId,
        currentMonth: latestMonth,
        previousMonth: previousMonth || 'None',
        totalIncome: latestOverall,
        overallMomChange,
        streamBreakdown
      },
      recommendations
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to query offline recommendations: ' + error.message });
  }
});

export default router;
