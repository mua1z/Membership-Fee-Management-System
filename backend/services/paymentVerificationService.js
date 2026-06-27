const cbeProvider = require('./providers/cbe');
const telebirrProvider = require('./providers/telebirr');
const ebirrProvider = require('./providers/ebirr');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const MERCHANTS = {
  cbe: '1000476051111',
  telebirr: '0964358567',
  ebirr: '0964358567'
};

exports.verifyTransaction = async (provider, transactionId, expectedAmount, receiptUrl) => {
  const normalizedProvider = provider.toLowerCase().replace('_birr', '').replace('cbe birr', 'cbe');
  let cleanProvider = 'cbe';
  if (normalizedProvider.includes('telebirr')) cleanProvider = 'telebirr';
  else if (normalizedProvider.includes('ebirr') || normalizedProvider.includes('e-birr')) cleanProvider = 'ebirr';

  const merchantAccount = MERCHANTS[cleanProvider] || MERCHANTS.cbe;

  let result;
  switch (cleanProvider) {
    case 'cbe':
      result = await cbeProvider.verify(transactionId, expectedAmount, merchantAccount, receiptUrl);
      break;
    case 'telebirr':
      result = await telebirrProvider.verify(transactionId, expectedAmount, merchantAccount, receiptUrl);
      break;
    case 'ebirr':
      result = await ebirrProvider.verify(transactionId, expectedAmount, merchantAccount, receiptUrl);
      break;
    default:
      return { verified: false, error: 'Unsupported payment provider' };
  }

  if (result.verified) {
    if (result.status !== 'SUCCESS') {
      result.verified = false;
      result.error = 'Transaction status is not SUCCESS';
    } else if (result.amount !== Number(expectedAmount)) {
      result.verified = false;
      result.error = `Amount mismatch: Expected ${expectedAmount}, found ${result.amount}`;
    }
  }

  return result;
};

exports.generateReceiptPDF = async (verificationData, orderId) => {
  return new Promise((resolve, reject) => {
    try {
      const receiptsDir = path.join(__dirname, '..', '..', 'uploads', 'receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filename = `auto-receipt-${orderId || verificationData.transactionId}-${Date.now()}.pdf`;
      const filePath = path.join(receiptsDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      doc.fontSize(20).text('Transaction Receipt', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12);
      doc.text(`Provider: ${verificationData.provider.toUpperCase()}`);
      doc.text(`Transaction ID: ${verificationData.transactionId}`);
      doc.text(`Date: ${verificationData.date}`);
      doc.moveDown();

      doc.text(`Payer: ${verificationData.payer}`);
      doc.text(`Receiver: ${verificationData.receiver}`);
      doc.text(`Amount: ETB ${verificationData.amount.toFixed(2)}`);
      doc.text(`Status: ${verificationData.status}`);

      if (orderId) {
        doc.moveDown();
        doc.text(`Sector Payment ID: ${orderId}`);
      }

      doc.end();

      stream.on('finish', () => {
        resolve(filename);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};
