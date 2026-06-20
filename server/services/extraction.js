import nlp from 'compromise';
import stringSimilarity from 'string-similarity';

// Define known stream types and their synonyms
export const SYNONYMS = {
  brand_deal: ['brand deal', 'sponsorship', 'sponsor', 'collab', 'collaboration', 'brand partnership', 'brand campaign', 'deal', 'sponsors', 'campaign'],
  adsense: ['adsense', 'youtube adsense', 'ad revenue', 'google adsense', 'youtube ad revenue', 'ad payout', 'ads', 'adsense payout'],
  affiliate: ['affiliate', 'amazon associates', 'referral income', 'commission', 'referral', 'affiliate link', 'associates commission'],
  subscription: ['subscription', 'subscriptions', 'patreon', 'substack', 'membership', 'newsletter', 'community support', 'subscriber support', 'member'],
  merch: ['merch', 'merchandise', 'creator shop', 't-shirt store', 'hoodie sales', 'store purchase', 'merch store', 'tshirt']
};

const ALLOWED_STREAMS = ["brand_deal", "adsense", "affiliate", "subscription", "merch"];

// Fuzzy category mapping using string-similarity
export function fuzzyMapCategory(unrecognizedLabel) {
  if (!unrecognizedLabel) return null;
  const target = unrecognizedLabel.toLowerCase().trim();

  // First direct check
  if (ALLOWED_STREAMS.includes(target)) {
    return target;
  }

  // Flatten all synonyms and keep track of which streamType they belong to
  const flatSynonyms = [];
  const synonymToType = {};

  for (const [streamType, list] of Object.entries(SYNONYMS)) {
    for (const syn of list) {
      flatSynonyms.push(syn);
      synonymToType[syn] = streamType;
    }
  }

  // Find best match in synonyms array
  const matches = stringSimilarity.findBestMatch(target, flatSynonyms);
  const bestMatch = matches.bestMatch;

  // If similarity is decent (threshold > 0.25), map it
  if (bestMatch.rating > 0.25) {
    return synonymToType[bestMatch.target];
  }

  return null;
}

