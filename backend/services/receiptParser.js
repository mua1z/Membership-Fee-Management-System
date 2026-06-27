const https = require('https');
const http = require('http');

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    };
    const req = client.request(options, (res) => {
      const chunks = [];
      const contentType = (res.headers['content-type'] || '').toLowerCase();
      res.on('data', (chunk) => { chunks.push(chunk); });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          const buffer = Buffer.concat(chunks);
          resolve({ buffer, contentType, statusCode: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function extractPdfText(buffer) {
  const textParts = [];
  const content = buffer.toString('latin1');
  const streamMatches = content.match(/stream\s*[\s\S]*?endstream/g) || [];
  for (const stream of streamMatches) {
    const parenMatches = stream.match(/\(([^)]*)\)/g) || [];
    for (const pm of parenMatches) {
      const txt = pm.slice(1, -1)
        .replace(/\\(.)/g, '$1')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .trim();
      if (txt.length > 2) textParts.push(txt);
    }
  }
  return textParts.join('\n');
}

function extractByPatterns(text, patterns) {
  const result = {};
  for (const { key, regex, transform } of patterns) {
    const match = text.match(regex);
    if (match) {
      let val = match[1].trim();
      if (transform) val = transform(val);
      result[key] = val;
    }
  }
  return result;
}

function parseTelebirrReceipt(html) {
  const base = extractByPatterns(html, [
    { key: 'transactionId', regex: /(?:Receipt|Receipt\s*No|Receipt\s*#|Reference|Transaction|Tran|Ref)\s*(?:ID|#|Number|No|Ref)?\s*[:=]\s*([^\s<,;"]+)/i },
    { key: 'amount', regex: /(?:Amount|Total|Sum|Paid|Payment)\s*[:=]\s*(?:ETB|Birr|Br)?\s*([0-9,]+\.?[0-9]*)/i, transform: (v) => parseFloat(v.replace(/,/g, '')) },
    { key: 'status', regex: /(?:Status|State|Result)\s*[:=]\s*(\w+)/i, transform: (v) => v.toUpperCase() },
    { key: 'date', regex: /(?:Date|Time|Created|Paid\s*(?:On|At|Date)?|Transaction\s*Date)\s*[:=]\s*([^\n<,;"]+)/i },
    { key: 'payer', regex: /(?:From|Sender|Payer|Paid\s*(?:By|From)|Sender\s*Name)\s*[:=]\s*([^<\n]+)/i },
    { key: 'receiver', regex: /(?:To|Receiver|Beneficiary|Recipient|Paid\s*To|Receiver\s*Name)\s*[:=]\s*([^<\n]+)/i },
  ]);
  return { ...base, provider: 'telebirr' };
}

function parseCbeReceipt(text) {
  const base = extractByPatterns(text, [
    { key: 'transactionId', regex: /(?:Transaction|Tran|Ref|FT|Reference)\s*(?:ID|#|Number|No|Ref)?\s*[:=]\s*([A-Z0-9]+)/i },
    { key: 'transactionId', regex: /\b(FT\d{5,}[A-Z0-9]{2,})\b/i },
    { key: 'amount', regex: /(?:Amount|Total|Sum|Paid|Debit|Credit)\s*[:=]\s*(?:ETB|Birr|Br)?\s*([0-9,]+\.?[0-9]*)/i, transform: (v) => parseFloat(v.replace(/,/g, '')) },
    { key: 'amount', regex: /(?:Total\s*Amount|Amount\s*in\s*Figures)\s*[:=]\s*(?:ETB|Birr|Br)?\s*([0-9,]+\.?[0-9]*)/i, transform: (v) => parseFloat(v.replace(/,/g, '')) },
    { key: 'date', regex: /(?:Date|Time|Payment\s*Date|Transaction\s*Date|Value\s*Date)\s*[:=]\s*([^\n]+)/i },
    { key: 'payer', regex: /(?:From|Sender|Payer|Paid\s*(?:By|From)|Debit\s*Account|Sender\s*Name)\s*[:=]\s*([^<\n]+)/i },
    { key: 'receiver', regex: /(?:To|Receiver|Beneficiary|Recipient|Paid\s*To|Credit\s*Account|Receiver\s*Name)\s*[:=]\s*([^<\n]+)/i },
  ]);
  return { ...base, provider: 'cbe', status: 'SUCCESS' };
}

function parseGenericReceipt(text) {
  const base = extractByPatterns(text, [
    { key: 'transactionId', regex: /(?:TID|Transaction\s*(?:ID|#|Number|No)|Reference\s*(?:No|#|Number))\s*[:=]\s*([^\s<,;"]+)/i },
    { key: 'amount', regex: /(?:Amount|Total|Sum|Paid|Payment)\s*[:=]\s*(?:ETB|Birr|Br)?\s*([0-9,]+\.?[0-9]*)/i, transform: (v) => parseFloat(v.replace(/,/g, '')) },
    { key: 'status', regex: /(?:Status|State|Result|Payment\s*Status)\s*[:=]\s*(\w+)/i, transform: (v) => v.toUpperCase() },
    { key: 'date', regex: /(?:Date|Time|Timestamp|Created|Paid\s*(?:On|At)?)\s*[:=]\s*([^\n<,;"]+)/i },
    { key: 'payer', regex: /(?:From|Sender|Payer|Paid\s*(?:By|From))\s*[:=]\s*([^<\n]+)/i },
    { key: 'receiver', regex: /(?:To|Receiver|Beneficiary|Recipient|Paid\s*To)\s*[:=]\s*([^<\n]+)/i },
  ]);
  return { ...base, provider: 'generic' };
}

function isErrorPage(text, contentType) {
  if (contentType.includes('application/pdf')) return false;
  const errorKeywords = /(?:error|not\s*found|invalid|failed|\b404\b|\b500\b|access\s*denied|forbidden|cannot\s*be\s*found)/i;
  const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && errorKeywords.test(titleMatch[1])) return true;
  const bodyStart = text.indexOf('<body');
  const bodyContent = bodyStart >= 0 ? text.substring(bodyStart, bodyStart + 3000) : text.substring(0, 3000);
  if (errorKeywords.test(bodyContent)) return true;
  return false;
}

exports.parseReceipt = async (receiptUrl, providerHint) => {
  const { buffer, contentType, statusCode } = await fetchUrl(receiptUrl);

  let text;
  let isPdf = false;

  if (contentType.includes('application/pdf') || receiptUrl.includes('apps.cbe.com.et')) {
    text = extractPdfText(buffer);
    isPdf = true;
  } else {
    text = buffer.toString('utf8');
  }

  if (isErrorPage(text, contentType)) {
    return { error: 'Receipt page returned an error or not found', isError: true, receiptUrl, contentType };
  }

  let parsed;
  if (receiptUrl.includes('mbreciept.cbe.com.et') || receiptUrl.includes('apps.cbe.com.et') || providerHint === 'cbe') {
    parsed = parseCbeReceipt(text);
  } else if (receiptUrl.includes('transactioninfo.ethiotelecom.et') || providerHint === 'telebirr') {
    parsed = parseTelebirrReceipt(text);
  } else if (receiptUrl.includes('receipt.ebirr.com') || providerHint === 'ebirr') {
    parsed = parseGenericReceipt(text);
  } else if (receiptUrl.includes('yegara.com') || providerHint === 'yegara') {
    parsed = parseYegaraReceipt(text);
  } else {
    parsed = parseGenericReceipt(text);
  }

  return { ...parsed, receiptUrl, contentType };
};

function parseYegaraReceipt(html) {
  const base = extractByPatterns(html, [
    { key: 'transactionId', regex: /(?:Transaction|Tran|Ref)\s*(?:ID|#|Number|No|Ref)\s*[:=]\s*([^\s<,;"]+)/i },
    { key: 'amount', regex: /(?:Amount|Total|Sum)\s*[:=]\s*(?:ETB|Birr|Br)?\s*([0-9,]+\.?[0-9]*)/i, transform: (v) => parseFloat(v.replace(/,/g, '')) },
    { key: 'status', regex: /(?:Status|State|Result)\s*[:=]\s*(\w+)/i, transform: (v) => v.toUpperCase() },
    { key: 'date', regex: /(?:Date|Time|Created|Paid\s*(?:On|At|Date)?)\s*[:=]\s*([^\n<,;"]+)/i },
    { key: 'payer', regex: /(?:From|Sender|Payer|Paid\s*(?:By|From))\s*[:=]\s*([^<\n]+)/i },
    { key: 'receiver', regex: /(?:To|Receiver|Beneficiary|Recipient|Paid\s*To)\s*[:=]\s*([^<\n]+)/i },
  ]);
  return { ...base, provider: 'yegara' };
}
