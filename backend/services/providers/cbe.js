const { parseReceipt } = require('../receiptParser');

const CBE_RECEIPT_BASE = 'https://mbreciept.cbe.com.et';

exports.verify = async (transactionId, amount, receiverAccount, receiptUrl) => {
  try {
    const url = receiptUrl || `${CBE_RECEIPT_BASE}/${transactionId}`;

    const parsed = await parseReceipt(url, 'cbe');

    if (parsed.isError) {
      return { verified: false, error: 'The CBE receipt page returned an error. Please check your transaction ID and ensure you are accessing from within Ethiopia.' };
    }

    if (parsed.error) {
      return { verified: false, error: parsed.error };
    }

    if (!parsed.transactionId) {
      return { verified: false, error: `No valid transaction found at the CBE receipt URL. Please verify your transaction ID "${transactionId}" is correct.` };
    }

    if (!parsed.amount) {
      return { verified: false, error: `Could not extract payment amount from the CBE receipt for transaction "${transactionId}".` };
    }

    const tidMatch = String(parsed.transactionId).trim();
    const submittedTid = String(transactionId).trim();
    const tidNormalized = tidMatch.replace(/[^A-Z0-9]/gi, '');
    const submittedNormalized = submittedTid.replace(/[^A-Z0-9]/gi, '');
    if (tidNormalized !== submittedNormalized && !tidNormalized.startsWith(submittedNormalized) && !submittedNormalized.startsWith(tidNormalized)) {
      return {
        verified: false,
        error: `Transaction ID mismatch: you entered "${submittedTid}" but the CBE receipt shows transaction "${tidMatch}". The transaction ID must match exactly.`
      };
    }

    if (parsed.amount !== amount) {
      return {
        verified: false,
        error: `Amount mismatch: expected ETB ${amount}, but CBE receipt shows ETB ${parsed.amount}. The payment amount must match exactly.`,
        extractedAmount: parsed.amount,
        transactionId: parsed.transactionId
      };
    }

    return {
      verified: true,
      provider: 'cbe',
      transactionId: parsed.transactionId,
      payer: parsed.payer || 'Unknown',
      receiver: parsed.receiver || receiverAccount,
      amount: parsed.amount,
      status: 'SUCCESS',
      date: parsed.date || new Date().toISOString(),
      receiptUrl: url
    };
  } catch (error) {
    return { verified: false, error: `CBE verification failed: ${error.message}` };
  }
};
