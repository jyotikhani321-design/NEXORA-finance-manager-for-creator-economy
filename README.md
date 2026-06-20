# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

---

# 🚀 NEXORA Hackathon Backend Server

This project now contains a complete Node.js + Express backend designed for hackathon prototyping, enabling content creators to aggregate their income from multiple sources and generate AI-powered optimization recommendations.

## 📂 File Structure
* **`server/server.js`**: Server configuration, mounts endpoints, seeds database.
* **`server/routes/income.js`**: Ingestion API handlers (Manual, CSV upload, Inbound Email Webhook, Vision Screenshot OCR).
* **`server/routes/recommendations.js`**: Advisor engine carrying out MoM analytics and Claude recommendations.
* **`server/services/db.js`**: Lightweight file-based database store with aggregate capabilities.
* **`server/services/aiExtraction.js`**: Anthropic Claude API interactions for OCR, LLM extraction, and advisor advice.

## 📡 API Endpoints

### 1. Manual Entry Ingestion
* **POST `/api/income/manual`**: Accepts `{ creatorId, streamType, amount, month, source }` and stores record.

### 2. CSV File Ingestion
* **POST `/api/income/csv-upload`**: Accepts multi-part file upload, parses fields, and maps category labels to standard streams with fuzzy matching.

### 3. Email Inbound Ingestion
* **POST `/api/income/email-webhook`**: Accepts `{ from, subject, bodyText }`, extracts values using Regex, and falls back to Claude LLM structured extraction if confidence is low.

### 4. Vision OCR Screenshot Ingestion
* **POST `/api/income/screenshot`**: Accepts screenshot image upload, converts to base64, and calls vision-enabled Claude API to extract payment metrics.

### 5. AI Advisor Engine
* **GET `/api/recommendations/:creatorId`**: Groups records, computes total income, percentages, MoM percentage changes, and returns exactly 3 structured recommendations from Claude with retries.

### 6. Charting Summaries
* **GET `/api/income/:creatorId/summary`**: Aggregates total earnings per stream type.

---

## 🏃 Running the Server Locally

### 1. Set Environment Variables
Create a file named `.env` in the `server` folder:
```env
PORT=5000
ANTHROPIC_API_KEY=your-api-key-here
```

### 2. Install Server Dependencies
```bash
cd server
npm install
```

### 3. Run Backend Server
From the root directory of the project, run:
```bash
npm run server
```
*The server will boot up and seed itself automatically with 10 fake income records for `creator_1`.*

### 4. Run Frontend Server
In a separate terminal window from the root directory, run:
```bash
npm run dev
```

