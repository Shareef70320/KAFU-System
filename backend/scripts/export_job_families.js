/**
 * Export competency/job families to CSV.
 * Runs with DATABASE_URL env set. Output: exports/job_families.csv
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const families = await prisma.competencyFamily.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  const headers = [
    'id',
    'name',
    'type',
    'description',
    'is_active',
    'created_at',
    'updated_at',
  ];

  const rows = families.map((f) => [
    f.id,
    f.name,
    f.type || '',
    f.description || '',
    f.isActive ? 'true' : 'false',
    f.createdAt?.toISOString?.() || '',
    f.updatedAt?.toISOString?.() || '',
  ]);

  const csv = [headers.map(toCsvValue).join(','), ...rows.map((r) => r.map(toCsvValue).join(','))].join('\n');

  const outDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'job_families.csv');
  fs.writeFileSync(outPath, csv, 'utf8');

  console.log(`Exported ${rows.length} families to ${outPath}`);
}

main()
  .catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

