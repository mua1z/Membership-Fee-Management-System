// utils/receiptPDF.js - PDF Receipt Generation Utility
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { formatEthiopianDate } = require('./ethiopianCalendar');

class ReceiptPDF {
  /**
   * Generate PDF receipt for a payment
   */
  static async generatePDF(receipt, payment, member, settings) {
    return new Promise((resolve, reject) => {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '..', 'uploads', 'receipts');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `receipt-${receipt.receiptId}.pdf`;
        const filePath = path.join(uploadsDir, fileName);

        // Create a document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        // Pipe to write stream
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Get organization settings
        const orgName = settings?.system?.organizationName || 'Dire Dawa City Administration Finance Bureau';
        const currency = settings?.system?.currency || 'ETB';
        const receiptPrefix = settings?.receiptPrefix || 'RCP';

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(orgName, { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(14)
          .font('Helvetica')
          .text('Membership Contribution Management System', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('OFFICIAL PAYMENT RECEIPT', { align: 'center' })
          .moveDown(1);

        // Receipt details box
        doc
          .roundedRectangle(50, doc.y, 500, 60, 5)
          .strokeColor('#0ea5e9')
          .lineWidth(2)
          .stroke();

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Receipt ID: ${receipt.receiptId}`, 60, doc.y + 10)
          .moveDown(0.5);

        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Date: ${formatEthiopianDate(new Date(receipt.issuedAt))}`, 60, doc.y)
          .moveDown(2);

        // Member Information Section
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Member Information', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`Name: ${member.fullName}`, { indent: 20 })
          .text(`Member ID: ${member.memberId}`, { indent: 20 })
          .text(`Branch: ${member.branch}`, { indent: 20 })
          .text(`Membership Type: ${member.membershipType}`, { indent: 20 });

        if (member.subType) {
          doc.text(`Sub-Type: ${member.subType}`, { indent: 20 });
        }

        doc.moveDown(1);

        // Payment Information Section
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Payment Information', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`Amount Paid: ${currency} ${payment.amount.toLocaleString()}`, { indent: 20 })
          .text(`Payment Method: ${payment.method}`, { indent: 20 })
          .text(`Payment Frequency: ${payment.frequency}`, { indent: 20 })
          .text(`Payment Date: ${formatEthiopianDate(new Date(payment.paymentDate))}`, { indent: 20 })
          .text(`Period: ${payment.period.month}/${payment.period.year}`, { indent: 20 })
          .text(`Status: ${payment.status}`, { indent: 20 });

        if (payment.receivedBy) {
          doc.text(`Received By: ${payment.receivedBy}`, { indent: 20 });
        }

        doc.moveDown(1);

        // Contribution Details
        if (member.contribution) {
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Contribution Details', { underline: true })
            .moveDown(0.5);

          doc
            .fontSize(11)
            .font('Helvetica')
            .text(`Monthly Fee: ${currency} ${member.contribution.monthlyFee.toLocaleString()}`, { indent: 20 })
            .text(`Annual Fee: ${currency} ${member.contribution.annualFee.toLocaleString()}`, { indent: 20 });

          if (member.contribution.percentage > 0) {
            doc.text(`Contribution Percentage: ${member.contribution.percentage}%`, { indent: 20 });
          }

          doc.moveDown(1);
        }

        // Revenue Distribution
        if (member.contribution) {
          const annualFee = member.contribution.annualFee || 0;
          const hqPercentage = settings?.distribution?.hqPercentage || 20;
          const branchPercentage = settings?.distribution?.branchPercentage || 80;

          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Revenue Distribution (Annual)', { underline: true })
            .moveDown(0.5);

          doc
            .fontSize(11)
            .font('Helvetica')
            .text(`HQ Share (${hqPercentage}%): ${currency} ${Math.round(annualFee * hqPercentage / 100).toLocaleString()}`, { indent: 20 })
            .text(`Branch Share (${branchPercentage}%): ${currency} ${Math.round(annualFee * branchPercentage / 100).toLocaleString()}`, { indent: 20 });

          doc.moveDown(1);
        }

        // Notes
        if (payment.notes) {
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Notes', { underline: true })
            .moveDown(0.5);

          doc
            .fontSize(11)
            .font('Helvetica')
            .text(payment.notes, { indent: 20 })
            .moveDown(1);
        }

        // Footer with disclaimer
        doc
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke()
          .moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text('This is an official receipt generated by the Prosperity Party Dire Dawa Branch Office Membership System.', { align: 'center' })
          .text('Keep this receipt for your records.', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(9)
          .font('Helvetica')
          .text(`Generated on: ${formatEthiopianDate(new Date())}`, { align: 'center' });

        // Finalize PDF file
        doc.end();

        stream.on('finish', () => {
          resolve({
            fileName,
            filePath,
            fileSize: fs.statSync(filePath).size
          });
        });

        stream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate PDF as buffer (for direct download without saving to disk)
   */
  static async generatePDFBuffer(receipt, payment, member, settings) {
    return new Promise((resolve, reject) => {
      try {
        const chunks = [];
        
        // Create a document
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });

        // Collect chunks
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Get organization settings
        const orgName = settings?.system?.organizationName || 'Dire Dawa City Administration Finance Bureau';
        const currency = settings?.system?.currency || 'ETB';

        // Header
        doc
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(orgName, { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(14)
          .font('Helvetica')
          .text('Membership Contribution Management System', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .text('OFFICIAL PAYMENT RECEIPT', { align: 'center' })
          .moveDown(1);

        // Receipt details box
        doc
          .roundedRectangle(50, doc.y, 500, 60, 5)
          .strokeColor('#0ea5e9')
          .lineWidth(2)
          .stroke();

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`Receipt ID: ${receipt.receiptId}`, 60, doc.y + 10)
          .moveDown(0.5);

        doc
          .fontSize(12)
          .font('Helvetica')
          .text(`Date: ${formatEthiopianDate(new Date(receipt.issuedAt))}`, 60, doc.y)
          .moveDown(2);

        // Member Information Section
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Member Information', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`Name: ${member.fullName}`, { indent: 20 })
          .text(`Member ID: ${member.memberId}`, { indent: 20 })
          .text(`Branch: ${member.branch}`, { indent: 20 })
          .text(`Membership Type: ${member.membershipType}`, { indent: 20 });

        if (member.subType) {
          doc.text(`Sub-Type: ${member.subType}`, { indent: 20 });
        }

        doc.moveDown(1);

        // Payment Information Section
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text('Payment Information', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(11)
          .font('Helvetica')
          .text(`Amount Paid: ${currency} ${payment.amount.toLocaleString()}`, { indent: 20 })
          .text(`Payment Method: ${payment.method}`, { indent: 20 })
          .text(`Payment Frequency: ${payment.frequency}`, { indent: 20 })
          .text(`Payment Date: ${formatEthiopianDate(new Date(payment.paymentDate))}`, { indent: 20 })
          .text(`Period: ${payment.period.month}/${payment.period.year}`, { indent: 20 })
          .text(`Status: ${payment.status}`, { indent: 20 });

        if (payment.receivedBy) {
          doc.text(`Received By: ${payment.receivedBy}`, { indent: 20 });
        }

        doc.moveDown(1);

        // Contribution Details
        if (member.contribution) {
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text('Contribution Details', { underline: true })
            .moveDown(0.5);

          doc
            .fontSize(11)
            .font('Helvetica')
            .text(`Monthly Fee: ${currency} ${member.contribution.monthlyFee.toLocaleString()}`, { indent: 20 })
            .text(`Annual Fee: ${currency} ${member.contribution.annualFee.toLocaleString()}`, { indent: 20 });

          if (member.contribution.percentage > 0) {
            doc.text(`Contribution Percentage: ${member.contribution.percentage}%`, { indent: 20 });
          }

          doc.moveDown(1);
        }

        // Footer
        doc
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke()
          .moveDown(0.5);

        doc
          .fontSize(10)
          .font('Helvetica-Oblique')
          .text('This is an official receipt generated by the Prosperity Party Dire Dawa Branch Office Membership System.', { align: 'center' })
          .text('Keep this receipt for your records.', { align: 'center' });

        // Finalize
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = ReceiptPDF;
