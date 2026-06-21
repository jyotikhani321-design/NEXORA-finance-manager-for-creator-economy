import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  TrendingUp, 
  Award, 
  Clock, 
  DollarSign, 
  Sparkles, 
  Activity, 
  X, 
  FileText, 
  TrendingDown, 
  AlertTriangle, 
  AlertCircle, 
  Lightbulb, 
  Briefcase, 
  ShieldCheck, 
  HelpCircle,
  Settings,
  ChevronRight,
  User,
  Info,
  Maximize2
} from 'lucide-react';

// Niche monthly average benchmarks (in ₹)
const BENCHMARKS = {
  Tech: 250000,
  Finance: 300000,
  Lifestyle: 180000,
  Gaming: 150000,
  Fashion: 200000,
  Food: 120000,
  Education: 220000
};

// Platform options for the dropdown
const PLATFORMS = [
  'YouTube AdSense',
  'Instagram Brand Deal',
  'Amazon Affiliate',
  'Substack',
  'Patreon',
  'Razorpay',
  'Manual Entry'
];

// Sample data for Priya Sharma demo
const SAMPLE_DATA = {
  name: "Priya Sharma",
  niche: "Tech",
  streams: [
    { id: '1', platform: 'YouTube AdSense', earnings: 33000, hours: 20 },
    { id: '2', platform: 'Instagram Brand Deal', earnings: 114000, hours: 15 },
    { id: '3', platform: 'Amazon Affiliate', earnings: 18500, hours: 3 },
    { id: '4', platform: 'Substack', earnings: 14000, hours: 5 },
    { id: '5', platform: 'Razorpay', earnings: 5000, hours: 2 }
  ]
};

// Claude API System Prompt
const SYSTEM_PROMPT = `You are NEXORA — an AI financial advisor built exclusively for Indian content creators.

Analyze the creator's income data and return ONLY a valid JSON array of exactly 3 objects. No other text. No markdown. No backticks. No explanation. Just the raw JSON array.

Each object must have exactly these fields:
- tag: one of "Opportunity", "Underpriced", "Insight", "Warning"
- title: max 8 words, specific and punchy
- message: 2-3 sentences referencing their actual numbers and platform names
- impact: number only (monthly ₹ impact if they act on this)

Rules for recommendations:
1. If brand deals > 60% of income → Warning about instability
2. If affiliate income < 20% of total → Opportunity to add more affiliate links
3. If recurring income < 15% of total → Insight about subscription tier
4. If total income < niche benchmark → Underpriced alert with specific gap amount
5. If any stream has ₹/hour < 500 → Warning about time efficiency
6. Always be specific — use their actual platform names and rupee amounts
7. Impact must be realistic and conservative

Niche monthly benchmarks:
Tech: 250000 | Finance: 300000
Lifestyle: 180000 | Gaming: 150000
Fashion: 200000 | Food: 120000
Education: 220000`;

// Local recommendations generator in case API fails or has no key
const generateLocalRecommendations = (name, niche, streams, totalEarnings, topStream, recurringIncome, brandDealIncome, affiliateIncome, nicheBenchmark) => {
  const recommendations = [];
  const brandDealPct = totalEarnings > 0 ? (brandDealIncome / totalEarnings) * 100 : 0;
  const affiliatePct = totalEarnings > 0 ? (affiliateIncome / totalEarnings) * 100 : 0;
  const recurringPct = totalEarnings > 0 ? (recurringIncome / totalEarnings) * 100 : 0;
  
  // 1. Brand deals > 60%
  if (brandDealPct > 60) {
    recommendations.push({
      tag: "Warning",
      title: "Elevated Brand Deal Reliance",
      message: `Brand collaborations account for ${brandDealPct.toFixed(1)}% of your income (₹${brandDealIncome.toLocaleString('en-IN')}). We advise establishing subscription models to hedge against brand budget volatility.`,
      impact: Math.round(brandDealIncome * 0.15)
    });
  }

  // 2. Affiliate < 20%
  if (affiliatePct < 20) {
    recommendations.push({
      tag: "Opportunity",
      title: "Optimize Affiliate Placements",
      message: `Affiliate payouts contribute only ${affiliatePct.toFixed(1)}% of total earnings. Structuring resource links across your high-traffic content channels could provide stable passive cash flow.`,
      impact: Math.round(totalEarnings * 0.10)
    });
  }

  // 3. Recurring < 15%
  if (recurringPct < 15) {
    recommendations.push({
      tag: "Insight",
      title: "Scale Subscription Products",
      message: `Your stable recurring earnings represent only ${recurringPct.toFixed(1)}% (₹${recurringIncome.toLocaleString('en-IN')}). Launching a premium newsletter tier or private community baseline will secure your monthly floor.`,
      impact: Math.round(totalEarnings * 0.12)
    });
  }

  // 4. Earning below benchmark
  if (totalEarnings < nicheBenchmark) {
    const gap = nicheBenchmark - totalEarnings;
    recommendations.push({
      tag: "Underpriced",
      title: "Base Revenue Under Category Benchmark",
      message: `Your monthly revenue of ₹${totalEarnings.toLocaleString('en-IN')} sits ₹${gap.toLocaleString('en-IN')} below the ₹${nicheBenchmark.toLocaleString('en-IN')} benchmark for ${niche} creators in India. Adjust baseline sponsor pricing.`,
      impact: gap
    });
  }

  // 5. Stream rate < 500
  const lowEff = streams.find(s => s.hours > 0 && (s.earnings / s.hours) < 500);
  if (lowEff) {
    const hourly = Math.round(lowEff.earnings / lowEff.hours);
    recommendations.push({
      tag: "Warning",
      title: "Undervalued Payout to Hour Efficiency",
      message: `Your ${lowEff.platform} stream generates ₹${hourly}/hour. Negotiate higher minimums for these deliverables or relocate these hours to higher-yielding streams.`,
      impact: Math.round(lowEff.earnings * 0.25)
    });
  }

  // Add unique fallbacks to fill remaining slots up to 3 recommendations
  const hasRecWithTitle = (title) => recommendations.some(r => r.title.toLowerCase().includes(title.toLowerCase()));

  const fallbacks = [
    {
      tag: "Opportunity",
      title: "Launch Premium Newsletter",
      message: `Establish a weekly recurring Substack or Patreon newsletter for your ${niche} audience. Onboarding even 100 dedicated members at ₹199/month builds a secure monthly cash floor.`,
      suggestedAction: "Define subscription benefits and draft your first community post.",
      impact: 19900
    },
    {
      tag: "Opportunity",
      title: "Build Merchandising Funnels",
      message: `Develop print-on-demand merchandise or custom digital templates/guides tailored to ${niche} enthusiasts. This builds asset equity outside sponsorship deals.`,
      suggestedAction: "Sketch out 3 niche-relevant designs or guidebook outlines.",
      impact: 12000
    },
    {
      tag: "Insight",
      title: "Diversify Affiliate Placements",
      message: `Optimize affiliate placements underneath your highest traffic content assets to convert historical views into passive streams.`,
      suggestedAction: "Apply for 3 niche-relevant affiliate programs and update video descriptions.",
      impact: 8000
    }
  ];

  for (const fb of fallbacks) {
    if (recommendations.length >= 3) break;
    if (!hasRecWithTitle(fb.title)) {
      recommendations.push(fb);
    }
  }

  return recommendations.slice(0, 3);
};

