const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const authenticate = require('../middleware/auth');
const { generateAndSendUserReport } = require('../services/cronService');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const { getCurrencySymbol } = require('../utils/currency');
const logger = require('../utils/logger');
const { isValidFirebaseId } = require('../utils/validation');

router.use(authenticate);

/**
 * POST /api/export/test-weekly-report
 * Trigger a weekly report email manually for the logged-in user
 */
router.post('/test-weekly-report', async (req, res) => {
  const { uid, email, name, displayName } = req.user;
  
  try {
    const sent = await generateAndSendUserReport(uid, email, name || displayName || 'User');
    if (sent) {
      res.json({ message: 'Success! Weekly report email has been sent to ' + email });
    } else {
      res.json({ message: 'No data found for this user to generate a report.', success: false });
    }
  } catch (error) {
    logger.error('Manual Report Error:', error);
    res.status(500).json({ error: 'Failed to generate manual report.' });
  }
});

/**
 * Helper to fetch and normalize group data
 */
async function getGroupDataForExport(groupId, uid) {
  const db = admin.database();
  
  // Verify user has access to the group
  const userGroupSnap = await db.ref(`userGroups/${uid}/${groupId}`).once('value');
  if (!userGroupSnap.exists()) {
    throw new Error('Unauthorized access to group');
  }

  // ⚡ Bolt Optimization: Parallelize fetching group metadata and transactions to reduce export latency.
  // Expected impact: Reduces backend processing time for generating exports by up to 50% depending on latency.
  const [groupSnap, transactionsSnap] = await Promise.all([
    db.ref(`groups/${groupId}`).once('value'),
    db.ref('transactions').orderByChild('groupId').equalTo(groupId).once('value')
  ]);

  if (!groupSnap.exists()) {
    throw new Error('Group not found');
  }
  const group = groupSnap.val();
    
  const transactions = [];
  transactionsSnap.forEach(snap => {
    transactions.push({ id: snap.key, ...snap.val() });
  });

  // Sort transactions by date (descending)
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { group, transactions };
}

/**
 * GET /api/export/group-report/:groupId
 * Query params: format (pdf, excel, csv)
 */
router.get('/group-report/:groupId', async (req, res) => {
  const { groupId } = req.params;

  if (!isValidFirebaseId(groupId)) {
    return res.status(400).json({ error: 'Invalid group ID' });
  }

  const { format, currency } = req.query;
  const uid = req.user.uid;

  try {
    const { group, transactions } = await getGroupDataForExport(groupId, uid);

    if (format === 'pdf') {
      return generatePDFReport(res, group, transactions, currency);
    } else if (format === 'excel') {
      return generateExcelReport(res, group, transactions);
    } else if (format === 'csv') {
      return generateCSVReport(res, group, transactions);
    } else {
      return res.status(400).json({ error: 'Invalid format specified' });
    }
  } catch (error) {
    logger.error(`Export Error for Group ${groupId}:`, error);
    res.status(error.message === 'Unauthorized access to group' ? 403 : 500)
       .json({ error: error.message || 'Failed to export report' });
  }
});

const sanitizeForPDF = (text) => {
  if (!text) return '';
  // Remove emojis and other non-standard characters that break standard PDF fonts
  return text.replace(/[^\x00-\x7F]/g, '').trim() || 'Text';
};

