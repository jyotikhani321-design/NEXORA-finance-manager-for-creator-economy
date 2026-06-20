import dotenv from 'dotenv';
dotenv.config();

// Helper to communicate with Anthropic API
async function callClaude(systemPrompt, userMessage) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('ANTHROPIC_API_KEY is not set on the backend server');
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey.trim(),
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API responded with error status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// 1. Regex parsing for inbound email webhook
export function parseEmailWithRegex(bodyText) {
  // Regex search for currency (₹, $, USD, INR) followed by number (supports comma grouping)
  const regex = /(?:₹|\$|USD|INR)\s*([\d,]+(?:\.\d{2})?)/i;
  const match = bodyText.match(regex);

  if (match) {
    const amountStr = match[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    const symbolMatch = match[0].match(/₹|\$|USD|INR/i);
    const symbol = symbolMatch ? symbolMatch[0] : "INR";
    
    let currency = "INR";
    if (symbol === "$") currency = "USD";
    else if (symbol.toUpperCase() === "USD") currency = "USD";

    // Attempt keyword mapping
    let category = null;
    const lowerBody = bodyText.toLowerCase();
    if (lowerBody.includes("sponsor") || lowerBody.includes("brand") || lowerBody.includes("collab") || lowerBody.includes("deal")) {
      category = "brand_deal";
    } else if (lowerBody.includes("adsense") || lowerBody.includes("youtube") || lowerBody.includes("ad revenue")) {
      category = "adsense";
    } else if (lowerBody.includes("affiliate") || lowerBody.includes("amazon") || lowerBody.includes("link")) {
      category = "affiliate";
    } else if (lowerBody.includes("patreon") || lowerBody.includes("substack") || lowerBody.includes("subscription") || lowerBody.includes("member")) {
      category = "subscription";
    } else if (lowerBody.includes("merch") || lowerBody.includes("shop") || lowerBody.includes("t-shirt") || lowerBody.includes("hoodie")) {
      category = "merch";
    }

    // High confidence if we found both a valid amount and a matching category
    if (category && !isNaN(amount)) {
      return {
        success: true,
        data: {
          amount,
          currency,
          source: "Regex Inbound Email",
          category,
          date: new Date().toISOString().split('T')[0]
        },
        confidence: 0.9,
        needsReview: false
      };
    }
  }

  return { success: false };
}

// 2. Claude LLM parsing fallback for inbound email webhook
export async function parseEmailWithLLM(bodyText, knownCategories) {
  const systemPrompt = `You are a financial email parser. Extract structured transaction details from the email text.
You must return ONLY a valid JSON object matching this schema:
{
  "amount": number (positive),
  "currency": string (e.g. "INR", "USD"),
  "source": string (the sender platform or brand sponsor name),
  "category": string (must be one of: ${JSON.stringify(knownCategories)}),
  "date": string (YYYY-MM-DD format, or today's date if not found in email)
}
Do not write markdown block fences (like \`\`\`json), backticks, comments, or explanations. If you cannot parse it or have low certainty, set amount to 0.`;

  const userMessage = `Parse this email body:\n${bodyText}`;

  try {
    const rawResult = await callClaude(systemPrompt, userMessage);
    const cleanText = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    
    // Check constraints
    const hasValidCategory = knownCategories.includes(parsed.category);
    const hasAmount = typeof parsed.amount === 'number' && parsed.amount > 0;
    
    return {
      amount: hasAmount ? parsed.amount : 0,
      currency: parsed.currency || 'INR',
      source: parsed.source || 'Email Forward',
      category: hasValidCategory ? parsed.category : 'adsense',
      date: parsed.date || new Date().toISOString().split('T')[0],
      confidence: hasValidCategory && hasAmount ? 0.8 : 0.3,
      needsReview: !(hasValidCategory && hasAmount)
    };
  } catch (error) {
    console.error('Claude email LLM parsing error:', error);
    return {
      amount: 0,
      currency: 'INR',
      source: 'Email Webhook Parser',
      category: 'adsense',
      date: new Date().toISOString().split('T')[0],
      confidence: 0.1,
      needsReview: true
    };
  }
}

// 3. Vision-based screenshot parsing
export async function extractScreenshotOCR(base64Image, mediaType = "image/png") {
  const systemPrompt = `You are a visual OCR data extractor. Read the payment confirmation or creator platform dashboard image and extract payment data.
You must return ONLY a valid JSON object:
{
  "amount": number (positive),
  "currency": string (e.g. "INR", "USD"),
  "source": string (e.g. "YouTube Studio", "Stripe", "PayPal", "Razorpay", "Instagram"),
  "date": string (YYYY-MM-DD format),
  "category": string (must be one of: "brand_deal", "adsense", "affiliate", "subscription", "merch")
}
Do not write markdown format wrapping, backticks, or replies. If unreadable or details are incomplete, set amount to 0.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY.trim(),
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image
                }
              },
              {
                type: "text",
                text: "Extract transaction values from this invoice or earnings dashboard."
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude Vision status ${response.status}: ${err}`);
    }

    const data = await response.json();
    const rawResult = data.content[0].text;
    const cleanText = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    const isUnreadable = !parsed.amount || parsed.amount === 0 || !parsed.date;
    
    return {
      amount: parsed.amount || 0,
      currency: parsed.currency || 'INR',
      source: parsed.source || 'Screenshot Upload',
      date: parsed.date || new Date().toISOString().split('T')[0],
      category: ["brand_deal", "adsense", "affiliate", "subscription", "merch"].includes(parsed.category) ? parsed.category : 'adsense',
      needsReview: isUnreadable
    };
  } catch (error) {
    console.error('Claude Vision OCR error:', error);
    return {
      amount: 0,
      currency: 'INR',
      source: 'Unreadable Screenshot',
      date: new Date().toISOString().split('T')[0],
      category: 'adsense',
      needsReview: true
    };
  }
}

