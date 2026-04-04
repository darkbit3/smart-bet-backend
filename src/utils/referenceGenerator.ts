/**
 * Utility functions for generating reference IDs
 */

/**
 * Generate a unique reference ID for transactions
 * @param prefix - Prefix for the reference ID (e.g., 'DEP', 'WDR', 'TRX')
 * @returns Unique reference ID string
 */
export function generateReferenceId(prefix: string = 'TRX'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${randomStr}`;
}

/**
 * Generate a unique transaction ID
 * @returns Unique transaction ID
 */
export function generateTransactionId(): string {
  return generateReferenceId('TRX');
}

/**
 * Generate a unique deposit reference ID
 * @returns Unique deposit reference ID
 */
export function generateDepositReferenceId(): string {
  return generateReferenceId('DEP');
}

/**
 * Generate a unique withdrawal reference ID
 * @returns Unique withdrawal reference ID
 */
export function generateWithdrawalReferenceId(): string {
  return generateReferenceId('WDR');
}

/**
 * Validate reference ID format
 * @param referenceId - Reference ID to validate
 * @returns True if valid, false otherwise
 */
export function validateReferenceId(referenceId: string): boolean {
  const pattern = /^[A-Z]{3,4}-[A-Z0-9]+-[A-Z0-9]{6}$/;
  return pattern.test(referenceId);
}
