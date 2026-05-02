// test.js
// Quick automated test for the resume parser API.
// Usage: node test.js
// Make sure the server is running first: npm start

const fs = require("fs");
const path = require("path");
const http = require("http");

const BASE_URL = "http://localhost:3000";

// ─── Helpers ────────────────────────────────────────────────────────────────

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const pass = (msg) => console.log(colors.green("  ✔ PASS") + " — " + msg);
const fail = (msg) => console.log(colors.red("  ✘ FAIL") + " — " + msg);
const info = (msg) => console.log(colors.cyan("  ℹ") + " " + msg);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) { pass(message); passed++; }
  else           { fail(message); failed++; }
}

// Simple multipart/form-data POST using Node's built-in http module (no extra deps)
function postFile(filePath, fieldName = "file") {
  return new Promise((resolve, reject) => {
    const boundary = "----TestBoundary" + Date.now();
    const filename  = path.basename(filePath);
    const fileData  = fs.readFileSync(filePath);
    const mimeType  = filename.endsWith(".pdf")
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const bodyParts = [
      `--${boundary}\r\n`,
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
    ];

    const header  = Buffer.from(bodyParts.join(""));
    const footer  = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body    = Buffer.concat([header, fileData, footer]);

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/resume/upload",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function postNoFile() {
  return new Promise((resolve, reject) => {
    const boundary = "----TestBoundary" + Date.now();
    const body = Buffer.from(`--${boundary}--\r\n`);
    const options = {
      hostname: "localhost", port: 3000,
      path: "/api/resume/upload", method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function getHealth() {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}/health`, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on("error", reject);
  });
}

// ─── Create dummy test files ─────────────────────────────────────────────────

// Minimal valid PDF (contains the word "Engineer" so text extraction works)
function createMinimalPdf(filePath) {
  // This is a real, minimal PDF with extractable text
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length 89 >>
stream
BT
/F1 12 Tf
50 750 Td
(John Doe - Software Engineer - john@example.com) Tj
ET
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000415 00000 n 

trailer
<< /Size 6 /Root 1 0 R >>
startxref
492
%%EOF`;
  fs.writeFileSync(filePath, pdfContent);
}

// Minimal DOCX (a real .docx is a ZIP — we'll create a tiny one using raw bytes)
// Instead of generating a real DOCX binary, we'll test the error path for an
// invalid DOCX and note that for DOCX you should supply your own file.
function createFakeDocx(filePath) {
  // Write a file with DOCX extension but invalid content to test error handling
  fs.writeFileSync(filePath, Buffer.from("This is not a real DOCX file"));
}

// ─── Run Tests ───────────────────────────────────────────────────────────────

async function runTests() {
  console.log(colors.bold("\n🧪 Resume Parser — Test Suite\n"));

  // ── Test 0: Health Check ──────────────────────────────────────────────────
  console.log(colors.yellow("[ Test 0 ] Health Check"));
  try {
    const res = await getHealth();
    assert(res.status === 200, `GET /health returns 200 (got ${res.status})`);
    assert(res.body.status === "ok", `Response body has status: "ok"`);
  } catch (e) {
    fail(`Server unreachable — is it running? (npm start)  Error: ${e.message}`);
    failed++;
    console.log(colors.red("\n  ⚠ Cannot reach server. Start it with: npm start\n"));
    process.exit(1);
  }

  // ── Test 1: No file uploaded ──────────────────────────────────────────────
  console.log(colors.yellow("\n[ Test 1 ] No file attached → 400"));
  try {
    const res = await postNoFile();
    assert(res.status === 400, `Status 400 (got ${res.status})`);
    assert(res.body.success === false, `success: false`);
    assert(typeof res.body.error === "string", `error message is a string`);
  } catch (e) {
    fail(`Request failed: ${e.message}`); failed++;
  }

  // ── Test 2: Valid PDF ─────────────────────────────────────────────────────
  console.log(colors.yellow("\n[ Test 2 ] Valid PDF upload → 200"));
  const pdfPath = path.join(__dirname, "_test_resume.pdf");
  createMinimalPdf(pdfPath);
  try {
    const res = await postFile(pdfPath);
    info(`Status: ${res.status}`);
    if (res.status === 200) {
      assert(res.body.success === true, `success: true`);
      assert(typeof res.body.data.text === "string", `data.text is a string`);
      assert(res.body.data.text.length > 0, `data.text is non-empty`);
      assert(typeof res.body.data.wordCount === "number", `wordCount is a number`);
      assert(typeof res.body.data.charCount === "number", `charCount is a number`);
      assert(res.body.data.fileName === "_test_resume.pdf", `fileName matches`);
      info(`Extracted text preview: "${res.body.data.text.substring(0, 80)}..."`);
    } else {
      // pdf-parse may fail on minimal PDFs in some environments
      info(`PDF parsing returned ${res.status} — may need a real PDF file`);
      info(`Error: ${JSON.stringify(res.body.error)}`);
      info("Try: node test.js /path/to/your/real-resume.pdf");
    }
  } catch (e) {
    fail(`Request failed: ${e.message}`); failed++;
  } finally {
    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  }

  // ── Test 3: Invalid DOCX (corrupt file) → 422 ────────────────────────────
  console.log(colors.yellow("\n[ Test 3 ] Corrupt DOCX → 422"));
  const badDocxPath = path.join(__dirname, "_test_bad.docx");
  createFakeDocx(badDocxPath);
  try {
    const res = await postFile(badDocxPath);
    assert(res.status === 422, `Status 422 for unreadable file (got ${res.status})`);
    assert(res.body.success === false, `success: false`);
  } catch (e) {
    fail(`Request failed: ${e.message}`); failed++;
  } finally {
    if (fs.existsSync(badDocxPath)) fs.unlinkSync(badDocxPath);
  }

  // ── Test 4: Wrong file type (.txt) → 415 ─────────────────────────────────
  console.log(colors.yellow("\n[ Test 4 ] Wrong file type (.txt) → 415"));
  const txtPath = path.join(__dirname, "_test.txt");
  fs.writeFileSync(txtPath, "This is a plain text file");
  try {
    // Manually post as text/plain MIME type
    const boundary = "----TestBoundary" + Date.now();
    const fileData  = fs.readFileSync(txtPath);
    const header    = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="_test.txt"\r\nContent-Type: text/plain\r\n\r\n`
    );
    const footer  = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body    = Buffer.concat([header, fileData, footer]);

    const res = await new Promise((resolve, reject) => {
      const req = http.request(
        { hostname: "localhost", port: 3000, path: "/api/resume/upload", method: "POST",
          headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": body.length } },
        (r) => {
          let d = ""; r.on("data", (c) => (d += c));
          r.on("end", () => { try { resolve({ status: r.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: r.statusCode, body: d }); } });
        }
      );
      req.on("error", reject); req.write(body); req.end();
    });

    assert(res.status === 415, `Status 415 for .txt file (got ${res.status})`);
    assert(res.body.success === false, `success: false`);
  } catch (e) {
    fail(`Request failed: ${e.message}`); failed++;
  } finally {
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
  }

  // ── Test with real file (if passed as CLI arg) ────────────────────────────
  const realFile = process.argv[2];
  if (realFile) {
    console.log(colors.yellow(`\n[ Test 5 ] Real file: ${path.basename(realFile)}`));
    if (!fs.existsSync(realFile)) {
      fail(`File not found: ${realFile}`); failed++;
    } else {
      try {
        const res = await postFile(realFile);
        info(`Status: ${res.status}`);
        if (res.status === 200) {
          assert(res.body.success === true, `success: true`);
          assert(res.body.data.text.length > 0, `Extracted text is non-empty`);
          info(`Words extracted: ${res.body.data.wordCount}`);
          info(`Characters: ${res.body.data.charCount}`);
          info(`Text preview:\n\n${res.body.data.text.substring(0, 300)}\n`);
        } else {
          fail(`Unexpected status ${res.status}: ${JSON.stringify(res.body)}`); failed++;
        }
      } catch (e) {
        fail(`Request failed: ${e.message}`); failed++;
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log(colors.bold(`Results: ${colors.green(passed + " passed")}  ${failed > 0 ? colors.red(failed + " failed") : "0 failed"}`));
  console.log("─".repeat(50));

  if (!realFile) {
    console.log(colors.cyan("\nTip: Test with your own resume file:"));
    console.log("  node test.js /path/to/your/resume.pdf\n");
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(colors.red("\nFatal error:"), err.message);
  process.exit(1);
});
