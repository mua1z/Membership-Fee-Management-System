const { parseReceipt } = require('../receiptParser');

const EBIRR_RECEIPT_BASE = 'https://receipt.ebirr.com/kaafimf';

exports.verify = async (transactionId, amount, receiverAccount, receiptUrl) => {
  try {
    const url = receiptUrl || `${EBIRR_RECEIPT_BASE}/${transactionId}`;

    const parsed = await parseReceipt(url, 'ebirr');

    if (parsed.isError) {
      return { verified: false, error: 'The E-Birr receipt page returned an error. Please check your transaction ID.' };
    }

    if (parsed.error) {
      return { verified: false, error: parsed.error };
    }

    if (!parsed.transactionId) {
      return { verified: false, error: `No valid transaction found at the E-Birr receipt URL. Please verify your transaction ID "${transactionId}" is correct.` };
    }

    if (!parsed.amount) {
      return { verified: false, error: `Could not extract payment amount from the E-Birr receipt for transaction "${transactionId}".` };
    }

    const tidMatch = String(parsed.transactionId).trim();
    const submittedTid = String(transactionId).trim();
    const tidNormalized = tidMatch.replace(/[^A-Z0-9]/gi, '');
    const submittedNormalized = submittedTid.replace(/[^A-Z0-9]/gi, '');
    if (tidNormalized !== submittedNormalized && !tidNormalized.startsWith(submittedNormalized) && !submittedNormalized.startsWith(tidNormalized)) {
      return {
        verified: false,
        error: `Transaction ID mismatch: you submitted "${submittedTid}" but the receipt shows transaction "${tidMatch}".`
      };
    }

    if (parsed.status && parsed.status !== 'SUCCESS' && parsed.status !== 'COMPLETED' && parsed.status !== 'COMPLETE') {
      return {
        verified: false,
        error: `Transaction status is "${parsed.status}" — only SUCCESS transactions are accepted`,
        status: parsed.status
      };
    }

    if (parsed.amount !== amount) {
      return {
        verified: false,
        error: `Amount mismatch: expected ETB ${amount}, but receipt shows ETB ${parsed.amount}.`,
        extractedAmount: parsed.amount,
        transactionId: parsed.transactionId
      };
    }

    return {
      verified: true,
      provider: 'ebirr',
      transactionId: parsed.transactionId,
      payer: parsed.payer || 'Customer',
      receiver: parsed.receiver || receiverAccount,
      amount: parsed.amount,
      status: 'SUCCESS',
      date: parsed.date || new Date().toISOString(),
      receiptUrl: url
    };
  } catch (error) {
    return { verified: false, error: `E-Birr verification failed: ${error.message}` };
  }
};
