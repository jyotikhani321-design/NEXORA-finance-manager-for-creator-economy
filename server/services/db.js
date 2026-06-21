import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'nexora.sqlite');

// Open connection to SQLite file-based database
const db = new sqlite3.Database(DB_PATH);

// Supported stream types list
export const ALLOWED_STREAMS = ["brand_deal", "adsense", "affiliate", "subscription", "merch"];

// Helper to run query asynchronously (run)
export function queryRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this); // returns 'lastID' and 'changes'
    });
  });
}

// Helper to query all records (all)
export function queryAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper to query single row (get)
export function queryGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Initialize SQLite database schema
export async function initDb() {
  await queryRun(`
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      creatorId TEXT,
      streamType TEXT,
      amount REAL,
      month TEXT,
      source TEXT,
      date TEXT,
      needsReview INTEGER DEFAULT 0,
      confidence REAL DEFAULT 1.0
    )
  `);

  await queryRun(`
    CREATE TABLE IF NOT EXISTS creators (
      creatorId TEXT PRIMARY KEY,
      creatorName TEXT,
      niche TEXT,
      incomeStreams TEXT -- Stored as JSON string
    )
  `);

  await queryRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      displayName TEXT,
      niche TEXT
    )
  `);
}

// Get all income records for a creator
export async function getIncomeByCreator(creatorId) {
  const rows = await queryAll(`
    SELECT * FROM income WHERE creatorId = ?
  `, [String(creatorId)]);
  
  return rows.map(r => ({
    ...r,
    needsReview: r.needsReview === 1
  }));
}

// Insert single income record
export async function insertIncome(record) {
  const { creatorId, streamType, amount, month, source, date, needsReview, confidence } = record;

  if (!creatorId) throw new Error('creatorId is required');
  if (!streamType) throw new Error('streamType is required');
  
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount < 0) {
    throw new Error('amount must be a valid positive number');
  }
  if (!month) throw new Error('month is required');

  const id = `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const needsReviewInt = needsReview === true ? 1 : 0;
  const confidenceVal = typeof confidence === 'number' ? confidence : 1.0;

  await queryRun(`
    INSERT INTO income (id, creatorId, streamType, amount, month, source, date, needsReview, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    String(creatorId),
    streamType,
    numericAmount,
    month,
    source || 'Manual Input',
    date || new Date().toISOString().split('T')[0],
    needsReviewInt,
    confidenceVal
  ]);

  return {
    id,
    creatorId: String(creatorId),
    streamType,
    amount: numericAmount,
    month,
    source: source || 'Manual Input',
    date: date || new Date().toISOString().split('T')[0],
    needsReview: needsReview === true,
    confidence: confidenceVal
  };
}

// Aggregate totals per stream type for summary charting
export async function getSummaryByCreator(creatorId) {
  const rows = await queryAll(`
    SELECT streamType, SUM(amount) as total 
    FROM income 
    WHERE creatorId = ? 
    GROUP BY streamType
  `, [String(creatorId)]);

  const totals = {
    brand_deal: 0,
    adsense: 0,
    affiliate: 0,
    subscription: 0,
    merch: 0
  };

  for (const r of rows) {
    if (totals[r.streamType] !== undefined) {
      totals[r.streamType] = r.total;
    }
  }

  const totalOverall = Object.values(totals).reduce((sum, val) => sum + val, 0);

  return {
    creatorId,
    totals,
    totalOverall
  };
}

// Creator profile helpers for original React UI backwards compatibility
export async function getCreatorProfile(creatorId) {
  const row = await queryGet(`
    SELECT * FROM creators WHERE creatorId = ?
  `, [String(creatorId)]);

  if (row) {
    return {
      creatorName: row.creatorName,
      niche: row.niche,
      incomeStreams: JSON.parse(row.incomeStreams || '[]')
    };
  }

  return { creatorName: '', niche: 'Tech', incomeStreams: [] };
}

export async function saveCreatorProfile(creatorId, profileData) {
  const { creatorName, niche, incomeStreams } = profileData;
  const streamsJson = JSON.stringify(incomeStreams || []);

  const exists = await queryGet(`SELECT creatorId FROM creators WHERE creatorId = ?`, [String(creatorId)]);

  if (exists) {
    await queryRun(`
      UPDATE creators 
      SET creatorName = ?, niche = ?, incomeStreams = ? 
      WHERE creatorId = ?
    `, [creatorName, niche, streamsJson, String(creatorId)]);
  } else {
    await queryRun(`
      INSERT INTO creators (creatorId, creatorName, niche, incomeStreams) 
      VALUES (?, ?, ?, ?)
    `, [String(creatorId), creatorName, niche, streamsJson]);
  }

  return { creatorName, niche, incomeStreams };
}

// Seed the database with fake income records if table has 0 records
export async function seedIfEmpty() {
  const check = await queryGet(`SELECT COUNT(*) as count FROM income`);
  
  if (check && check.count > 0) {
    console.log('SQLite database already contains records. Skipping seed step.');
    return;
  }

  console.log('Seeding SQLite database with 12 mock income records for "creator_1"...');

  const seedRecords = [
    // Month 1: April 2026
    { creatorId: "creator_1", streamType: "adsense", amount: 15000, month: "2026-04", source: "YouTube Partner Program", date: "2026-04-15" },
    { creatorId: "creator_1", streamType: "brand_deal", amount: 80000, month: "2026-04", source: "Vite Sponsor LLC", date: "2026-04-18" },
    { creatorId: "creator_1", streamType: "affiliate", amount: 10000, month: "2026-04", source: "Amazon Associates", date: "2026-04-20" },
    { creatorId: "creator_1", streamType: "subscription", amount: 5000, month: "2026-04", source: "Patreon Supporters", date: "2026-04-25" },
    { creatorId: "creator_1", streamType: "merch", amount: 10000, month: "2026-04", source: "Creator Merch Shop", date: "2026-04-28" },

    // Month 2: May 2026 (triggers Growth Momentum consecutive M1->M2 check)
    { creatorId: "creator_1", streamType: "adsense", amount: 19000, month: "2026-05", source: "YouTube Partner Program", date: "2026-05-15" },
    { creatorId: "creator_1", streamType: "brand_deal", amount: 50000, month: "2026-05", source: "Aero Sponsors", date: "2026-05-17" },
    { creatorId: "creator_1", streamType: "affiliate", amount: 8000, month: "2026-05", source: "Amazon Associates", date: "2026-05-20" },
    { creatorId: "creator_1", streamType: "subscription", amount: 12000, month: "2026-05", source: "Patreon Supporters", date: "2026-05-24" },
    { creatorId: "creator_1", streamType: "merch", amount: 15000, month: "2026-05", source: "Creator Merch Shop", date: "2026-05-29" },

    // Month 3: June 2026 (trigers Concentration Risk, Decline, Underutilized Affiliate, and Momentum checks)
    { creatorId: "creator_1", streamType: "adsense", amount: 25000, month: "2026-06", source: "YouTube Partner Program", date: "2026-06-15" }, // Grew 26.6% in May, and 31.5% in June (momentum check!)
    { creatorId: "creator_1", streamType: "brand_deal", amount: 65000, month: "2026-06", source: "Octocat Branding", date: "2026-06-17" }, // Exceeds 60% of total June (overall total 100,000 -> 65% concentration!)
    { creatorId: "creator_1", streamType: "affiliate", amount: 5000, month: "2026-06", source: "Amazon Associates", date: "2026-06-20" }, // Affiliate < 10% share (5%), while brand_deal and adsense both > 20% (underutilized check!)
    { creatorId: "creator_1", streamType: "merch", amount: 5000, month: "2026-06", source: "Creator Merch Shop", date: "2026-06-28" } // Merch dropped from 15,000 in May to 5,000 in June (66.6% decline check!)
  ];

  for (const r of seedRecords) {
    const id = `inc_seed_${Math.random().toString(36).substr(2, 9)}`;
    await queryRun(`
      INSERT INTO income (id, creatorId, streamType, amount, month, source, date, needsReview, confidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, r.creatorId, r.streamType, r.amount, r.month, r.source, r.date, 0, 1.0]);
  }

  // Seed default backwards-compatible UI profile
  await saveCreatorProfile('creator_1', {
    creatorName: "Priya Sharma",
    niche: "Tech",
    incomeStreams: [
      { id: "1", platform: "YouTube AdSense", earnings: "25000", hours: "20" },
      { id: "2", platform: "Instagram Brand Deal", earnings: "65000", hours: "15" },
      { id: "3", platform: "Amazon Affiliate", earnings: "5000", hours: "5" },
      { id: "4", platform: "Creator Merch Shop", earnings: "5000", hours: "3" }
    ]
  });

  console.log('SQLite database seed completed successfully.');
}

// ==========================================
// AUTHENTICATION UTILITY FUNCTIONS
// ==========================================

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function getUserByEmail(email) {
  return await queryGet(`
    SELECT * FROM users WHERE email = ?
  `, [String(email).toLowerCase().trim()]);
}

export async function createUser(email, password, displayName, niche) {
  const hashedPassword = hashPassword(password);
  const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const normalizedEmail = String(email).toLowerCase().trim();

  await queryRun(`
    INSERT INTO users (id, email, password, displayName, niche)
    VALUES (?, ?, ?, ?, ?)
  `, [id, normalizedEmail, hashedPassword, displayName, niche]);

  return {
    id,
    email: normalizedEmail,
    displayName,
    niche
  };
}

export async function getUserById(id) {
  return await queryGet(`
    SELECT id, email, displayName, niche FROM users WHERE id = ?
  `, [String(id)]);
}

