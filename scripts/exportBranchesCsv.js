const fs = require('fs');
const path = require('path');
const { env } = require('../src/config/env');
const { BranchApiClient } = require('../src/services/api/branchApiClient');
const { normalizeText } = require('../src/utils/text');

const LEGAL_FORM_STOPWORDS = new Set([
  'ип',
  'индивидуальный',
  'предприниматель',
  'ооо',
  'ооо.',
  'зао',
  'пао',
  'ао',
  'оао',
  'общество',
  'ограниченной',
  'ответственностью'
]);

function tokenizeJurLico(value) {
  return normalizeText(value)
    .replace(/["'`«»()\[\],.]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !LEGAL_FORM_STOPWORDS.has(token));
}

function normalizeJurLicoKey(value) {
  return tokenizeJurLico(value).join(' ');
}

function escapeCsv(value) {
  const stringValue = value == null ? '' : String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(escapeCsv).join(';')];

  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(';'));
  }

  return `\uFEFF${lines.join('\n')}`;
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
}

function normalizeContactType(value) {
  return normalizeText(value)
    .replace(/№/g, '')
    .replace(/no\.?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function findContactByType(contacts = [], variants = []) {
  const normalizedVariants = variants.map(normalizeContactType);
  return contacts.find((contact) => {
    const type = normalizeContactType(contact.contact_type);
    return normalizedVariants.includes(type);
  }) || null;
}

function getPartner1(contacts) {
  return findContactByType(contacts, [
    'партнер 1',
    'партнер 01',
    'партнер №1',
    'партнер n1',
    'партнер'
  ]);
}

function getPartner2(contacts) {
  return findContactByType(contacts, [
    'партнер 2',
    'партнер 02',
    'партнер №2',
    'партнер n2',
    'фактический партнер'
  ]);
}

function getManager(contacts) {
  return findContactByType(contacts, [
    'управляющий',
    'управляющая'
  ]);
}

function contactValue(contact, field) {
  return contact?.[field] ?? '';
}

function buildCompareRow(branch) {
  const contacts = Array.isArray(branch.contacts) ? branch.contacts : [];
  const partner1 = getPartner1(contacts);
  const partner2 = getPartner2(contacts);
  const manager = getManager(contacts);

  return {
    'ID филиала': branch.id,
    'partner_id': branch.partner_id,
    'iiko (address_tt)': branch.iiko?.address_tt || '',
    'Юр лицо': branch.jur_lico || '',
    'Юр лицо (normalized)': normalizeJurLicoKey(branch.jur_lico),
    'ФИО юридического партнера': contactValue(partner1, 'fio'),
    'Телефон юридического партнера': contactValue(partner1, 'phone'),
    'ТГ юридического партнера': contactValue(partner1, 'telegram'),
    'E-mail (Яндекс) юридического партнера': contactValue(partner1, 'email_yandex'),
    'ФИО фактического партнера': contactValue(partner2, 'fio'),
    'Телефон фактического партнера': contactValue(partner2, 'phone'),
    'ТГ фактического партнера': contactValue(partner2, 'telegram'),
    'E-mail (Яндекс) фактического партнера': contactValue(partner2, 'email_yandex'),
    'ФИО управляющего': contactValue(manager, 'fio'),
    'Телефон управляющего': contactValue(manager, 'phone'),
    'ТГ управляющего': contactValue(manager, 'telegram'),
    'E-mail (Яндекс) управляющего': contactValue(manager, 'email_yandex'),
    'Статус филиала': branch.status || '',
    'Адрес location': branch.location?.address || '',
    'Город': branch.location?.city || '',
    'Есть iiko': branch.iiko ? 'да' : 'нет',
    'Есть address_tt': String(branch.iiko?.address_tt || '').trim() ? 'да' : 'нет',
    'Типы контактов в БД': contacts.map((contact) => contact.contact_type).filter(Boolean).join(' | '),
    'Все ФИО контактов': contacts.map((contact) => contact.fio).filter(Boolean).join(' | ')
  };
}

async function main() {
  const client = new BranchApiClient(env.branchApi);
  const result = await client.getAllBranches();
  const branches = Array.isArray(result) ? result : [];
  const rows = branches.map(buildCompareRow);

  const outputDir = path.resolve(process.cwd(), 'exports');
  fs.mkdirSync(outputDir, { recursive: true });

  const fileName = `filials-compare-export-${formatTimestamp()}.csv`;
  const outputPath = path.join(outputDir, fileName);

  fs.writeFileSync(outputPath, toCsv(rows), 'utf8');

  console.log(`Exported ${rows.length} branches to ${outputPath}`);
}

main().catch((error) => {
  console.error('export.failed', error);
  process.exit(1);
});