export default function App() {
  // User auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('nexora_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Screens state: 'landing' | 'input' | 'dashboard' | 'login' | 'signup'
  const [screen, setScreen] = useState('landing');
  
  // User input states
  const [creatorName, setCreatorName] = useState('');
  const [niche, setNiche] = useState('Tech');
  const [incomeStreams, setIncomeStreams] = useState([
    { id: '1', platform: '', earnings: '', hours: '' },
    { id: '2', platform: '', earnings: '', hours: '' },
    { id: '3', platform: '', earnings: '', hours: '' }
  ]);

  // Auth form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupNiche, setSignupNiche] = useState('Tech');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  const mapDropdownToBackend = (platformName) => {
    switch (platformName) {
      case 'YouTube AdSense': return 'adsense';
      case 'Instagram Brand Deal': return 'brand_deal';
      case 'Amazon Affiliate': return 'affiliate';
      case 'Substack': return 'subscription';
      case 'Patreon': return 'subscription';
      case 'Razorpay': return 'merch';
      default: return 'merch';
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter both email and password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('nexora_user', JSON.stringify(data.user));
        setUser(data.user);
        setScreen('dashboard');
        // Reset form
        setLoginEmail('');
        setLoginPassword('');
      } else {
        const errData = await response.json();
        setLoginError(errData.error || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      setLoginError('Connection error to auth server.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !signupName || !signupNiche) {
      setSignupError('Please fill in all fields.');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError('Password must be at least 6 characters long.');
      return;
    }
    setSignupLoading(true);
    setSignupError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          displayName: signupName,
          niche: signupNiche
        })
      });
      if (response.ok) {
        alert('Registration successful! Please log in.');
        setScreen('login');
        // Reset form
        setSignupEmail('');
        setSignupPassword('');
        setSignupName('');
      } else {
        const errData = await response.json();
        setSignupError(errData.error || 'Signup failed.');
      }
    } catch (err) {
      console.error(err);
      setSignupError('Connection error to auth server.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nexora_user');
    setUser(null);
    setScreen('landing');
  };

  // Optional API key states
  const [apiKey, setApiKey] = useState('');
  const [showApiKeySetting, setShowApiKeySetting] = useState(false);

  // Recommendations and metrics loading state
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Modal control: 'rateCard' | 'diversification' | 'tax' | null
  const [activeModal, setActiveModal] = useState(null);

  // Hackathon Import State Variables
  const [csvFile, setCsvFile] = useState(null);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [emailText, setEmailText] = useState('');
  const [emailSender, setEmailSender] = useState('sponsor@brand.com');
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Helper to map DB stream types to UI dropdown options
  const mapBackendToDropdown = (type) => {
    switch (type) {
      case 'brand_deal': return 'Instagram Brand Deal';
      case 'adsense': return 'YouTube AdSense';
      case 'affiliate': return 'Amazon Affiliate';
      case 'subscription': return 'Patreon';
      case 'merch': return 'Manual Entry';
      default: return 'Manual Entry';
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      alert("Please choose a CSV file first.");
      return;
    }
    setIsImporting(true);
    setImportSummary(null);
        const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('creatorId', user?.id || 'creator_1');

    try {
      const response = await fetch('http://localhost:5000/api/income/csv-upload', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        setImportSummary(data.summary);
        alert(`CSV Import successful! Ingested ${data.summary.rowsProcessed} records. Please click "Analyze My Income" to see the updated advisor recommendations and stability score!`);
      } else {
        const errorData = await response.json();
        alert(`CSV Import failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('CSV Import connection error.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleScreenshotUpload = async () => {
    if (!screenshotFile) {
      alert("Please choose an image screenshot file first.");
      return;
    }
    setIsImporting(true);
        const formData = new FormData();
    formData.append('image', screenshotFile);
    formData.append('creatorId', user?.id || 'creator_1');

    try {
      const response = await fetch('http://localhost:5000/api/income/screenshot', {
        method: 'POST',
        body: formData
      });
      if (response.ok) {
        const data = await response.json();
        if (data.needsReview) {
          alert(`OCR flagged for Review! Image text was unclear, record created with ₹0 (needs manual review). Please click "Analyze My Income" to update the dashboard.`);
        } else {
          alert(`Local OCR complete! Extracted ₹${data.amount} for category: ${data.streamType}. Please click "Analyze My Income" to update the dashboard.`);
        }
      } else {
        const errorData = await response.json();
        alert(`Screenshot upload failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('OCR connection error.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleEmailWebhookSim = async () => {
    if (!emailText.trim()) {
      alert("Please enter some email content first.");
      return;
    }
    setIsImporting(true);

    try {
      const response = await fetch('http://localhost:5000/api/income/email-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailSender,
          subject: 'Payment Confirmation Detail',
          bodyText: emailText,
          creatorId: user?.id || 'creator_1'
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.needsReview) {
          alert(`Webhook parsed (needs review): Extracted amount: ${data.amount} (confidence: ${data.confidence}). Please click "Analyze My Income" to update the dashboard.`);
        } else {
          alert(`Webhook parsed with high confidence! Ingested amount: ${data.amount} (category: ${data.streamType}). Please click "Analyze My Income" to update the dashboard.`);
        }
        setEmailText('');
      } else {
        const errorData = await response.json();
        alert(`Email Ingestion failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error(err);
      alert('Email Sim connection error.');
    } finally {
      setIsImporting(false);
    }
  };

  // Cycle through loading messages while AI is working
  const loadingMessages = [
    "Analyzing your income streams...",
    `Comparing with ${niche} creators...`,
    "Identifying revenue gaps...",
    "Generating your nudges..."
  ];

  useEffect(() => {
    let interval;
    if (isLoadingAI) {
      interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev + 1) % loadingMessages.length);
      }, 1500);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isLoadingAI]);

  // Load saved profile data when user context is authenticated
  useEffect(() => {
    if (user) {
      setCreatorName(user.displayName);
      setNiche(user.niche);
      
      async function loadSavedData() {
        try {
          const response = await fetch(`http://localhost:5000/api/creator?creatorId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.creatorName) {
              setCreatorName(data.creatorName);
            }
            if (data.niche) {
              setNiche(data.niche);
            }
            if (data.incomeStreams && data.incomeStreams.length > 0) {
              setIncomeStreams(data.incomeStreams);
            }
            console.log('Successfully loaded profile data from server');
          }
        } catch (error) {
          console.warn('Backend server profile read error:', error);
        }

        // Auto-fetch recommendations on page reload/refresh
        try {
          const recResponse = await fetch(`http://localhost:5000/api/recommendations/${user.id}`);
          if (recResponse.ok) {
            const recData = await recResponse.json();
            if (recData.recommendations && Array.isArray(recData.recommendations)) {
              setAiRecommendations(recData.recommendations);
              setIsUsingFallback(false);
              console.log('Successfully loaded recommendations from server on refresh');
            }
          }
        } catch (recError) {
          console.warn('Failed to load recommendations on refresh:', recError);
        }
      }
      loadSavedData();
    } else {
      setCreatorName('');
      setIncomeStreams([
        { id: '1', platform: '', earnings: '', hours: '' },
        { id: '2', platform: '', earnings: '', hours: '' },
        { id: '3', platform: '', earnings: '', hours: '' }
      ]);
      setAiRecommendations([]);
    }
  }, [user]);

  // Handle stream list modifications
  const addStreamRow = () => {
    const nextId = String(incomeStreams.length > 0 ? Math.max(...incomeStreams.map(s => Number(s.id))) + 1 : 1);
    setIncomeStreams([...incomeStreams, { id: nextId, platform: '', earnings: '', hours: '' }]);
  };

  const deleteStreamRow = (id) => {
    const updated = incomeStreams.filter(s => s.id !== id);
    setIncomeStreams(updated.length > 0 ? updated : [{ id: '1', platform: '', earnings: '', hours: '' }]);
  };

  const updateStreamField = (id, field, value) => {
    const updated = incomeStreams.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    });
    setIncomeStreams(updated);
  };

  // Load preset demo values
  const handleLoadSampleData = () => {
    setCreatorName(SAMPLE_DATA.name);
    setNiche(SAMPLE_DATA.niche);
    setIncomeStreams(SAMPLE_DATA.streams.map(s => ({
      id: s.id,
      platform: s.platform,
      earnings: String(s.earnings),
      hours: String(s.hours)
    })));
  };

  // Clear data and reset
  const handleResetData = async () => {
    setCreatorName('');
    setIncomeStreams([
      { id: '1', platform: '', earnings: '', hours: '' },
      { id: '2', platform: '', earnings: '', hours: '' },
      { id: '3', platform: '', earnings: '', hours: '' }
    ]);
    setAiRecommendations([]);
    try {
      await fetch(`http://localhost:5000/api/creator?creatorId=${user?.id || 'creator_1'}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorName: '', niche: 'Tech', incomeStreams: [] })
      });
      console.log("Creator profile reset on backend.");
    } catch (err) {
      console.warn("Could not reset creator profile on server:", err);
    }
  };

  // Calculations for dashboard
  const validStreams = incomeStreams.filter(s => s.platform && Number(s.earnings) > 0);
  const totalEarnings = validStreams.reduce((sum, s) => sum + Number(s.earnings), 0);
  const activeStreamsCount = validStreams.length;
  
  // Find highest earning stream
  let topStream = { platform: 'None', earnings: 0 };
  if (validStreams.length > 0) {
    topStream = validStreams.reduce((max, s) => Number(s.earnings) > Number(max.earnings) ? s : max, validStreams[0]);
  }

  // Niche benchmark value
  const nicheBenchmark = BENCHMARKS[niche] || 150000;
  
  // AI Gap
  const aiGap = Math.max(0, nicheBenchmark - totalEarnings);

  // Revenue by platform
  const platformChartData = validStreams.map(s => ({
    name: s.platform,
    earnings: Number(s.earnings),
    percentage: totalEarnings > 0 ? ((Number(s.earnings) / totalEarnings) * 100) : 0
  })).sort((a, b) => b.earnings - a.earnings);

  // Time vs Money ROI list
  const timeRoiData = validStreams.map(s => {
    const earnings = Number(s.earnings);
    const hours = Number(s.hours) || 1;
    const rate = Math.round(earnings / hours);
    return {
      platform: s.platform,
      earnings,
      hours,
      rate
    };
  }).sort((a, b) => b.rate - a.rate);

  // Max and Min rates for highlights
  const highestRoiRate = timeRoiData.length > 0 ? timeRoiData[0].rate : 0;
  const lowestRoiRate = timeRoiData.length > 0 ? timeRoiData[timeRoiData.length - 1].rate : 0;
  
  // Calculate relative efficiency for efficiency bars (ratio to maximum rate)
  const timeRoiWithEfficiency = timeRoiData.map(item => ({
    ...item,
    efficiency: highestRoiRate > 0 ? (item.rate / highestRoiRate) * 100 : 0
  }));

  // Ratio between best and worst stream ROI
  const efficiencyRatio = lowestRoiRate > 0 ? (highestRoiRate / lowestRoiRate).toFixed(1) : '0';

  // Stability Score calculations (Substack + Patreon are recurring)
  const recurringIncome = validStreams
    .filter(s => s.platform === 'Substack' || s.platform === 'Patreon')
    .reduce((sum, s) => sum + Number(s.earnings), 0);
  
  const brandDealIncome = validStreams
    .filter(s => s.platform === 'Instagram Brand Deal' || s.platform.toLowerCase().includes('brand deal'))
    .reduce((sum, s) => sum + Number(s.earnings), 0);

  const affiliateIncome = validStreams
    .filter(s => s.platform === 'Amazon Affiliate' || s.platform.toLowerCase().includes('affiliate'))
    .reduce((sum, s) => sum + Number(s.earnings), 0);

  const stabilityScore = totalEarnings > 0 ? Math.round((recurringIncome / totalEarnings) * 100) : 0;
  const recurringPct = totalEarnings > 0 ? (recurringIncome / totalEarnings) * 100 : 0;
  const brandDealPct = totalEarnings > 0 ? (brandDealIncome / totalEarnings) * 100 : 0;
  const affiliatePct = totalEarnings > 0 ? (affiliateIncome / totalEarnings) * 100 : 0;

  // Stability classification
  let stabilityLevel = 'Moderate';
  let stabilityColor = 'text-accentGold border-accentGold';
  let stabilityFill = '#D4AF37';
  let stabilityTip = "You have some recurring income, but active work dominates. Plan to scale your Patreon or Substack to reach a 60% stability baseline.";

  if (stabilityScore <= 30) {
    stabilityLevel = 'High Risk';
    stabilityColor = 'text-[#EF4444] border-[#EF4444]';
    stabilityFill = '#EF4444';
    stabilityTip = `${Math.round(brandDealPct)}% of your income is from brand deals. One cancelled campaign = income collapse. Consider building a subscription tier.`;
  } else if (stabilityScore >= 61) {
    stabilityLevel = 'Stable';
    stabilityColor = 'text-[#10B981] border-[#10B981]';
    stabilityFill = '#10B981';
    stabilityTip = "Fantastic stability score! Your newsletter or community provides a solid baseline. Continue scaling recurring models to maintain this security.";
  }

  // Classy wealth palette colors (Gold, bronze, slate-gray, dark zinc, etc.)
  const CHART_COLORS = ['#D4AF37', '#C5A880', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A'];

  // Start analysis and fetch recommendations (Screen 2 -> Screen 3)
  const handleAnalyzeIncome = async () => {
    if (validStreams.length === 0) {
      alert("Please add at least one income source with valid earnings before analyzing.");
      return;
    }

    setIsLoadingAI(true);
    setScreen('dashboard');

    // 1. Sync any newly added manual streams to SQLite first
    for (const stream of incomeStreams) {
      if (stream.platform && Number(stream.earnings) > 0) {
        // If the ID is a simple local index (not starting with 'inc_'), it's a new manual stream
        if (!stream.id.startsWith('inc_')) {
          try {
            const mappedStreamType = mapDropdownToBackend(stream.platform);
            await fetch("http://localhost:5000/api/income/manual", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creatorId: user?.id || 'creator_1',
                streamType: mappedStreamType,
                amount: parseFloat(stream.earnings),
                month: '2026-06',
                source: stream.platform,
                date: new Date().toISOString().split('T')[0]
              })
            });
            console.log(`Synced new manual stream to SQLite: ${stream.platform}`);
          } catch (err) {
            console.warn("Could not sync manual stream to server:", err);
          }
        }
      }
    }

    const formattedName = creatorName || 'Creator';
    const topStreamName = topStream.platform;
    const topStreamAmount = topStream.earnings;
    
    const userMessage = `Creator name: ${formattedName}
Niche: ${niche}
Income streams: ${JSON.stringify(validStreams.map(s => ({ platform: s.platform, earnings: Number(s.earnings), hours: Number(s.hours) })))}
Total monthly income: ₹${totalEarnings}
Top stream: ${topStreamName} at ₹${topStreamAmount}
Recurring income: ₹${recurringIncome} (${recurringPct.toFixed(1)}% of total)
Brand deal income: ₹${brandDealIncome} (${brandDealPct.toFixed(1)}% of total)
Affiliate income: ₹${affiliateIncome} (${affiliatePct.toFixed(1)}% of total)
Niche benchmark: ₹${nicheBenchmark}
₹/hour by stream: ${JSON.stringify(validStreams.map(s => ({ platform: s.platform, rate: Math.round(Number(s.earnings) / (Number(s.hours) || 1)) })))}`;

    // 2. Save profile legacy info to backend
    try {
      await fetch(`http://localhost:5000/api/creator?creatorId=${user?.id || 'creator_1'}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorName, niche, incomeStreams })
      });
      console.log("Creator profile saved to backend.");
    } catch (err) {
      console.warn("Could not save creator profile to server (server may be offline):", err);
    }

    // 3. Try to get recommendations from offline backend
    let recommendationsObtained = false;
    
    try {
      const response = await fetch(`http://localhost:5000/api/recommendations/${user?.id || 'creator_1'}`);

      if (response.ok) {
        const data = await response.json();
        if (data.recommendations && Array.isArray(data.recommendations)) {
          setAiRecommendations(data.recommendations);
          setIsUsingFallback(false);
          recommendationsObtained = true;
          console.log("Offline recommendations loaded from backend rules engine.");
        }
      }
    } catch (err) {
      console.warn("Failed to get recommendations from backend. Falling back...", err);
    }

    // 4. Final Fallback: Generate local recommendations in the browser if server offline
    if (!recommendationsObtained) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const fallbackRecs = generateLocalRecommendations(
        formattedName, 
        niche, 
        validStreams.map(s => ({ platform: s.platform, earnings: Number(s.earnings), hours: Number(s.hours) })), 
        totalEarnings, 
        topStream, 
        recurringIncome, 
        brandDealIncome, 
        affiliateIncome, 
        nicheBenchmark
      );
      setAiRecommendations(fallbackRecs);
      setIsUsingFallback(true);
    }

    setIsLoadingAI(false);
  };

  // Directly load Priya's data and analyze from the dashboard empty state
  const handlePrepopulateAndAnalyze = () => {
    handleLoadSampleData();
    // Use a short delay so state updates take effect, then run analysis
    setTimeout(() => {
      // Re-evaluate calculations on preloaded streams directly
      const mockStreams = SAMPLE_DATA.streams;
      const mockTotal = mockStreams.reduce((sum, s) => sum + s.earnings, 0);
      const mockTopStream = mockStreams[1]; // Instagram Brand Deal
      const mockRecurring = mockStreams[3].earnings; // Substack
      const mockBrandDeal = mockStreams[1].earnings; // IG
      const mockAffiliate = mockStreams[2].earnings; // Amazon

      setIsLoadingAI(true);
      setScreen('dashboard');

      setTimeout(() => {
        const fallbackRecs = generateLocalRecommendations(
          SAMPLE_DATA.name, 
          SAMPLE_DATA.niche, 
          mockStreams, 
          mockTotal, 
          mockTopStream, 
          mockRecurring, 
          mockBrandDeal, 
          mockAffiliate, 
          BENCHMARKS[SAMPLE_DATA.niche]
        );
        setAiRecommendations(fallbackRecs);
        setIsUsingFallback(true);
        setIsLoadingAI(false);
      }, 1500);
    }, 100);
  };

  // Pricing calculations for Rate Card
  const brandDealBase = brandDealIncome > 0 ? brandDealIncome : 50000;
  const suggestedReel = Math.round(brandDealBase * 1.4);
  const suggestedStory = Math.round(brandDealBase * 0.4 * 1.4);
  const suggestedYTIntegration = Math.round(brandDealBase * 1.5 * 1.4);
  const suggestedYTDedicated = Math.round(brandDealBase * 3.0 * 1.4);
  const suggestedLinkedIn = Math.round(brandDealBase * 0.6 * 1.4);

  // Recommendation Tag style helper
  const getBadgeStyles = (tag) => {
    switch (tag.toLowerCase()) {
      case 'opportunity':
        return 'bg-zinc-800 text-accentGold border border-accentGold/30';
      case 'underpriced':
        return 'bg-zinc-800 text-whiteText border border-zinc-700';
      case 'insight':
        return 'bg-zinc-800 text-accentGoldMuted border border-accentGoldMuted/30';
      case 'warning':
        return 'bg-zinc-800 text-red-400 border border-red-900/30';
      default:
        return 'bg-[#27272A] text-whiteText border border-borderGray';
    }
  };

  // Navigation scroll utility
  const handleNavScroll = (sectionId) => {
    if (screen !== 'landing') {
      setScreen('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-whiteText font-sans relative pb-12 selection:bg-accentGold selection:text-background">
      
      {/* ===================================================
          GLOBAL TOP NAVIGATION BAR
          =================================================== */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-borderGray z-40 px-4 md:px-8 py-4 transition-all duration-200">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div 
            onClick={() => { setScreen('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-2xl font-black font-serif text-accentGold tracking-widest group-hover:opacity-90 transition-opacity">
              NEXORA
            </span>
            <span className="hidden sm:inline-block text-[9px] border border-borderGrayLight px-1.5 py-0.5 rounded text-mutedText tracking-wider uppercase font-semibold">
              Asset Manager
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-4 md:gap-6">
            <button 
              onClick={() => { setScreen('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className={`px-2 md:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${screen === 'landing' ? 'text-accentGold' : 'text-mutedText hover:text-whiteText'}`}
            >
              Home
            </button>
            <button 
              onClick={() => handleNavScroll('features')}
              className="px-2 md:px-3 py-1.5 text-xs font-semibold rounded-md text-mutedText hover:text-whiteText transition-colors"
            >
              Features
            </button>
            <button 
              onClick={() => handleNavScroll('about')}
              className="px-2 md:px-3 py-1.5 text-xs font-semibold rounded-md text-mutedText hover:text-whiteText transition-colors"
            >
              About
            </button>
            <button 
              onClick={() => {
                if (!user) setScreen('login');
                else setScreen('input');
              }}
              className={`px-2 md:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${screen === 'input' ? 'text-accentGold' : 'text-mutedText hover:text-whiteText'}`}
            >
              Setup Streams
            </button>
            <button 
              onClick={() => {
                if (!user) setScreen('login');
                else setScreen('dashboard');
              }}
              className={`px-2 md:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${screen === 'dashboard' ? 'text-accentGold' : 'text-mutedText hover:text-whiteText'}`}
            >
              Dashboard
            </button>
          </div>

          {/* User profile action */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => setScreen('dashboard')}
                  className="flex items-center gap-2 cursor-pointer group"
                  title="Go to dashboard"
                >
                  <div className="w-7 h-7 rounded-full bg-accentGold text-background flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                    {user.displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="hidden md:inline-block text-xs font-medium text-mutedText group-hover:text-whiteText transition-colors">
                    {user.displayName}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-2 py-1 border border-zinc-800 text-[10px] text-red-400 hover:bg-red-500/10 rounded font-semibold transition-colors ml-1"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setScreen('login')}
                className="px-3.5 py-1.5 bg-accentGold text-background font-bold text-xs rounded-lg hover:bg-opacity-95 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span>Connect</span>
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ===================================================
          SCREEN 1 — LANDING / LOGIN PAGE (With scrollable sub-sections)
          =================================================== */}
      {screen === 'landing' && (
        <div className="fade-in max-w-6xl mx-auto px-4 space-y-24 pt-12">
          
          {/* Main Hero & Login */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[70vh]">
            {/* Left side hero banner */}
            <div className="lg:col-span-7 text-left space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-borderGray bg-cardBg text-xs text-accentGold font-medium">
                <Sparkles size={12} className="text-accentGoldMuted" />
                <span>NEXORA v1.1 • Premium Asset Manager</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-serif text-whiteText leading-[1.1] tracking-tight">
                One dashboard.<br />
                Every platform.<br />
                <span className="text-accentGold">Every rupee.</span>
              </h1>
              
              <p className="text-base sm:text-lg text-mutedText max-w-xl">
                India's first AI-powered income intelligence tool built for digital content creators. Track hourly productivity metrics, plan tax distributions, and align sponsorship rates.
              </p>

              {/* Minimal pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-3 py-1.5 rounded-lg bg-cardBg border border-borderGray text-xs text-whiteText font-medium">
                  🔗 7 platforms unified
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-cardBg border border-borderGray text-xs text-whiteText font-medium">
                  🤖 AI-powered nudges
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-cardBg border border-borderGray text-xs text-whiteText font-medium">
                  📊 Benchmark engine
                </span>
              </div>
            </div>

            {/* Right side connection interface */}
            <div className="lg:col-span-5 relative">
              
              {/* Optional API Endpoint Config */}
              <div className="absolute -top-12 right-0">
                <button 
                  onClick={() => setShowApiKeySetting(!showApiKeySetting)}
                  className="flex items-center gap-1.5 text-xs text-mutedText hover:text-accentGold transition-colors"
                >
                  <Settings size={12} />
                  <span>Configure API</span>
                </button>
              </div>

              {showApiKeySetting && (
                <div className="absolute -top-12 left-0 right-0 p-4 bg-cardBgSecondary border border-accentGold/50 rounded-2xl shadow-xl z-20 fade-in text-left">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-xs font-bold text-whiteText flex items-center gap-1.5">
                      <Settings size={12} className="text-accentGold" />
                      <span>Anthropic API Configuration</span>
                    </h3>
                    <button onClick={() => setShowApiKeySetting(false)} className="text-mutedText hover:text-whiteText">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] text-mutedText mb-3">
                    Input your Claude API Key. If empty, NEXORA uses local optimization logic to generate recommended action cards.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      placeholder="sk-ant-..." 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-borderGray bg-background text-xs text-whiteText focus:outline-none focus:border-accentGold"
                    />
                    <button 
                      onClick={() => setShowApiKeySetting(false)}
                      className="px-3 py-1.5 bg-accentGold text-background font-semibold text-xs rounded-lg hover:bg-opacity-95"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Connection interface / auth options */}
              {user ? (
                <div className="w-full bg-cardBg border border-borderGrayLight rounded-xl p-8 shadow-xl text-left space-y-6">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-whiteText">Workspace Ready</h2>
                    <p className="text-xs text-mutedText">Analyze your digital creator balance sheet.</p>
                  </div>
                  <div className="p-4 bg-background border border-borderGray rounded-lg text-xs text-mutedText leading-relaxed">
                    Connected creator: <span className="text-whiteText font-bold">{user.displayName}</span> • <span className="text-accentGold font-bold">{user.niche} Niche</span>
                  </div>
                  <button 
                    onClick={() => setScreen('dashboard')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-accentGold text-background hover:bg-opacity-95 font-bold rounded-lg transition-all shadow-md group"
                  >
                    <span>Go to Dashboard</span>
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="w-full bg-cardBg border border-borderGrayLight rounded-xl p-8 shadow-xl text-left space-y-6">
                  <div>
                    <h2 className="text-xl font-bold font-serif text-whiteText">Get Started</h2>
                    <p className="text-xs text-mutedText">Analyze your digital creator balance sheet.</p>
                  </div>
                  <p className="text-xs text-mutedText">Sign in to query peer benchmarks, map files, and build active ledgers offline.</p>
                  <div className="space-y-3">
                    <button 
                      onClick={() => setScreen('login')}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-accentGold text-background hover:bg-opacity-95 font-bold rounded-lg transition-all shadow-md group"
                    >
                      <span>Sign In to Nexora</span>
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setScreen('signup')}
                      className="w-full py-3 border border-borderGray hover:border-accentGold/40 text-whiteText text-xs font-semibold rounded-lg transition-all hover:bg-zinc-900/30 text-center"
                    >
                      Create Creator Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Section: Features */}
          <section id="features" className="scroll-mt-24 border-t border-borderGray pt-16 text-left space-y-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold font-serif text-whiteText flex items-center gap-2">
                <span className="text-accentGold">✦</span>
                <span>Unified Platform Features</span>
              </h2>
              <p className="text-sm text-mutedText mt-1">
                Nexora connects to your standard channels, analyzing your margins and estimating tax burdens.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-cardBg border border-borderGray rounded-lg p-6 space-y-3 hover:border-accentGold/40 transition-colors">
                <span className="text-2xl block">🔗</span>
                <h3 className="text-sm font-bold text-whiteText">7 Platforms Unified</h3>
                <p className="text-xs text-mutedText leading-relaxed">
                  Consolidate YouTube AdSense, Instagram sponsorships, Amazon affiliates, newsletters (Substack), Razorpay checkouts, and custom manual entries.
                </p>
              </div>

              <div className="bg-cardBg border border-borderGray rounded-lg p-6 space-y-3 hover:border-accentGold/40 transition-colors">
                <span className="text-2xl block">🤖</span>
                <h3 className="text-sm font-bold text-whiteText">Claude AI Intelligence</h3>
                <p className="text-xs text-mutedText leading-relaxed">
                  Evaluates your income streams to flag extreme dependency on volatile brand deals, poor hourly rates, or underutilized affiliate link opportunities.
                </p>
              </div>

              <div className="bg-cardBg border border-borderGray rounded-lg p-6 space-y-3 hover:border-accentGold/40 transition-colors">
                <span className="text-2xl block">📊</span>
                <h3 className="text-sm font-bold text-whiteText">Benchmark Engine</h3>
                <p className="text-xs text-mutedText leading-relaxed">
                  Compare your performance metrics directly with the database averages of other Indian creators in your specific niche category.
                </p>
              </div>
            </div>
          </section>

          {/* Section: About */}
          <section id="about" className="scroll-mt-24 border-t border-borderGray pt-16 pb-12 text-left space-y-6">
            <div className="max-w-3xl space-y-4">
              <h2 className="text-2xl font-bold font-serif text-whiteText flex items-center gap-2">
                <span className="text-accentGold">✦</span>
                <span>Our Mission</span>
              </h2>
              <p className="text-sm text-mutedText leading-relaxed">
                NEXORA was built to empower India's 80 million+ digital creators. While the Indian creator economy is a ₹20,000 Crore market, less than 5% of creators utilize proper tools to track their hourly ROI, plan their taxes, or negotiate brand deals.
              </p>
              <p className="text-sm text-mutedText leading-relaxed">
                We believe you deserve transparent, institutional-grade analytics to grow your digital assets. By aggregating platforms, evaluating hourly rates, and comparing benchmarks, NEXORA helps you build a stable financial foundation.
              </p>
            </div>

            {/* Clean Gold-bordered statistics strip */}
            <div className="bg-cardBg border border-accentGold/20 rounded-xl p-6 text-center shadow-sm">
              <p className="text-xs sm:text-sm text-accentGold font-bold tracking-wider uppercase">
                80M+ creators in India · &lt;5% use income tools · ₹20,000 Cr market · You deserve better
              </p>
            </div>
          </section>

        </div>
      )}

      {/* ===================================================
          SCREEN: LOGIN
          =================================================== */}
      {screen === 'login' && (
        <div className="fade-in max-w-md mx-auto px-4 pt-16 pb-24">
          <div className="w-full bg-cardBg border border-borderGrayLight rounded-xl p-8 shadow-xl text-left space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold font-serif text-whiteText">Sign In to <span className="text-accentGold">NEXORA</span></h2>
              <p className="text-xs text-mutedText mt-1">Enter your credentials to access your creator workspace.</p>
            </div>
            
            {loginError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-mutedText uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@creator.com"
                  className="w-full px-3 py-2 rounded-lg border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold transition-all font-semibold animate-fadeIn"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-mutedText uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-accentGold text-background hover:bg-opacity-95 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{loginLoading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-mutedText font-semibold">
              <span>New to Nexora? </span>
              <button onClick={() => setScreen('signup')} className="text-accentGold font-bold hover:underline">Create creator account</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          SCREEN: SIGNUP
          =================================================== */}
      {screen === 'signup' && (
        <div className="fade-in max-w-md mx-auto px-4 pt-12 pb-24">
          <div className="w-full bg-cardBg border border-borderGrayLight rounded-xl p-8 shadow-xl text-left space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold font-serif text-whiteText">Create <span className="text-accentGold">NEXORA</span> ID</h2>
              <p className="text-xs text-mutedText mt-1">Register your profile to track monetization metrics.</p>
            </div>

            {signupError && (
              <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span>{signupError}</span>
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-mutedText uppercase tracking-wider mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 rounded-lg border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold transition-all font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-mutedText uppercase tracking-wider mb-1">Niche Category</label>
                <select 
                  value={signupNiche}
                  onChange={(e) => setSignupNiche(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold transition-all font-semibold cursor-pointer"
                >
                  <option value="Tech">Tech</option>
                  <option value="Finance">Finance</option>
                  <option value="Lifestyle">Lifestyle</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Fashion">Fashion</option>
                  <option value="Food">Food</option>
                  <option value="Education">Education</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-mutedText uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@creator.com"
                  className="w-full px-3 py-2 rounded-lg border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold transition-all font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-mutedText uppercase tracking-wider mb-1">Password</label>
                <input 
                  type="password" 
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 rounded-lg border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold transition-all"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={signupLoading}
                className="w-full py-2.5 bg-accentGold text-background hover:bg-opacity-95 font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{signupLoading ? 'Registering...' : 'Register Profile'}</span>
              </button>
            </form>

            <div className="text-center pt-2 text-xs text-mutedText font-semibold">
              <span>Already registered? </span>
              <button onClick={() => setScreen('login')} className="text-accentGold font-bold hover:underline">Sign In here</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          SCREEN 2 — INCOME INPUT PAGE
          =================================================== */}
      {screen === 'input' && (
        <div className="max-w-6xl mx-auto px-4 py-12 fade-in flex flex-col min-h-[80vh]">
          
          {/* Header section with details and loaders */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-borderGray mb-8 text-left">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-whiteText">
                Connect Your Income Sources
              </h1>
              <p className="text-xs text-mutedText mt-0.5">
                Add your monthly earnings from each platform. We'll do the math.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Creator details */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#27272A] border border-borderGray text-xs">
                <span className="text-mutedText">Profile:</span>
                <span className="text-whiteText font-bold">{creatorName || 'Guest'}</span>
                <span className="text-accentGold font-bold">• {niche}</span>
              </div>
              
              {/* Load sample data */}
              <button 
                onClick={handleLoadSampleData}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded border border-accentGold bg-cardBg/30 text-accentGold hover:bg-accentGold hover:text-background transition-all"
              >
                <Award size={12} />
                <span>Load Demo Data</span>
              </button>
            </div>
          </div>

          {/* Grid Layout: Stream Builder vs Offline Ingestion */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Manual stream builder */}
            <div className="lg:col-span-7 bg-cardBg border border-borderGray rounded-xl p-6 space-y-6 shadow-sm">
              
              {/* Stream headers on desktop */}
              <div className="hidden sm:grid grid-cols-12 gap-4 pb-2 border-b border-borderGray/50 text-[10px] font-bold text-mutedText uppercase tracking-wider text-left">
                <div className="col-span-5">Income Source</div>
                <div className="col-span-3">Monthly Earnings (₹)</div>
                <div className="col-span-3">Hours spent / month</div>
                <div className="col-span-1 text-center">Delete</div>
              </div>

              {/* List */}
              <div className="space-y-3">
                {incomeStreams.map((stream, idx) => (
                  <div key={stream.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-background/50 p-4 sm:p-2.5 rounded-lg border border-borderGray hover:border-accentGold/20 transition-all">
                    
                    {/* Platform dropdown */}
                    <div className="col-span-1 sm:col-span-5 text-left">
                      <label className="block sm:hidden text-[10px] font-bold text-mutedText uppercase mb-1">
                        Income Source
                      </label>
                      <div className="relative">
                        <select 
                          value={stream.platform}
                          onChange={(e) => updateStreamField(stream.id, 'platform', e.target.value)}
                          className="w-full appearance-none px-3 py-2 rounded border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold"
                        >
                          <option value="" disabled>Select Platform</option>
                          {PLATFORMS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-mutedText text-[9px]">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* Monthly earnings */}
                    <div className="col-span-1 sm:col-span-3 text-left">
                      <label className="block sm:hidden text-[10px] font-bold text-mutedText uppercase mb-1">
                        Monthly Earnings (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 inset-y-0 flex items-center text-mutedText text-xs font-semibold">
                          ₹
                        </span>
                        <input 
                          type="number" 
                          placeholder="Earnings" 
                          value={stream.earnings}
                          onChange={(e) => updateStreamField(stream.id, 'earnings', e.target.value)}
                          className="w-full pl-6 pr-3 py-2 rounded border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold"
                        />
                      </div>
                    </div>

                    {/* Hours spent */}
                    <div className="col-span-1 sm:col-span-3 text-left">
                      <label className="block sm:hidden text-[10px] font-bold text-mutedText uppercase mb-1">
                        Hours spent / month
                      </label>
                      <input 
                        type="number" 
                        placeholder="Hours" 
                        value={stream.hours}
                        onChange={(e) => updateStreamField(stream.id, 'hours', e.target.value)}
                        className="w-full px-3 py-2 rounded border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold"
                      />
                    </div>

                    {/* Delete button */}
                    <div className="col-span-1 sm:col-span-1 flex justify-end sm:justify-center">
                      <button 
                        onClick={() => deleteStreamRow(stream.id)}
                        className="p-1.5 text-[#EF4444] hover:bg-red-500/10 rounded transition-colors"
                        title="Delete stream"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row button */}
              <div className="flex gap-2">
                <button 
                  onClick={addStreamRow}
                  className="flex-1 py-2.5 flex items-center justify-center gap-1.5 border border-dashed border-accentGold/30 hover:border-accentGold rounded-lg text-accentGold bg-cardBg/10 text-xs font-bold transition-all"
                >
                  <Plus size={14} />
                  <span>Add Income Source</span>
                </button>

                <button 
                  onClick={handleResetData}
                  className="px-4 border border-borderGray hover:bg-cardBg/30 text-mutedText hover:text-whiteText text-xs font-bold rounded-lg transition-colors"
                >
                  Reset List
                </button>
              </div>
            </div>

            {/* Right Column: Hackathon Offline Ingestion Tools */}
            <div className="lg:col-span-5 space-y-6 text-left">
              
              {/* CSV Upload Card */}
              <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-borderGray/50">
                  <span className="text-xl">📁</span>
                  <div>
                    <h3 className="text-sm font-bold text-whiteText">Fuzzy CSV Batch Import</h3>
                    <p className="text-[10px] text-mutedText">Parses CSV locally and fuzzy-maps category synonym groups</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-mutedText uppercase">Select CSV File</label>
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files[0])}
                      className="w-full text-xs text-mutedText file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-accentGold file:text-background hover:file:opacity-90 cursor-pointer"
                    />
                  </div>

                  <button 
                    onClick={handleCsvUpload}
                    disabled={isImporting}
                    className="w-full py-2 bg-cardBgSecondary hover:bg-opacity-80 border border-borderGrayLight text-whiteText text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isImporting ? 'Processing...' : 'Upload & Import CSV'}
                  </button>

                  {importSummary && (
                    <div className="p-3 rounded-lg bg-background/50 border border-borderGray text-[10px] space-y-1">
                      <div className="font-bold text-accentGold">Import Summary:</div>
                      <div>• Rows Processed: <span className="text-whiteText font-semibold">{importSummary.rowsProcessed}</span></div>
                      <div>• Rows Failed: <span className="text-whiteText font-semibold">{importSummary.rowsFailed}</span></div>
                      <div>• Total Ingested: <span className="text-whiteText font-semibold">₹{importSummary.totalAmountImported.toLocaleString('en-IN')}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Screenshot OCR Card */}
              <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-borderGray/50">
                  <span className="text-xl">📸</span>
                  <div>
                    <h3 className="text-sm font-bold text-whiteText">Screenshot OCR (Tesseract.js)</h3>
                    <p className="text-[10px] text-mutedText">Converts text via local WebAssembly OCR and runs rule extraction</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-mutedText uppercase">Select Image Screenshot</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files[0])}
                      className="w-full text-xs text-mutedText file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-accentGold file:text-background hover:file:opacity-90 cursor-pointer"
                    />
                  </div>

                  <button 
                    onClick={handleScreenshotUpload}
                    disabled={isImporting}
                    className="w-full py-2 bg-cardBgSecondary hover:bg-opacity-80 border border-borderGrayLight text-whiteText text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isImporting ? 'Extracting OCR...' : 'Analyze Screenshot'}
                  </button>
                </div>
              </div>

              {/* Inbound Email Sim Card */}
              <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-borderGray/50">
                  <span className="text-xl">📧</span>
                  <div>
                    <h3 className="text-sm font-bold text-whiteText">Inbound Email Parser</h3>
                    <p className="text-[10px] text-mutedText">Simulates inbound mail webhook using Compromise NLP</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-mutedText uppercase">Sender Email</label>
                      <input 
                        type="text" 
                        value={emailSender} 
                        onChange={(e) => setEmailSender(e.target.value)}
                        placeholder="sponsor@domain.com"
                        className="w-full px-3 py-1.5 rounded border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold"
                      />
                    </div>
                    <div className="flex items-end">
                      <button 
                        onClick={() => setEmailSender('adsense-noreply@google.com')}
                        className="px-2 py-1.5 bg-[#27272A] border border-borderGray rounded text-[9px] font-bold hover:text-whiteText text-mutedText"
                        title="Load google.com sender"
                      >
                        YouTube Domain
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-mutedText uppercase">Email Message Body</label>
                    <textarea 
                      rows={3}
                      value={emailText} 
                      onChange={(e) => setEmailText(e.target.value)}
                      placeholder="Paste payment alert text here..."
                      className="w-full px-3 py-2 rounded border border-borderGray bg-background text-whiteText text-xs focus:outline-none focus:border-accentGold placeholder:text-mutedText/30"
                    />
                  </div>

                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setEmailText('Dear creator_1, we have sent a transfer of $1500 for the YouTube collaboration.')}
                      className="flex-1 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-mutedText hover:text-whiteText text-[9px] font-bold rounded border border-borderGray"
                    >
                      Template A
                    </button>
                    <button 
                      onClick={() => setEmailText('Campaign finished. The sponsor paid us ₹60,000 for the brand collab. Over 15k views recorded!')}
                      className="flex-1 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-mutedText hover:text-whiteText text-[9px] font-bold rounded border border-borderGray"
                    >
                      Template B (NLP)
                    </button>
                  </div>

                  <button 
                    onClick={handleEmailWebhookSim}
                    disabled={isImporting}
                    className="w-full py-2 bg-cardBgSecondary hover:bg-opacity-80 border border-borderGrayLight text-whiteText text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isImporting ? 'Ingesting...' : 'Forward Webhook Email'}
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* Action buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center justify-between w-full">
            <button 
              onClick={() => setScreen('landing')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-6 py-3 border border-borderGray hover:border-mutedText rounded-lg text-xs font-bold text-mutedText hover:text-whiteText transition-all"
            >
              <ArrowLeft size={14} />
              <span>Back Home</span>
            </button>

            <button 
              onClick={handleAnalyzeIncome}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-10 py-3 bg-accentGold text-background hover:bg-opacity-95 rounded-lg font-bold text-xs transition-all shadow-md"
            >
              <span>Analyze My Income</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          SCREEN 3 — CREATOR DASHBOARD
          =================================================== */}
      {screen === 'dashboard' && (
        <div className="max-w-6xl mx-auto px-4 py-8 fade-in space-y-6">
          
          {/* Dashboard Header Banner */}
          <div className="bg-cardBg border border-borderGray rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left shadow-sm">
            <div>
              <span className="text-[10px] text-accentGold uppercase font-bold tracking-widest block">Creator Intelligence Report</span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-whiteText mt-0.5">
                {validStreams.length > 0 ? `Portfolio Summary • ${creatorName || 'Guest'}` : "Income Registry Panel"}
              </h2>
            </div>
            
            {validStreams.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#27272A] border border-borderGray text-xs font-semibold">
                  {niche} Category
                </span>
                <button 
                  onClick={() => setScreen('input')}
                  className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded border border-borderGray bg-cardBgSecondary/30 text-mutedText hover:text-whiteText transition-colors"
                >
                  <ArrowLeft size={12} />
                  <span>Adjust Inputs</span>
                </button>
              </div>
            )}
          </div>

          {/* Empty state dashboard container */}
          {validStreams.length === 0 ? (
            <div className="bg-cardBg border border-borderGray rounded-xl p-12 text-center max-w-xl mx-auto space-y-6 shadow-md fade-in">
              <div className="w-16 h-16 rounded-full bg-borderGray flex items-center justify-center mx-auto text-accentGold">
                <Info size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-whiteText font-serif">No Streams Registered</h3>
                <p className="text-xs text-mutedText max-w-sm mx-auto leading-relaxed">
                  Enter your monthly income channels and working hours to load the benchmark calculations, tax summaries, and AI recommendations.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button 
                  onClick={() => setScreen('input')}
                  className="px-6 py-2.5 bg-accentGold text-background font-bold text-xs rounded-lg hover:bg-opacity-90 transition-all"
                >
                  Connect Income Sources
                </button>
                <button 
                  onClick={handlePrepopulateAndAnalyze}
                  className="px-6 py-2.5 border border-accentGold text-accentGold bg-accentGold/5 font-bold text-xs rounded-lg hover:bg-accentGold hover:text-background transition-all flex items-center justify-center gap-1.5"
                >
                  <Award size={12} />
                  <span>Prepopulate Demo Data</span>
                </button>
              </div>
            </div>
          ) : (
            // Dashboard populated layout
            <div className="space-y-6">
              
              {/* Row 1: KPI Statistics cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total Monthly Payout */}
                <div className="bg-cardBg border border-borderGray hover:border-accentGold/60 rounded-xl p-6 shadow-sm card-hover-classy text-left space-y-1.5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accentGold" />
                  <div className="flex justify-between items-center text-mutedText">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total this month</span>
                    <DollarSign size={14} className="text-accentGoldMuted" />
                  </div>
                  <div className="text-2xl font-bold text-whiteText font-serif">
                    ₹{totalEarnings.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] font-bold">
                    {totalEarnings >= nicheBenchmark ? (
                      <span className="text-accentGold flex items-center gap-1">
                        <TrendingUp size={10} />
                        <span>+{Math.round(((totalEarnings - nicheBenchmark) / nicheBenchmark) * 100)}% vs niche avg</span>
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <TrendingDown size={10} />
                        <span>-{Math.round(((nicheBenchmark - totalEarnings) / nicheBenchmark) * 100)}% vs niche avg</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Active Channels count */}
                <div className="bg-cardBg border border-borderGray hover:border-accentGold/60 rounded-xl p-6 shadow-sm card-hover-classy text-left space-y-1.5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accentGoldMuted" />
                  <div className="flex justify-between items-center text-mutedText">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Income Sources</span>
                    <Activity size={14} className="text-accentGold" />
                  </div>
                  <div className="text-2xl font-bold text-whiteText font-serif">
                    {activeStreamsCount}
                  </div>
                  <div className="text-[11px] text-mutedText">
                    Active channels registered
                  </div>
                </div>

                {/* Top Income Performer */}
                <div className="bg-cardBg border border-borderGray hover:border-accentGold/60 rounded-xl p-6 shadow-sm card-hover-classy text-left space-y-1.5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-accentGold" />
                  <div className="flex justify-between items-center text-mutedText">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Top Performer</span>
                    <Award size={14} className="text-accentGold" />
                  </div>
                  <div className="text-lg font-bold text-whiteText truncate font-serif" title={topStream.platform}>
                    {topStream.platform}
                  </div>
                  <div className="text-[11px] text-mutedText">
                    Earned <span className="text-accentGold font-bold">₹{Number(topStream.earnings).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Income gap detection */}
                <div className="bg-cardBg border border-borderGray hover:border-accentGold/60 rounded-xl p-6 shadow-sm card-hover-classy text-left space-y-1.5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-borderGrayLight" />
                  <div className="flex justify-between items-center text-mutedText">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Target Gap</span>
                    <TrendingDown size={14} className="text-accentGoldMuted" />
                  </div>
                  {isLoadingAI ? (
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-3.5 h-3.5 border border-accentGold border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-mutedText animate-pulse">Calculating...</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-whiteText font-serif">
                        ₹{aiGap.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-mutedText">
                        {aiGap > 0 ? "Under category benchmark average" : "Outperforming benchmark"}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Row 2: Charts and Tables columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Platform distributions & ROI efficiency */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Platform share bar chart */}
                  <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm text-left space-y-4">
                    <h3 className="text-base font-bold font-serif text-whiteText">
                      Revenue Distribution by Platform
                    </h3>
                    
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={platformChartData} 
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272A" horizontal={false} />
                          <XAxis type="number" stroke="#A1A1AA" tickFormatter={(v) => `₹${v/1000}k`} style={{ fontSize: 10 }} />
                          <YAxis dataKey="name" type="category" stroke="#A1A1AA" width={110} tick={{ fontSize: 10 }} />
                          <ChartTooltip 
                            contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A', color: '#F4F4F6', borderRadius: '8px' }} 
                            itemStyle={{ color: '#D4AF37' }}
                            labelStyle={{ color: '#A1A1AA', fontWeight: 'bold' }}
                            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Payout']}
                          />
                          <Bar dataKey="earnings" radius={[0, 4, 4, 0]}>
                            {platformChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown pill labels */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                      {platformChartData.map((p, idx) => (
                        <div key={p.name} className="bg-background border border-borderGray p-2.5 rounded-lg text-left">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                            <span className="text-[10px] font-bold text-whiteText truncate w-24 block" title={p.name}>
                              {p.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-mutedText block">
                            {p.percentage.toFixed(1)}% share
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hourly ROI Table */}
                  <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm text-left space-y-4">
                    <div>
                      <h3 className="text-base font-bold font-serif text-whiteText">
                        Time vs. Money — Hourly Payout Efficiency
                      </h3>
                      <p className="text-xs text-mutedText mt-0.5">
                        Sorted by hourly efficiency. Gold indicates highest efficiency, red shows lowest.
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-borderGray text-mutedText uppercase font-bold tracking-wider text-left">
                            <th className="pb-3 pl-3">Platform</th>
                            <th className="pb-3">Monthly Revenue</th>
                            <th className="pb-3">Hours Spent</th>
                            <th className="pb-3">₹/Hour Rate</th>
                            <th className="pb-3 pr-3 text-right">Productivity Ratio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-borderGray/40">
                          {timeRoiWithEfficiency.map((item, idx) => {
                            const isHighest = item.rate === highestRoiRate;
                            const isLowest = item.rate === lowestRoiRate;
                            
                            let borderAccent = "border-l border-borderGray";
                            let highlightBg = "hover:bg-cardBgSecondary/30";
                            
                            if (isHighest) {
                              borderAccent = "border-l-2 border-accentGold";
                              highlightBg = "bg-accentGold/5 hover:bg-accentGold/10";
                            } else if (isLowest) {
                              borderAccent = "border-l-2 border-red-500";
                              highlightBg = "bg-red-500/5 hover:bg-red-500/10";
                            }

                            return (
                              <tr key={item.platform} className={`transition-colors ${highlightBg} ${borderAccent}`}>
                                <td className="py-3.5 pl-3 font-semibold text-whiteText">{item.platform}</td>
                                <td className="py-3.5 text-mutedText">₹{item.earnings.toLocaleString('en-IN')}</td>
                                <td className="py-3.5 text-mutedText inline-flex items-center gap-1 mt-3">
                                  <Clock size={10} /> {item.hours} hrs
                                </td>
                                <td className="py-3.5 font-bold text-whiteText">
                                  ₹{item.rate.toLocaleString('en-IN')}/hr
                                </td>
                                <td className="py-3.5 pr-3">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-12 bg-background h-1.5 rounded overflow-hidden border border-borderGray">
                                      <div 
                                        className="h-full rounded" 
                                        style={{ 
                                          width: `${item.efficiency}%`,
                                          backgroundColor: isHighest ? '#D4AF37' : isLowest ? '#EF4444' : '#A1A1AA'
                                        }}
                                      />
                                    </div>
                                    <span className="font-mono text-[10px] text-mutedText w-6 text-right">
                                      {Math.round(item.efficiency)}%
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {timeRoiData.length > 1 && (
                      <div className="bg-background/60 p-4 rounded-lg border border-borderGray text-xs text-mutedText">
                        💡 <span className="text-whiteText font-bold">Time Efficiency Factor:</span> Your most productive channel ({timeRoiData[0].platform}) yields <span className="text-accentGold font-bold">{efficiencyRatio}x</span> more revenue per hour than your lowest ({timeRoiData[timeRoiData.length - 1].platform}).
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: AI recommendations & Circular stability score */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* AI recommendations panel */}
                  <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm text-left space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold font-serif text-whiteText flex items-center gap-1.5">
                          <span>🤖 NEXORA Intelligence</span>
                        </h3>
                        <span className="text-[9px] bg-accentGold/10 text-accentGold border border-accentGold/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          Claude AI Active
                        </span>
                      </div>
                      <p className="text-xs text-mutedText mt-0.5">
                        Targeted recommendations computed on your creator balance sheet.
                      </p>
                    </div>

                    {isLoadingAI ? (
                      <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-2 border-accentGold border-t-transparent rounded-full animate-spin" />
                        <div className="text-center space-y-1">
                          <p className="text-xs font-semibold text-whiteText animate-pulse">
                            {loadingMessages[loadingTextIndex]}
                          </p>
                          <p className="text-[10px] text-mutedText">
                            Evaluating portfolio risk factors...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiRecommendations.map((rec, idx) => (
                          <div key={idx} className="bg-background border border-borderGray hover:border-accentGold/20 rounded-lg p-4 transition-all space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${getBadgeStyles(rec.tag || 'insight')}`}>
                                {rec.tag || 'insight'}
                              </span>
                              {typeof rec.impact === 'number' && rec.impact > 0 && (
                                <span className="text-[11px] font-bold text-accentGold">
                                  +₹{rec.impact.toLocaleString('en-IN')}/mo
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-whiteText">{rec.title || 'Income Insight'}</h4>
                              <p className="text-[11px] text-mutedText leading-relaxed">{rec.message}</p>
                              {rec.suggestedAction && (
                                <div className="mt-2 p-2 rounded bg-accentGold/5 border border-accentGold/20 text-[10px] text-accentGoldMuted font-semibold flex items-center gap-1">
                                  <span>💡 Suggested Action:</span>
                                  <span className="text-whiteText font-medium">{rec.suggestedAction}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {isUsingFallback && (
                          <div className="text-[9px] text-mutedText text-center flex items-center justify-center gap-1 bg-[#27272A]/20 py-1.5 px-3 rounded border border-borderGray">
                            <span className="inline-block w-1 h-1 bg-accentGold rounded-full animate-ping" />
                            <span>Optimized locally using Nexora heuristics</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Circular stability tracker */}
                  <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm text-left space-y-4">
                    <h3 className="text-base font-bold font-serif text-whiteText">
                      Cash Flow Stability Score
                    </h3>

                    <div className="flex items-center gap-6">
                      {/* Classy Circular indicator */}
                      <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            fill="transparent"
                            stroke="#27272A"
                            strokeWidth="8"
                          />
                          <circle
                            cx="48"
                            cy="48"
                            r="38"
                            fill="transparent"
                            stroke={stabilityFill}
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 38}
                            strokeDashoffset={2 * Math.PI * 38 * (1 - stabilityScore / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-bold text-whiteText">{stabilityScore}%</span>
                          <span className="text-[8px] uppercase font-bold text-mutedText tracking-wider">{stabilityLevel}</span>
                        </div>
                      </div>

                      {/* Cash categories */}
                      <div className="space-y-1.5 text-xs flex-1">
                        <div className="flex justify-between border-b border-borderGray pb-1">
                          <span className="text-mutedText">Recurring (baseline):</span>
                          <span className="font-bold text-whiteText">₹{recurringIncome.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between border-b border-borderGray pb-1">
                          <span className="text-mutedText">Active Brand Deals:</span>
                          <span className="font-bold text-accentGold">₹{brandDealIncome.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-mutedText">Affiliate / Sales:</span>
                          <span className="font-bold text-whiteText">₹{affiliateIncome.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-background border border-borderGray p-3.5 rounded-lg text-xs leading-relaxed text-mutedText">
                      {stabilityTip}
                    </div>
                  </div>

                </div>
              </div>

              {/* Row 3: Niche Benchmarks comparisons */}
              <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm text-left space-y-6">
                <div>
                  <h3 className="text-base font-bold font-serif text-whiteText">
                    Peer Benchmark Comparison — How Do You Compare?
                  </h3>
                  <p className="text-xs text-mutedText mt-0.5">
                    Evaluated against active {niche} creators in India.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Monthly Income Comparison */}
                  <div className="bg-background border border-borderGray rounded-lg p-4 space-y-4">
                    <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider block">
                      1. Monthly Income Benchmark
                    </span>
                    
                    <div className="h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'You', amount: totalEarnings },
                            { name: `${niche} Avg`, amount: nicheBenchmark }
                          ]}
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <XAxis dataKey="name" stroke="#A1A1AA" tick={{ fontSize: 10 }} />
                          <ChartTooltip 
                            contentStyle={{ backgroundColor: '#09090B', borderColor: '#27272A', color: '#F4F4F6' }}
                            formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Income']}
                          />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            <Cell fill="#D4AF37" />
                            <Cell fill="#27272A" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-mutedText font-semibold">
                      <span>You: ₹{totalEarnings.toLocaleString('en-IN')}</span>
                      <span>Average: ₹{nicheBenchmark.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Diversification Comparison */}
                  <div className="bg-background border border-borderGray rounded-lg p-4 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider block">
                        2. Stream Diversification
                      </span>
                      <p className="text-xs text-mutedText leading-relaxed">
                        Industry standards indicate distributing revenue across 5 channels mitigates volatility.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-whiteText">{activeStreamsCount} of 5 Active</span>
                        <span className="text-accentGold">{Math.round((activeStreamsCount / 5) * 100)}%</span>
                      </div>
                      <div className="w-full bg-borderGray h-2 rounded overflow-hidden">
                        <div 
                          className="h-full bg-accentGold rounded transition-all duration-1000"
                          style={{ width: `${Math.min(100, (activeStreamsCount / 5) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-mutedText">
                      {activeStreamsCount >= 4 
                        ? "✓ High diversification minimizes income threats." 
                        : "ℹ Expand affiliate funnels or merchandise channels."}
                    </div>
                  </div>

                  {/* Stability score comparison */}
                  <div className="bg-background border border-borderGray rounded-lg p-4 space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider block">
                        3. Stability Index Comparison
                      </span>
                      <p className="text-xs text-mutedText leading-relaxed">
                        Evaluates subscription ratios against the 50% cash flow target baseline.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-mutedText">Your score</span>
                          <span className="font-bold text-whiteText">{stabilityScore}%</span>
                        </div>
                        <div className="w-full bg-borderGray h-1.5 rounded overflow-hidden">
                          <div 
                            className="h-full rounded"
                            style={{ width: `${stabilityScore}%`, backgroundColor: stabilityFill }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-mutedText">Target baseline</span>
                          <span className="font-bold text-mutedText">50%</span>
                        </div>
                        <div className="w-full bg-borderGray h-1.5 rounded overflow-hidden">
                          <div className="h-full bg-borderGrayLight rounded" style={{ width: '50%' }} />
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-mutedText">
                      {stabilityScore >= 50 
                        ? "✓ Safe. Baseline covers major overhead costs." 
                        : "⚠ High risk. Add newsletters or subscription services."}
                    </div>
                  </div>
                </div>

                {/* Highlighted comparison benchmark insights */}
                {totalEarnings < nicheBenchmark ? (
                  <div className="border border-accentGoldMuted/30 bg-accentGold/5 p-4 rounded-xl flex items-start gap-3">
                    <AlertCircle className="text-accentGoldMuted mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-xs text-mutedText leading-relaxed">
                      You are earning <span className="text-accentGold font-bold">{Math.round(((nicheBenchmark - totalEarnings)/nicheBenchmark)*100)}% below</span> the {niche} creator average benchmark. NEXORA has identified <span className="text-accentGold font-bold">3 opportunities</span> to improve margins in the Intelligence panel.
                    </span>
                  </div>
                ) : (
                  <div className="border border-accentGold/40 bg-accentGold/5 p-4 rounded-xl flex items-start gap-3">
                    <ShieldCheck className="text-accentGold mt-0.5 flex-shrink-0" size={16} />
                    <span className="text-xs text-mutedText leading-relaxed">
                      You are outperforming <span className="text-accentGold font-bold">{Math.round(((totalEarnings - nicheBenchmark)/nicheBenchmark)*100)}% of</span> {niche} creators in India. Secure your baseline stability below to retain value.
                    </span>
                  </div>
                )}
              </div>

              {/* Row 4: Recommended Next Steps */}
              <div className="bg-cardBg border border-borderGray rounded-xl p-6 shadow-sm text-left space-y-6">
                <h3 className="text-base font-bold font-serif text-whiteText">
                  Recommended Action Steps
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Rate Card */}
                  <div className="bg-background border border-borderGray hover:border-accentGold/40 rounded-lg p-5 flex flex-col justify-between gap-4 card-hover-classy-secondary">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-whiteText flex items-center gap-1">
                        <span>📋 Generate Rate Card</span>
                      </h4>
                      <p className="text-[11px] text-mutedText leading-relaxed">
                        Build your brand deal sheet using an optimized +40% pricing structure.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveModal('rateCard')}
                      className="w-full py-2 bg-accentGold/5 hover:bg-accentGold border border-accentGold/30 hover:text-background text-accentGold text-[11px] font-bold rounded transition-all"
                    >
                      Generate Card
                    </button>
                  </div>

                  {/* Diversification */}
                  <div className="bg-background border border-borderGray hover:border-accentGold/40 rounded-lg p-5 flex flex-col justify-between gap-4 card-hover-classy-secondary">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-whiteText flex items-center gap-1">
                        <span>📈 Diversification Plan</span>
                      </h4>
                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        Examine a structured 90-day step-by-step roadmap to reduce concentration risk.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveModal('diversification')}
                      className="w-full py-2 bg-accentGold/5 hover:bg-accentGold border border-accentGold/30 hover:text-background text-accentGold text-[11px] font-bold rounded transition-all"
                    >
                      View Plan
                    </button>
                  </div>

                  {/* Tax liability summary */}
                  <div className="bg-background border border-borderGray hover:border-accentGold/40 rounded-lg p-5 flex flex-col justify-between gap-4 card-hover-classy-secondary">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-whiteText flex items-center gap-1">
                        <span>💰 GST Tax Summary</span>
                      </h4>
                      <p className="text-[11px] text-mutedText leading-relaxed">
                        Estimate monthly GST liability, thresholds, and input credit offset options.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveModal('tax')}
                      className="w-full py-2 bg-accentGold/5 hover:bg-accentGold border border-accentGold/30 hover:text-background text-accentGold text-[11px] font-bold rounded transition-all"
                    >
                      Calculate GST
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset action button */}
              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleResetData}
                  className="px-4 py-2 border border-borderGray hover:bg-[#EF4444]/10 rounded-lg text-xs font-bold text-[#EF4444] transition-colors"
                >
                  Clear Dashboard Data
                </button>
              </div>

            </div>
          )}

          {/* Footer banner */}
          <footer className="py-6 border-t border-borderGray text-center text-xs text-mutedText space-y-1 font-semibold mt-12">
            <p>NEXORA · Built for Hackfluence 2026 · Team LittleHackers</p>
          </footer>
        </div>
      )}

      {/* ===================================================
          MODALS
          =================================================== */}
      {activeModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
          
          <div className="bg-cardBg border border-borderGrayLight rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative p-6 sm:p-8">
            
            {/* Close button X */}
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-mutedText hover:text-whiteText hover:bg-borderGray rounded-full transition-all"
            >
              <X size={16} />
            </button>

            {/* Modal Content details */}
            {activeModal === 'rateCard' && (
              <div className="space-y-6 text-left">
                <div>
                  <h2 className="text-xl font-bold font-serif text-whiteText flex items-center gap-1.5">
                    <span className="text-accentGold">📋</span>
                    <span>{creatorName || 'Creator'}'s Suggested Rate Card</span>
                  </h2>
                  <p className="text-xs text-mutedText mt-1">
                    Baseline rates calculated for {niche} creators, factoring in a +40% optimized margin markup over current deals.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-borderGray">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-cardBgSecondary border-b border-borderGray text-mutedText font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Deliverable Type</th>
                        <th className="py-3 px-4 text-accentGold font-bold">Suggested Rate (₹)</th>
                        <th className="py-3 px-4">Market Valuation Range</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderGray/40 text-mutedText">
                      <tr>
                        <td className="py-3.5 px-4 font-semibold text-whiteText">Instagram Reel (60s)</td>
                        <td className="py-3.5 px-4 font-bold text-accentGold">₹{suggestedReel.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">₹{Math.round(brandDealBase * 1.1).toLocaleString('en-IN')} - ₹{Math.round(brandDealBase * 1.6).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-semibold text-whiteText">Instagram Story (3 slides)</td>
                        <td className="py-3.5 px-4 font-bold text-accentGold">₹{suggestedStory.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">₹{Math.round(brandDealBase * 0.3 * 1.1).toLocaleString('en-IN')} - ₹{Math.round(brandDealBase * 0.5 * 1.6).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-semibold text-whiteText">YouTube Integration (30s)</td>
                        <td className="py-3.5 px-4 font-bold text-accentGold">₹{suggestedYTIntegration.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">₹{Math.round(brandDealBase * 1.2 * 1.1).toLocaleString('en-IN')} - ₹{Math.round(brandDealBase * 1.8 * 1.6).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-semibold text-whiteText">YouTube Dedicated (8-12min)</td>
                        <td className="py-3.5 px-4 font-bold text-accentGold">₹{suggestedYTDedicated.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">₹{Math.round(brandDealBase * 2.5 * 1.1).toLocaleString('en-IN')} - ₹{Math.round(brandDealBase * 3.5 * 1.6).toLocaleString('en-IN')}</td>
                      </tr>
                      <tr>
                        <td className="py-3.5 px-4 font-semibold text-whiteText">LinkedIn Post</td>
                        <td className="py-3.5 px-4 font-bold text-accentGold">₹{suggestedLinkedIn.toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">₹{Math.round(brandDealBase * 0.5 * 1.1).toLocaleString('en-IN')} - ₹{Math.round(brandDealBase * 0.7 * 1.6).toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-background border border-borderGray p-4 rounded-lg text-xs text-mutedText">
                  ℹ <span className="font-semibold text-whiteText">Variable factors:</span> Rates should be adjusted based on content complexity, usage rights, exclusivity clauses, and current conversion metrics.
                </div>
              </div>
            )}

            {activeModal === 'diversification' && (
              <div className="space-y-6 text-left">
                <div>
                  <h2 className="text-xl font-bold font-serif text-whiteText flex items-center gap-1.5">
                    <span className="text-accentGold">📈</span>
                    <span>Your 90-Day Diversification Plan</span>
                  </h2>
                  <p className="text-xs text-mutedText mt-1">
                    Structured roadmap designed to stabilize volatile payouts and hedge contract cancellation risk.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4 items-start bg-borderGray/40 border border-borderGray rounded-lg p-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accentGold text-background flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-whiteText">Month 1 — Expand Affiliate Revenues</h4>
                      <p className="text-[11px] text-mutedText leading-relaxed">
                        {affiliatePct < 20 
                          ? `Your affiliate contribution is at ${affiliatePct.toFixed(1)}%. We recommend identifying 8 high-ticket affiliate products to display in description footers. At a benchmark 2% conversion rate, this adds an estimated ₹20,000/month.` 
                          : `Great affiliate coverage (${affiliatePct.toFixed(1)}%). Optimize link setups using centralized redirects to maximize product discoverability.`}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 items-start bg-borderGray/40 border border-borderGray rounded-lg p-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accentGoldMuted text-background flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-whiteText">Month 2 — Launch Recurring Subscriptions</h4>
                      <p className="text-[11px] text-mutedText leading-relaxed">
                        {recurringIncome === 0 
                          ? "Establish a newsletters (Substack) or digital fan-tier community at ₹199/month. onboarding 200 dedicated subscribers secures a ₹39,800/month stable cash floor."
                          : `Your recurring baseline is ₹${recurringIncome.toLocaleString('en-IN')}/month. Scale this by adding a premium workshop tier at ₹499/month, targeting 50 new VIP enrollments (adding ₹24,950).`}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 items-start bg-borderGray/40 border border-borderGray rounded-lg p-4">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-borderGrayLight text-whiteText flex items-center justify-center font-bold text-xs">
                      3
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-whiteText">Month 3 — Build Outbound Pipelines</h4>
                      <p className="text-[11px] text-mutedText leading-relaxed">
                        Consolidate a premium media kit listing engagement stats and pitch 5 niche-aligned brands weekly. Reduce reliance on random inbound deals. Standardize Reel pricing sheets using the optimized benchmark rate of <span className="font-bold text-accentGold">₹{suggestedReel.toLocaleString('en-IN')} per reel</span>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'tax' && (
              <div className="space-y-6 text-left">
                <div>
                  <h2 className="text-xl font-bold font-serif text-whiteText flex items-center gap-1.5">
                    <span className="text-accentGold">💰</span>
                    <span>GST Liability & Tax Estimation</span>
                  </h2>
                  <p className="text-xs text-mutedText mt-1">
                    Evaluated based on standard Indian Income tax thresholds and GST frameworks.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Profile stats */}
                  <div className="bg-background border border-borderGray rounded-lg p-4 space-y-2">
                    <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider block">Receipt Profile</span>
                    <div className="space-y-1.5 text-xs text-whiteText">
                      <div className="flex justify-between border-b border-borderGray/50 pb-1">
                        <span>Monthly Income:</span>
                        <span className="font-semibold">₹{totalEarnings.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-b border-borderGray/50 pb-1">
                        <span>Projected Annual:</span>
                        <span className="font-semibold text-accentGold">₹{(totalEarnings * 12).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GST Obligation:</span>
                        <span className="font-semibold text-accentGoldMuted">
                          {totalEarnings * 12 >= 2000000 ? "Liable for GST (>20L)" : "Exempt (<20L)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calculations */}
                  <div className="bg-background border border-borderGray rounded-lg p-4 space-y-2">
                    <span className="text-[10px] font-bold text-mutedText uppercase tracking-wider block">Estimated Monthly GST</span>
                    <div className="space-y-1.5 text-xs text-whiteText">
                      <div className="flex justify-between border-b border-borderGray/50 pb-1">
                        <span>GST Liability (18% on deals):</span>
                        <span>₹{Math.round(brandDealIncome * 0.18).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between border-b border-borderGray/50 pb-1">
                        <span>Input Tax Credits (15% offset):</span>
                        <span className="text-accentGold">-₹{Math.round(brandDealIncome * 0.18 * 0.15).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-bold text-accentGold">
                        <span>Estimated Net GST:</span>
                        <span>₹{Math.round(brandDealIncome * 0.18 * 0.85).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-cardBgSecondary/30 border border-borderGray p-4 rounded-lg text-xs text-mutedText space-y-2">
                  <div className="font-semibold text-whiteText flex items-center gap-1.5">
                    <Info size={14} className="text-accentGoldMuted" />
                    <span>Indian GST Regulations:</span>
                  </div>
                  <p className="leading-relaxed">
                    GST registration is mandatory for service providers in India once annual revenues exceed ₹20 Lakhs. Under Section 194S/194M, 1% TDS payouts also apply. Offsetting expenses (hardware gear, server hosting, editors, coworking rental) allows claiming Input Tax Credits to minimize tax burdens.
                  </p>
                </div>
              </div>
            )}

            {/* Modal footer Close button */}
            <div className="mt-8 pt-4 border-t border-borderGray flex justify-end">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-6 py-2 bg-accentGold hover:bg-opacity-95 text-background font-bold text-xs rounded transition-all"
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
