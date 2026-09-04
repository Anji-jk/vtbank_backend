import PDFDocument from 'pdfkit';

export function generateStatementPDF({ customer, account, transactions, rangeLabel }, outputStream) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(outputStream);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('TestBank — Account Statement', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
        .text(`Account Holder: ${customer.firstName} ${customer.lastName}`)
        .text(`Account Number: ${account.accountNumber}`)
        .text(`Statement Period: ${rangeLabel}`)
        .text(`Generated: ${new Date().toLocaleString('en-IN')}`);
    doc.moveDown(1);

    // Table header
    const tableTop = doc.y;
    const columns = { date: 40, desc: 130, type: 320, amount: 380, balance: 460 };
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Date', columns.date, tableTop);
    doc.text('Description', columns.desc, tableTop);
    doc.text('Type', columns.type, tableTop);
    doc.text('Amount', columns.amount, tableTop);
    doc.text('Balance', columns.balance, tableTop);
    doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).stroke();

    // Table rows
    let y = tableTop + 22;
    doc.font('Helvetica').fontSize(9);

    transactions.forEach((txn) => {
        if (y > 750) { // near page bottom — start a new page
            doc.addPage();
            y = 40;
        }

        doc.text(new Date(txn.createdAt).toLocaleDateString('en-IN'), columns.date, y);
        doc.text(txn.description || txn.transactionType, columns.desc, y, { width: 180 });
        doc.text(txn.transactionType, columns.type, y);
        doc.fillColor(txn.transactionType === 'Deposit' ? 'green' : 'red')
            .text(`${txn.transactionType === 'Deposit' ? '+' : '-'}₹${Number(txn.amount).toLocaleString('en-IN')}`, columns.amount, y)
            .fillColor('black');
        doc.text(`₹${Number(txn.balanceAfter).toLocaleString('en-IN')}`, columns.balance, y);

        y += 20;
    });

    if (transactions.length === 0) {
        doc.text('No transactions found for this period.', 40, y);
    }

    doc.end(); // finalizes the PDF — nothing writes to outputStream after this
}