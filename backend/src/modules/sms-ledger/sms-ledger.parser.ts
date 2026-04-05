import { MERCHANT_CATEGORY_MAP } from '../../shared/constants/categories';

export interface ParsedSms {
  amount: number | null;
  type: 'INCOME' | 'EXPENSE' | null;
  merchant: string | null;
  category: string;
  date: Date | null;
  referenceId: string | null;
  balance: number | null;
}

export type ParseStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED';

export interface ParseResult {
  status: ParseStatus;
  data: ParsedSms;
  errorReason: string | null;
}

const EXPENSE_KEYWORDS = /\b(debited|spent|withdrawn|paid|purchase|payment|debit|sent)\b/i;
const INCOME_KEYWORDS = /\b(credited|received|refund|cashback|credit|deposited)\b/i;

const AMOUNT_PATTERNS = [
  /(?:Rs\.?\s?|INR\.?\s?|₹\s?)([\d,]+(?:\.\d{1,2})?)/i,
  /(?:amount|amt)(?:\s+(?:of|is))?\s*(?:Rs\.?\s?|INR\.?\s?|₹\s?)?([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{2})?)\s*(?:Rs\.?|INR)/i,
];

const DATE_PATTERNS = [
  /(\d{1,2})[-\/](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\/](\d{2,4})/i,
  /(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/,
  /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const MERCHANT_PATTERNS = [
  /(?:to|at|from|towards)\s+(?:UPI[\/\-])?([A-Za-z0-9\s.&']+?)(?:\s+on|\s*\.|\s+via|\s+Ref|\s+UPI|\s*$)/i,
  /(?:VPA|UPI)\s+([a-zA-Z0-9@.\-]+)/i,
  /(?:Info:\s*)([A-Za-z0-9\s.&']+?)(?:\s*$|\s+Avl)/i,
];

const REF_PATTERN = /(?:Ref\.?\s*(?:No\.?\s*)?:?\s*|UPI\s*Ref:?\s*)(\d{6,})/i;

const BALANCE_PATTERNS = [
  /(?:Bal|Balance|Avl\s*Bal|Available\s*Bal)(?:ance)?[:\s]*(?:Rs\.?\s?|INR\.?\s?|₹\s?)([\d,]+(?:\.\d{1,2})?)/i,
];

function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, '');
      const amount = parseFloat(cleaned);
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }
  return null;
}

function parseType(text: string): 'INCOME' | 'EXPENSE' | null {
  if (EXPENSE_KEYWORDS.test(text)) return 'EXPENSE';
  if (INCOME_KEYWORDS.test(text)) return 'INCOME';
  return null;
}

function parseDate(text: string): Date | null {
  // Pattern 1: DD-Mon-YY or DD/Mon/YYYY
  const match1 = text.match(DATE_PATTERNS[0]);
  if (match1) {
    const day = parseInt(match1[1]);
    const month = MONTH_MAP[match1[2].toLowerCase()];
    let year = parseInt(match1[3]);
    if (year < 100) year += 2000;
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YY
  const match2 = text.match(DATE_PATTERNS[1]);
  if (match2) {
    const day = parseInt(match2[1]);
    const month = parseInt(match2[2]) - 1;
    let year = parseInt(match2[3]);
    if (year < 100) year += 2000;
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  // Pattern 3: YYYY-MM-DD
  const match3 = text.match(DATE_PATTERNS[2]);
  if (match3) {
    const year = parseInt(match3[1]);
    const month = parseInt(match3[2]) - 1;
    const day = parseInt(match3[3]);
    return new Date(year, month, day);
  }

  return null;
}

function parseMerchant(text: string): string | null {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  return null;
}

function parseReference(text: string): string | null {
  const match = text.match(REF_PATTERN);
  return match ? match[1] : null;
}

function parseBalance(text: string): number | null {
  for (const pattern of BALANCE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, '');
      const bal = parseFloat(cleaned);
      if (!isNaN(bal)) return bal;
    }
  }
  return null;
}

function categorizeFromMerchant(merchant: string | null): string {
  if (!merchant) return 'Uncategorized';

  const lower = merchant.toLowerCase();
  for (const [keyword, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return category;
    }
  }

  return 'Uncategorized';
}

export function parseSms(rawMessage: string): ParseResult {
  const amount = parseAmount(rawMessage);
  const type = parseType(rawMessage);
  const merchant = parseMerchant(rawMessage);
  const date = parseDate(rawMessage);
  const referenceId = parseReference(rawMessage);
  const balance = parseBalance(rawMessage);
  const category = categorizeFromMerchant(merchant);

  const data: ParsedSms = { amount, type, merchant, category, date, referenceId, balance };

  // Determine parse status
  if (!amount) {
    return { status: 'FAILED', data, errorReason: 'Could not extract amount from SMS' };
  }

  if (!type) {
    return { status: 'FAILED', data, errorReason: 'Could not determine transaction type (debit/credit)' };
  }

  if (!date && !merchant) {
    return { status: 'PARTIAL', data, errorReason: 'Missing date and merchant information' };
  }

  if (!date || !merchant) {
    return { status: 'PARTIAL', data, errorReason: !date ? 'Could not parse date' : 'Could not identify merchant' };
  }

  return { status: 'SUCCESS', data, errorReason: null };
}
