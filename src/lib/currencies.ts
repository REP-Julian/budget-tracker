export interface CurrencyOption {
  code: string;
  symbol: string;
  flag: string;
  name: string;
}

export const WORLD_CURRENCIES: CurrencyOption[] = [
  // Default first: Philippines
  { code: 'PHP', symbol: '₱', flag: '🇵🇭', name: 'Philippine Peso' },
  // Major & Southeast Asia
  { code: 'USD', symbol: '$', flag: '🇺🇸', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', flag: '🇪🇺', name: 'Euro' },
  { code: 'JPY', symbol: '¥', flag: '🇯🇵', name: 'Japanese Yen' },
  { code: 'GBP', symbol: '£', flag: '🇬🇧', name: 'British Pound' },
  { code: 'SGD', symbol: 'S$', flag: '🇸🇬', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', flag: '🇲🇾', name: 'Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', flag: '🇹🇭', name: 'Thai Baht' },
  { code: 'IDR', symbol: 'Rp', flag: '🇮🇩', name: 'Indonesian Rupiah' },
  { code: 'VND', symbol: '₫', flag: '🇻🇳', name: 'Vietnamese Dong' },
  // Asia Pacific
  { code: 'AUD', symbol: 'A$', flag: '🇦🇺', name: 'Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', flag: '🇳🇿', name: 'New Zealand Dollar' },
  { code: 'CAD', symbol: 'CA$', flag: '🇨🇦', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', flag: '🇨🇭', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', flag: '🇨🇳', name: 'Chinese Yuan' },
  { code: 'HKD', symbol: 'HK$', flag: '🇭🇰', name: 'Hong Kong Dollar' },
  { code: 'KRW', symbol: '₩', flag: '🇰🇷', name: 'South Korean Won' },
  { code: 'INR', symbol: '₹', flag: '🇮🇳', name: 'Indian Rupee' },
  { code: 'TWD', symbol: 'NT$', flag: '🇹🇼', name: 'New Taiwan Dollar' },
  // Middle East & Africa
  { code: 'AED', symbol: 'AED', flag: '🇦🇪', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', flag: '🇸🇦', name: 'Saudi Riyal' },
  { code: 'QAR', symbol: 'QAR', flag: '🇶🇦', name: 'Qatari Riyal' },
  { code: 'ZAR', symbol: 'R', flag: '🇿🇦', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', flag: '🇳🇬', name: 'Nigerian Naira' },
  { code: 'EGP', symbol: 'E£', flag: '🇪🇬', name: 'Egyptian Pound' },
  // Europe
  { code: 'SEK', symbol: 'kr', flag: '🇸🇪', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', flag: '🇳🇴', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', flag: '🇩🇰', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', flag: '🇵🇱', name: 'Polish Zloty' },
  { code: 'TRY', symbol: '₺', flag: '🇹🇷', name: 'Turkish Lira' },
  { code: 'CZK', symbol: 'Kč', flag: '🇨🇿', name: 'Czech Koruna' },
  { code: 'HUF', symbol: 'Ft', flag: '🇭🇺', name: 'Hungarian Forint' },
  { code: 'RON', symbol: 'lei', flag: '🇷🇴', name: 'Romanian Leu' },
  // Americas
  { code: 'MXN', symbol: 'Mex$', flag: '🇲🇽', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', flag: '🇧🇷', name: 'Brazilian Real' },
  { code: 'ARS', symbol: '$', flag: '🇦🇷', name: 'Argentine Peso' },
  { code: 'CLP', symbol: '$', flag: '🇨🇱', name: 'Chilean Peso' },
  { code: 'COP', symbol: '$', flag: '🇨🇴', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/', flag: '🇵🇪', name: 'Peruvian Sol' },
];

export const DEFAULT_CURRENCY = 'PHP';

export function getCurrencyInfo(code?: string): CurrencyOption {
  if (!code) return WORLD_CURRENCIES[0];
  const found = WORLD_CURRENCIES.find(c => c.code.toUpperCase() === code.toUpperCase());
  return found || { code, symbol: code, flag: '🌐', name: code };
}

export function getCurrencySymbol(code?: string): string {
  return getCurrencyInfo(code).symbol;
}
