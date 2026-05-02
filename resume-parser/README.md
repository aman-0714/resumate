# Resume Upload & Parsing Service

Production-ready Node.js API that accepts PDF and DOCX resumes, extracts clean plain text, and returns structured JSON ready for AI analysis.

---

## Project Structure

```
resume-parser/
├── app.js                  # Express entry point & server bootstrap
├── package.json
├── middleware/
│   └── upload.js           # Multer config (memoryStorage, file filter, size limit)
├── routes/
│   └── resume.js           # POST /api/resume/upload route
└── utils/
    └── parser.js           # PDF (pdf-parse) & DOCX (mammoth) extractors + text cleaner
```

---

## Setup

```bash
npm install
npm start          # production
npm run dev        # development (nodemon auto-reload)
```

Server starts on **http://localhost:3000** (override with `PORT` env var).

---

## API

### `POST /api/resume/upload`

**Content-Type:** `multipart/form-data`  
**Field name:** `file`  
**Accepted types:** `.pdf`, `.docx`  
**Max size:** 5 MB

#### Success `200`
```json
{
  "success": true,
  "data": {
    "fileName": "resume.pdf",
    "mimeType": "application/pdf",
    "fileSizeBytes": 98304,
    "wordCount": 412,
    "charCount": 2650,
    "text": "John Doe\njohn@example.com\n\nExperience\nSoftware Engineer at Acme Corp..."
  }
}
```

#### Errors

| Scenario | Status | `error` message |
|---|---|---|
| No file attached | 400 | No file uploaded... |
| Wrong file type | 415 | Unsupported file type... |
| File > 5 MB | 413 | File is too large... |
| Corrupt / unreadable file | 422 | PDF/DOCX parsing failed... |
| Empty file | 422 | Could not extract any readable text... |

---

## curl Examples

```bash
# Upload a PDF
curl -X POST http://localhost:3000/api/resume/upload \
  -F "file=@/path/to/resume.pdf"

# Upload a DOCX
curl -X POST http://localhost:3000/api/resume/upload \
  -F "file=@/path/to/resume.docx"

# Health check
curl http://localhost:3000/health
```

---

## AI Integration

The `data.text` field is clean, normalized plain text - pipe it directly into any LLM prompt:

```js
const { data } = await fetch("/api/resume/upload", { method: "POST", body: formData })
  .then(r => r.json());

// Pass to Claude / OpenAI
const analysis = await anthropic.messages.create({
  model: "claude-opus-4-5",
  messages: [{ role: "user", content: `Analyze this resume:\n\n${data.text}` }]
});
```

Use `data.wordCount` / `data.charCount` for token-budget decisions before sending to an LLM.