function generatePDFReport(res, group, transactions, currencyCode = 'PKR') {
  const symbol = getCurrencySymbol(currencyCode);
  const doc = new PDFDocument({ 
    margin: 50, 
    size: 'A4',
    info: {
      Title: `Hostel Ledger Report - ${group.name}`,
      Author: 'Hostel Ledger'
    }
  });
  
  const filename = `Report-${group.name.replace(/\s+/g, '_')}-${new Date().getTime()}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // --- Professional Header Banner ---
  const primaryColor = '#4a6850';
  doc.rect(0, 0, doc.page.width, 120).fill(primaryColor);
  
  doc.fillColor('#ffffff')
     .fontSize(24)
     .font('Helvetica-Bold')
     .text('HOSTEL LEDGER', 50, 40);
     
  doc.fontSize(12)
     .font('Helvetica')
     .text('Group Transaction Report', 50, 70);
     
  doc.fontSize(10)
     .text(`Generated on: ${new Date().toLocaleString()}`, 50, 90);

  doc.fillColor('#000000'); // Reset color
  doc.moveDown(5);

  // --- Group Title ---
  doc.fontSize(20)
     .font('Helvetica-Bold')
     .text(sanitizeForPDF(group.name), 50, 140);
  
  doc.moveTo(50, 165).lineTo(540, 165).lineWidth(2).stroke(primaryColor);
  doc.moveDown(2);

  // --- Summary Metrics Grid ---
  const startY = doc.y;
  const colWidth = 160;
  
  // Metric Boxes
  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const stats = [
    { label: 'Total Transactions', value: transactions.length.toString() },
    { label: 'Total Spent', value: `${symbol} ${totalSpent.toLocaleString()}` }
  ];

  if (group.budget && group.budget.amount > 0) {
    const percentage = Math.round((totalSpent / group.budget.amount) * 100);
    stats.push({ label: 'Budget Utilization', value: `${percentage}%` });
    stats.push({ label: `Budget (${group.budget.period || 'Monthly'})`, value: `${symbol} ${group.budget.amount.toLocaleString()}` });
  }

  stats.forEach((stat, i) => {
    const x = 50 + (i % 3) * colWidth;
    const y = startY + Math.floor(i / 3) * 60;
    
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(stat.label.toUpperCase(), x, y);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333').text(stat.value, x, y + 15);
  });

  doc.moveDown(stats.length > 3 ? 6 : 4);

  // --- Transactions Table ---
  doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('TRANSACTION LOG');
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const itemHeight = 35;
  
  // Table Header Background
  doc.rect(50, tableTop, 490, 25).fill(primaryColor);
  
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
  doc.text('DATE', 60, tableTop + 8);
  doc.text('DESCRIPTION', 130, tableTop + 8);
  doc.text('TYPE', 260, tableTop + 8);
  doc.text('PAID BY', 330, tableTop + 8);
  doc.text('AMOUNT', 450, tableTop + 8, { align: 'right', width: 80 });
  
  let currentY = tableTop + 25;

  transactions.forEach((t, index) => {
    // Zebra Striping
    if (index % 2 === 1) {
      doc.rect(50, currentY, 490, itemHeight).fill('#f8fafc');
    }

    // Page Break Support
    if (currentY > 750) {
      doc.addPage();
      currentY = 50;
      // Redraw Header on new page
      doc.rect(50, currentY, 490, 25).fill(primaryColor);
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
      doc.text('DATE', 60, currentY + 8);
      doc.text('DESCRIPTION', 130, currentY + 8);
      doc.text('TYPE', 260, currentY + 8);
      doc.text('PAID BY', 330, currentY + 8);
      doc.text('AMOUNT', 450, currentY + 8, { align: 'right', width: 80 });
      currentY += 25;
    }

    doc.fontSize(9).font('Helvetica').fillColor('#333333');
    doc.text(new Date(t.date).toLocaleDateString(), 60, currentY + 12);
    doc.font('Helvetica-Bold').text(sanitizeForPDF(t.title) || 'Untitled', 130, currentY + 12, { width: 120, ellipsis: true });
    doc.font('Helvetica').text(t.type === 'expense' ? 'Expense' : 'Payment', 260, currentY + 12);
    doc.text(sanitizeForPDF(t.paidByName || t.fromName) || 'System', 330, currentY + 12, { width: 110, ellipsis: true });
    
    doc.font('Helvetica-Bold')
       .fillColor(t.type === 'expense' ? '#e11d48' : '#16a34a')
       .text(`${symbol}${t.amount.toLocaleString()}`, 450, currentY + 12, { align: 'right', width: 80 });
    
    currentY += itemHeight;
  });

  doc.end();
}

async function generateExcelReport(res, group, transactions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transactions');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Title', key: 'title', width: 30 },
    { header: 'Type', key: 'type', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Paid By', key: 'paidBy', width: 25 },
    { header: 'Participants', key: 'participants', width: 40 },
    { header: 'Note', key: 'note', width: 40 }
  ];

  transactions.forEach(t => {
    const participants = t.participants 
      ? t.participants.map(p => p.name).join(', ')
      : '';
      
    worksheet.addRow({
      date: new Date(t.date).toLocaleDateString(),
      title: t.title,
      type: t.type === 'expense' ? 'Expense' : 'Payment',
      amount: t.amount,
      paidBy: t.paidByName || t.fromName,
      participants: participants,
      note: t.note || ''
    });
  });

  // Formatting
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A6850' }
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  const filename = `Report-${group.name.replace(/\s+/g, '_')}-${new Date().getTime()}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
}

function generateCSVReport(res, group, transactions) {
  const fields = ['date', 'title', 'type', 'amount', 'paidBy', 'note'];
  const opts = { fields };
  
  const data = transactions.map(t => ({
    date: new Date(t.date).toLocaleDateString(),
    title: t.title,
    type: t.type === 'expense' ? 'Expense' : 'Payment',
    amount: t.amount,
    paidBy: t.paidByName || t.fromName,
    note: t.note || ''
  }));

  try {
    const parser = new Parser(opts);
    const csv = parser.parse(data);
    
    const filename = `Report-${group.name.replace(/\s+/g, '_')}-${new Date().getTime()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (err) {
    logger.error('CSV Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate CSV' });
  }
}

module.exports = router;
