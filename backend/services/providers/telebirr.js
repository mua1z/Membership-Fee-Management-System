const { parseReceipt } = require('../receiptParser');

const TELEBIRR_RECEIPT_BASE = 'https://transactioninfo.ethiotelecom.et/receipt';

exports.verify = async (transactionId, amount, receiverAccount, receiptUrl) => {
  try {
    const url = receiptUrl || `${TELEBIRR_RECEIPT_BASE}/${transactionId}`;

    const parsed = await parseReceipt(url, 'telebirr');

    if (parsed.isError) {
      return { verified: false, error: 'The Telebirr receipt page returned an error. Please check your transaction ID and receipt URL.' };
    }

    if (parsed.error) {
      return { verified: false, error: parsed.error };
    }

    if (!parsed.transactionId) {
      return { verified: false, error: `No valid transaction found at the Telebirr receipt URL. Please verify your transaction ID "${transactionId}" is correct.` };
    }

    if (!parsed.amount) {
      return { verified: false, error: `Could not extract payment amount from the Telebirr receipt for transaction "${transactionId}".` };
    }

    const tidMatch = String(parsed.transactionId).trim();
    const submittedTid = String(transactionId).trim();
    const tidNormalized = tidMatch.replace(/[^A-Z0-9]/gi, '');
    const submittedNormalized = submittedTid.replace(/[^A-Z0-9]/gi, '');
    if (tidNormalized !== submittedNormalized && !tidNormalized.startsWith(submittedNormalized) && !submittedNormalized.startsWith(tidNormalized)) {
      return {
        verified: false,
        error: `Transaction ID mismatch: you entered "${submittedTid}" but the Telebirr receipt shows transaction "${tidMatch}". The transaction ID must match exactly.`
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
        error: `Amount mismatch: expected ETB ${amount}, but Telebirr receipt shows ETB ${parsed.amount}. The payment amount must match exactly.`,
        extractedAmount: parsed.amount,
        transactionId: parsed.transactionId
      };
    }

    return {
      verified: true,
      provider: 'telebirr',
      transactionId: parsed.transactionId,
      payer: parsed.payer || 'Customer',
      receiver: parsed.receiver || receiverAccount,
      amount: parsed.amount,
      status: 'SUCCESS',
      date: parsed.date || new Date().toISOString(),
      receiptUrl: url
    };
  } catch (error) {
    return { verified: false, error: `Telebirr verification failed: ${error.message}` };
  }
};
