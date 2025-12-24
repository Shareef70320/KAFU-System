/**
 * Export competency levels to CSV.
 * Requires DATABASE_URL env var.
 * Output: backend/exports/levels.csv
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.join(' | ');
}

async function main() {
  const levels = await prisma.competencyLevel.findMany({
    include: {
      competency: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          family: true,
        },
      },
    },
    orderBy: [
      { competency: { name: 'asc' } },
      { level: 'asc' },
    ],
  });

  const headers = [
    'level_id',
    'competency_id',
    'competency_code',
    'competency_name',
    'competency_type',
    'competency_family',
    'level',
    'title',
    'description',
    'indicators',
    'is_active',
    'created_at',
    'updated_at',
  ];

  const rows = levels.map((lvl) => {
    const comp = lvl.competency || {};
    return [
      lvl.id,
      lvl.competencyId,
      comp.code || '',
      comp.name || '',
      comp.type || '',
      comp.family || '',
      lvl.level,
      lvl.title || '',
      lvl.description || '',
      formatArray(lvl.indicators),
      lvl.isActive ? 'true' : 'false',
      lvl.createdAt?.toISOString?.() || '',
      lvl.updatedAt?.toISOString?.() || '',
    ];
  });

  const csv = [headers.map(toCsvValue).join(','), ...rows.map((r) => r.map(toCsvValue).join(','))].join('\n');

  const outDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'levels.csv');
  fs.writeFileSync(outPath, csv, 'utf8');
  console.log(`Exported ${rows.length} levels to ${outPath}`);
}

main()
  .catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

