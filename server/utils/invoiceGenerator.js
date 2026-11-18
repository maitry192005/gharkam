const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoicePDF = (booking, payment) => {
  return new Promise((resolve, reject) => {
    try {
      const invoicesDir = path.join(__dirname, '..', '..', 'public', 'assets', 'uploads', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `Invoice-${payment.invoiceNumber || booking.bookingNumber}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      const relativePath = `/assets/uploads/invoices/${fileName}`;

      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header Brand
      doc.fillColor('#245a46').fontSize(24).font('Helvetica-Bold').text('GharKaam', 40, 40);
      doc.fillColor('#666666').fontSize(10).font('Helvetica').text('Trusted Domestic Help Marketplace', 40, 68);
      doc.text('Reg Office: Connaught Place, New Delhi, India 110001', 40, 82);
      doc.text('GSTIN: 07AAACG1234F1Z8 | support@gharkaam.com', 40, 96);

      // Invoice metadata
      doc.fillColor('#245a46').fontSize(18).font('Helvetica-Bold').text('TAX INVOICE', 380, 40, { align: 'right' });
      doc.fillColor('#333333').fontSize(10).font('Helvetica');
      doc.text(`Invoice No: ${payment.invoiceNumber}`, 380, 65, { align: 'right' });
      doc.text(`Booking Ref: ${booking.bookingNumber}`, 380, 80, { align: 'right' });
      doc.text(`Date: ${new Date(payment.paidAt || Date.now()).toLocaleDateString('en-IN')}`, 380, 95, { align: 'right' });
      doc.text(`Payment Mode: ${(payment.method || 'Cash').toUpperCase()}`, 380, 110, { align: 'right' });

      doc.moveTo(40, 130).lineTo(555, 130).strokeColor('#e2e8f0').stroke();

      // Bill To & Service Details
      const startY = 145;
      doc.fillColor('#245a46').fontSize(12).font('Helvetica-Bold').text('Billed To (Customer):', 40, startY);
      doc.fillColor('#333333').fontSize(10).font('Helvetica');
      doc.text(booking.customer.fullName || 'Customer', 40, startY + 18);
      doc.text(booking.customer.phone || '', 40, startY + 32);
      doc.text(`${booking.address.addressLine}, ${booking.address.district}, ${booking.address.state} - ${booking.address.pincode}`, 40, startY + 46, { width: 230 });

      doc.fillColor('#245a46').fontSize(12).font('Helvetica-Bold').text('Assigned Helper:', 320, startY);
      doc.fillColor('#333333').fontSize(10).font('Helvetica');
      doc.text(booking.helper.fullName || 'Helper', 320, startY + 18);
      doc.text(`Contact: ${booking.helper.phone || 'Available in Dashboard'}`, 320, startY + 32);
      doc.text(`Dates: ${new Date(booking.workFrom).toLocaleDateString('en-IN')} to ${new Date(booking.workTo).toLocaleDateString('en-IN')} (${booking.totalDays} day(s))`, 320, startY + 46, { width: 230 });

      // Item Table
      const tableY = startY + 95;
      doc.rect(40, tableY, 515, 24).fill('#eff5ef');
      doc.fillColor('#245a46').fontSize(10).font('Helvetica-Bold');
      doc.text('Service Item', 50, tableY + 7);
      doc.text('Daily Rate', 280, tableY + 7, { align: 'right', width: 70 });
      doc.text('Days', 370, tableY + 7, { align: 'center', width: 40 });
      doc.text('Amount (INR)', 430, tableY + 7, { align: 'right', width: 115 });

      let currentY = tableY + 30;
      doc.font('Helvetica').fontSize(10).fillColor('#333333');

      booking.services.forEach((s) => {
        const serviceName = s.service && s.service.name ? s.service.name : 'Domestic Service';
        const itemTotal = (s.rate || 0) * booking.totalDays;
        doc.text(serviceName, 50, currentY);
        doc.text(`Rs. ${s.rate || 0}`, 280, currentY, { align: 'right', width: 70 });
        doc.text(`${booking.totalDays}`, 370, currentY, { align: 'center', width: 40 });
        doc.text(`Rs. ${itemTotal.toFixed(2)}`, 430, currentY, { align: 'right', width: 115 });
        currentY += 20;
      });

      doc.moveTo(40, currentY + 5).lineTo(555, currentY + 5).strokeColor('#e2e8f0').stroke();
      currentY += 15;

      // Pricing Totals
      const pr = booking.pricing || {};
      const totalsX = 350;
      const valuesX = 450;
      const widthVal = 95;

      doc.text('Services Subtotal:', totalsX, currentY);
      doc.text(`Rs. ${(pr.subtotal || 0).toFixed(2)}`, valuesX, currentY, { align: 'right', width: widthVal });
      currentY += 16;

      if (pr.emergencySurcharge > 0) {
        doc.text('Emergency Surcharge:', totalsX, currentY);
        doc.text(`Rs. ${pr.emergencySurcharge.toFixed(2)}`, valuesX, currentY, { align: 'right', width: widthVal });
        currentY += 16;
      }

      doc.text('Platform Fee (5%):', totalsX, currentY);
      doc.text(`Rs. ${(pr.platformFee || 0).toFixed(2)}`, valuesX, currentY, { align: 'right', width: widthVal });
      currentY += 16;

      doc.text('GST (18%):', totalsX, currentY);
      doc.text(`Rs. ${(pr.tax || 0).toFixed(2)}`, valuesX, currentY, { align: 'right', width: widthVal });
      currentY += 16;

      if (pr.discount > 0) {
        doc.fillColor('#16a34a').text('Coupon Discount:', totalsX, currentY);
        doc.text(`- Rs. ${pr.discount.toFixed(2)}`, valuesX, currentY, { align: 'right', width: widthVal });
        doc.fillColor('#333333');
        currentY += 16;
      }

      if (pr.walletUsed > 0) {
        doc.fillColor('#16a34a').text('Wallet Credits Used:', totalsX, currentY);
        doc.text(`- Rs. ${pr.walletUsed.toFixed(2)}`, valuesX, currentY, { align: 'right', width: widthVal });
        doc.fillColor('#333333');
        currentY += 16;
      }

      doc.rect(totalsX - 10, currentY, 215, 26).fill('#245a46');
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
      doc.text('Total Paid:', totalsX, currentY + 7);
      doc.text(`Rs. ${(payment.amount || pr.totalAmount || 0).toFixed(2)}`, valuesX - 10, currentY + 7, { align: 'right', width: 105 });

      // Footer stamp & note
      doc.fillColor('#666666').font('Helvetica').fontSize(9);
      doc.text('This is a computer-generated tax invoice and requires no physical signature.', 40, 750, { align: 'center', width: 515 });
      doc.text('Thank you for choosing GharKaam - India’s Trusted Domestic Help Network.', 40, 765, { align: 'center', width: 515 });

      doc.end();

      stream.on('finish', () => {
        resolve({ fileName, filePath, relativePath });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateInvoicePDF,
};
