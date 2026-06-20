import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import Papa from 'papaparse';
import Tesseract from 'tesseract.js';
import { 
  insertIncome, 
  getSummaryByCreator, 
  getIncomeByCreator 
} from '../services/db.js';
import { 
  fuzzyMapCategory, 
  extractTextDataLocal 
} from '../services/extraction.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 1. Manual Entry Ingestion Route
// POST /api/income/manual
router.post('/manual', async (req, res) => {
  try {
    const { creatorId, streamType, amount, month, source, date } = req.body;

    if (!creatorId || !streamType || !amount || !month) {
      return res.status(400).json({ error: 'Missing required manual entry fields: creatorId, streamType, amount, month' });
    }

    const savedRecord = await insertIncome({
      creatorId,
      streamType,
      amount,
      month,
      source,
      date,
      needsReview: false,
      confidence: 1.0
    });

    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. CSV Upload Ingestion Route (Fuzzy synonym mapping)
// POST /api/income/csv-upload
router.post('/csv-upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No CSV file uploaded' });
  }

  const creatorId = req.body.creatorId || 'creator_1';
  const tempPath = req.file.path;

  try {
    const csvContent = await fs.readFile(tempPath, 'utf-8');
    const parsedCsv = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

    let rowsProcessed = 0;
    let rowsFailed = 0;
    let totalAmountImported = 0;
    const importedRecords = [];

    for (const row of parsedCsv.data) {
      const { date, source, amount, category } = row;
      const parsedAmount = parseFloat(amount);

      // Perform local fuzzy category mapping using string-similarity synonyms
      const mappedStreamType = fuzzyMapCategory(category);

      let month = null;
      if (date && date.includes('-')) {
        month = date.split('-').slice(0, 2).join('-');
      } else {
        month = new Date().toISOString().split('T')[0].substring(0, 7);
      }

      if (mappedStreamType && !isNaN(parsedAmount) && parsedAmount >= 0) {
        try {
          const record = await insertIncome({
            creatorId,
            streamType: mappedStreamType,
            amount: parsedAmount,
            month,
            source: source || 'CSV Import',
            date: date || new Date().toISOString().split('T')[0],
            needsReview: false,
            confidence: 1.0
          });

          totalAmountImported += parsedAmount;
          rowsProcessed++;
          importedRecords.push(record);
        } catch (err) {
          console.error('Failed to insert CSV row:', err.message);
          rowsFailed++;
        }
      } else {
        rowsFailed++;
      }
    }

    res.json({
      message: 'CSV processing complete',
      summary: {
        rowsProcessed,
        rowsFailed,
        totalAmountImported
      },
      records: importedRecords
    });

  } catch (error) {
    res.status(500).json({ error: 'CSV file parsing error: ' + error.message });
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch (unlinkErr) {
      console.warn('Could not clean up temporary CSV file:', unlinkErr.message);
    }
  }
});

// 3. Email Webhook Ingestion Route (NLP + Regex rules)
// POST /api/income/email-webhook
router.post('/email-webhook', async (req, res) => {
  try {
    const { from, subject, bodyText, creatorId = 'creator_1' } = req.body;

    if (!bodyText) {
      return res.status(400).json({ error: 'Missing email bodyText content' });
    }

    console.log(`Analyzing inbound email from: ${from}...`);
    
    // Call our 100% offline rule-based extractor
    const extraction = extractTextDataLocal(bodyText, from);

    // Determine target month from extraction date
    let month = new Date().toISOString().split('T')[0].substring(0, 7);
    if (extraction.date && extraction.date.includes('-')) {
      month = extraction.date.split('-').slice(0, 2).join('-');
    }

    const savedRecord = await insertIncome({
      creatorId,
      streamType: extraction.category,
      amount: extraction.amount,
      month,
      source: extraction.source || 'Email Webhook',
      date: extraction.date,
      needsReview: extraction.needsReview,
      confidence: extraction.confidence
    });

    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse inbound email webhook: ' + error.message });
  }
});

// 4. Screenshot Upload Ingestion Route (Local WebAssembly OCR via Tesseract.js)
// POST /api/income/screenshot
router.post('/screenshot', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const creatorId = req.body.creatorId || 'creator_1';
  const tempPath = req.file.path;

  try {
    console.log('Running local WebAssembly OCR using Tesseract.js...');
    const ocrResult = await Tesseract.recognize(tempPath, 'eng');
    const rawOcrText = ocrResult.data.text;
    console.log('Successfully completed OCR extraction. Raw text length:', rawOcrText.length);

    // Apply same rule-based extraction logic to raw OCR text
    const extraction = extractTextDataLocal(rawOcrText);

    let month = new Date().toISOString().split('T')[0].substring(0, 7);
    if (extraction.date && extraction.date.includes('-')) {
      month = extraction.date.split('-').slice(0, 2).join('-');
    }

    // If no confident amount is found, flag it
    if (extraction.amount <= 0) {
      extraction.needsReview = true;
    }

    const savedRecord = await insertIncome({
      creatorId,
      streamType: extraction.category,
      amount: extraction.amount,
      month,
      source: extraction.source || 'OCR Extraction',
      date: extraction.date,
      needsReview: extraction.needsReview,
      confidence: extraction.confidence
    });

    // Attach raw OCR text if review is flagged
    if (savedRecord.needsReview) {
      savedRecord.rawOcrText = rawOcrText;
    }

    res.status(201).json(savedRecord);
  } catch (error) {
    res.status(500).json({ error: 'Local OCR parsing failed: ' + error.message });
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch (unlinkErr) {
      console.warn('Could not clean up temporary image file:', unlinkErr.message);
    }
  }
});

// 5. Aggregate Summary Route
// GET /api/income/:creatorId/summary
router.get('/:creatorId/summary', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const summary = await getSummaryByCreator(creatorId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Debug helper to retrieve raw streams
router.get('/:creatorId/raw', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const records = await getIncomeByCreator(creatorId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