// Helper to parse numbers like 15k, 15,000, 1.5k
function parseNumericValue(amountStr) {
  let cleaned = amountStr.replace(/,/g, '').toLowerCase().trim();
  
  if (cleaned.endsWith('k')) {
    const num = parseFloat(cleaned.substring(0, cleaned.length - 1));
    return isNaN(num) ? 0 : num * 1000;
  }
  if (cleaned.endsWith('m')) {
    const num = parseFloat(cleaned.substring(0, cleaned.length - 1));
    return isNaN(num) ? 0 : num * 1000000;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Rule-based text extraction engine (for email webhooks and OCR screenshots)
export function extractTextDataLocal(text, senderEmail = '') {
  let amount = 0;
  let currency = 'INR';
  let category = null;
  let source = 'Offline Parser';
  let confidence = 0.5;

  // 1. Sender domain matching to help find category and source
  if (senderEmail) {
    const domain = senderEmail.toLowerCase().trim();
    if (domain.endsWith('@google.com') || domain.endsWith('@youtube.com')) {
      category = 'adsense';
      source = 'Google AdSense';
      confidence += 0.2;
    } else if (domain.endsWith('@amazon.com')) {
      category = 'affiliate';
      source = 'Amazon Associates';
      confidence += 0.2;
    } else if (domain.endsWith('@patreon.com') || domain.endsWith('@substack.com')) {
      category = 'subscription';
      source = domain.includes('patreon') ? 'Patreon' : 'Substack';
      confidence += 0.2;
    } else if (domain.endsWith('@teespring.com') || domain.endsWith('@shopify.com')) {
      category = 'merch';
      source = domain.includes('teespring') ? 'Teespring' : 'Shopify';
      confidence += 0.2;
    }
  }

  // 2. Local sentence extraction using compromise NLP library
  // This helps identify payment-related lines if there are multiple figures
  const doc = nlp(text);
  const sentences = doc.sentences().json().map(s => s.text);
  
  const paymentVerbs = ['paid', 'sent', 'transferred', 'received', 'payout', 'remitted', 'earned', 'credited', 'amount'];
  let bestSentence = '';
  let highestVerbScore = -1;

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Count verb occurrences in sentence
    let score = 0;
    for (const verb of paymentVerbs) {
      if (lowerSentence.includes(verb)) {
        score++;
      }
    }
    
    // Has to contain at least some currency digit pattern or abbreviation
    const hasNumbers = /\d/.test(sentence) || /[\d]+k/i.test(sentence);
    if (hasNumbers && score > highestVerbScore) {
      highestVerbScore = score;
      bestSentence = sentence;
    }
  }

  // Target text is either the best payment sentence or fallback to the whole text
  const targetText = bestSentence || text;

  // 3. Regex patterns for currency amounts (₹, $, €, £)
  // Match currency symbol followed by optional space, digits, comma grouping, optional cents
  const currencyRegex = /([₹$€£])\s?([\d,]+(?:\.\d{1,2})?)/g;
  const currencyMatches = [...targetText.matchAll(currencyRegex)];

  if (currencyMatches.length > 0) {
    // Take the first match
    const symbol = currencyMatches[0][1];
    const amountStr = currencyMatches[0][2];
    
    amount = parseNumericValue(amountStr);
    
    if (symbol === '₹') currency = 'INR';
    else if (symbol === '$') currency = 'USD';
    else if (symbol === '€') currency = 'EUR';
    else if (symbol === '£') currency = 'GBP';

    confidence += 0.2;
  } else {
    // Fallback: Written abbreviations search like "15k" or "10,000" without currency sign
    const abbreviationRegex = /\b([\d,]+(?:\.\d{1,2})?[km])\b/gi;
    const abbrevMatches = targetText.match(abbreviationRegex);
    
    if (abbrevMatches && abbrevMatches.length > 0) {
      amount = parseNumericValue(abbrevMatches[0]);
      confidence += 0.1;
    } else {
      // Just find any plain number
      const plainNumRegex = /\b(\d[\d,]+(?:\.\d{1,2})?)\b/g;
      const plainMatches = targetText.match(plainNumRegex);
      if (plainMatches && plainMatches.length > 0) {
        amount = parseNumericValue(plainMatches[0]);
        confidence += 0.05;
      }
    }
  }

  // 4. Keyword-based category detection (if domain matching didn't yield one)
  if (!category) {
    const textLower = text.toLowerCase();
    
    // Match against our synonym list
    let bestCat = null;
    let maxKeywordScore = 0;

    for (const [streamType, keywords] of Object.entries(SYNONYMS)) {
      let score = 0;
      for (const keyword of keywords) {
        if (textLower.includes(keyword)) {
          score++;
        }
      }
      if (score > maxKeywordScore) {
        maxKeywordScore = score;
        bestCat = streamType;
      }
    }

    if (bestCat) {
      category = bestCat;
      confidence += 0.2;
      // Derive source name if possible from keywords
      if (category === 'adsense') source = 'YouTube AdSense';
      else if (category === 'affiliate') source = 'Affiliate Partner';
      else if (category === 'subscription') source = 'Patreon/Substack';
      else if (category === 'merch') source = 'Merch Sales';
      else if (category === 'brand_deal') source = 'Brand Sponsor';
    }
  }

  // Final validation and bounding
  if (!category) {
    category = 'adsense'; // fallback
    confidence -= 0.2;
  }
  if (amount <= 0) {
    confidence = 0.1;
  }

  // Normalize confidence (max 1.0, min 0.0)
  confidence = Math.min(1.0, Math.max(0.0, confidence));

  return {
    amount,
    currency,
    source,
    category,
    date: new Date().toISOString().split('T')[0],
    confidence: parseFloat(confidence.toFixed(2)),
    needsReview: confidence < 0.6
  };
}
