// PII Scrubbing utility
// Removes or masks personally identifiable information

interface ScrubResult {
  scrubbed: string;
  detectedPII: string[];
  confidence: 'high' | 'medium' | 'low';
}

// Regex patterns for common PII
const PII_PATTERNS = {
  // Indonesian ID numbers (NIK - 16 digits)
  nik: /\b\d{16}\b/g,
  
  // Phone numbers (various formats)
  phone: /(\+?62|0)\s?-?\d{2,4}[-\s]?\d{3,4}[-\s]?\d{3,4}/g,
  
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Names (simple heuristic - capitalized words that might be names)
  // This is basic - in production you'd use NER or ML
  possibleName: /\b([A-Z][a-z]+(\s+[A-Z][a-z]+){1,3})\b/g,
  
  // Addresses (Indonesian patterns)
  address: /\b(Jl\.|Jalan|Gg\.|Gang|Rt\.?|Rw\.?)\s+[A-Za-z0-9\s,.-]+/gi,
  
  // Bank account numbers (typically 10-16 digits)
  bankAccount: /\b\d{10,16}\b/g,
};

export function scrubPII(text: string): ScrubResult {
  let scrubbed = text;
  const detectedPII: string[] = [];

  // Scrub NIK (Indonesian ID)
  const nikMatches = text.match(PII_PATTERNS.nik);
  if (nikMatches) {
    detectedPII.push(...nikMatches.map(nik => `NIK: ${nik.substring(0, 4)}***`));
    scrubbed = scrubbed.replace(PII_PATTERNS.nik, '[NIK-REDACTED]');
  }

  // Scrub phone numbers
  const phoneMatches = text.match(PII_PATTERNS.phone);
  if (phoneMatches) {
    detectedPII.push(...phoneMatches.map(phone => `Phone: ${phone.substring(0, 4)}***`));
    scrubbed = scrubbed.replace(PII_PATTERNS.phone, '[PHONE-REDACTED]');
  }

  // Scrub emails
  const emailMatches = text.match(PII_PATTERNS.email);
  if (emailMatches) {
    detectedPII.push(...emailMatches.map(email => {
      const [user, domain] = email.split('@');
      return `Email: ${user.substring(0, 2)}***@${domain}`;
    }));
    scrubbed = scrubbed.replace(PII_PATTERNS.email, '[EMAIL-REDACTED]');
  }

  // Scrub addresses
  const addressMatches = text.match(PII_PATTERNS.address);
  if (addressMatches) {
    detectedPII.push(...addressMatches.map(addr => `Address: ${addr.substring(0, 10)}...`));
    scrubbed = scrubbed.replace(PII_PATTERNS.address, '[ADDRESS-REDACTED]');
  }

  // Determine confidence based on number of PII detected
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (detectedPII.length >= 3) {
    confidence = 'high';
  } else if (detectedPII.length >= 1) {
    confidence = 'medium';
  }

  return {
    scrubbed,
    detectedPII,
    confidence,
  };
}

// Additional utility: Check if text contains potential PII
export function containsPII(text: string): boolean {
  return (
    PII_PATTERNS.nik.test(text) ||
    PII_PATTERNS.phone.test(text) ||
    PII_PATTERNS.email.test(text) ||
    PII_PATTERNS.address.test(text)
  );
}
