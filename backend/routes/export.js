const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Helper to sanitize table name against public tables list
async function getPublicTables() {
  const result = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  return result.map(r => r.table_name);
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return `"${value.map(v => String(v)).join('|').replace(/"/g, '""')}"`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

router.get('/tables', async (req, res) => {
  try {
    const tables = await getPublicTables();
    res.json({ tables });
  } catch (error) {
    console.error('Failed to list tables', error);
    res.status(500).json({ message: 'Failed to list tables' });
  }
});

router.get('/table/:table', async (req, res) => {
  try {
    const tableParam = req.params.table;
    const tables = await getPublicTables();
    if (!tables.includes(tableParam)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }

    // Get columns
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = ${tableParam}
      ORDER BY ordinal_position;
    `;
    const colNames = columns.map(c => c.column_name);

    // Fetch data
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableParam}"`);

    // Build CSV
    const csvLines = [];
    csvLines.push(colNames.map(toCsvValue).join(','));
    rows.forEach(row => {
      const line = colNames.map(col => toCsvValue(row[col]));
      csvLines.push(line.join(','));
    });
    const csv = csvLines.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${tableParam}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Failed to export table', error);
    res.status(500).json({ message: 'Failed to export table', error: error.message });
  }
});

module.exports = router;