// 4. Recommendation generation with double attempt JSON retry
export async function getRecommendations(summaryData) {
  const systemPrompt = `You are a creator monetization advisor. Analyze the creator's income history, stream breakdown, and Month-over-Month changes, and give exactly 3 recommendations.
You must return ONLY a valid JSON array of exactly 3 objects. Do not wrap in markdown blocks. No backticks. No explanations.
Format:
[
  { "tag": "opportunity", "message": "Short message max 40 words", "suggestedAction": "Suggested action description" },
  { "tag": "underpriced", "message": "Short message max 40 words", "suggestedAction": "Suggested action description" },
  { "tag": "insight", "message": "Short message max 40 words", "suggestedAction": "Suggested action description" }
]
The tag must be one of: "opportunity", "underpriced", "insight".`;

  const userMessage = `Creator income summaries:
${JSON.stringify(summaryData, null, 2)}`;

  let attempt = 0;
  while (attempt < 2) {
    try {
      const activePrompt = attempt === 1 
        ? `${systemPrompt}\nCRITICAL: Your last response was invalid JSON or format. Ensure you return ONLY a raw JSON array. DO NOT use markdown code blocks, backticks, or any leading/trailing explanations.`
        : systemPrompt;

      const rawResult = await callClaude(activePrompt, userMessage);
      const cleanText = rawResult.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      if (Array.isArray(parsed) && parsed.length === 3) {
        // Validate keys
        const keysValid = parsed.every(item => 
          item.tag && ["opportunity", "underpriced", "insight"].includes(item.tag) &&
          item.message && item.suggestedAction
        );
        if (keysValid) return parsed;
      }
      throw new Error("Invalid output array constraints");
    } catch (error) {
      console.warn(`Claude recommendation extraction attempt ${attempt + 1} failed:`, error.message);
      attempt++;
    }
  }

  // Fallback if Claude fails twice
  console.log("Using fallback local recommendations.");
  return [
    {
      tag: "opportunity",
      message: "Affiliate commissions represent low percentage of earnings. Add links across top videos.",
      suggestedAction: "Embed referral links in top 5 YouTube descriptions."
    },
    {
      tag: "underpriced",
      message: "Your brand deal rates sit below average niches in the benchmark database.",
      suggestedAction: "Renegotiate baseline brand collaborations upwards by 20%."
    },
    {
      tag: "insight",
      message: "Merchandise sales dropped this month. Create content featuring products.",
      suggestedAction: "Do a merch giveaway campaign during your next community livestream."
    }
  ];
}
