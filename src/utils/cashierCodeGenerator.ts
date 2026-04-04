/**
 * Generates a 5-character mixed alphanumeric cashier code
 * Format: 3 letters + 2 numbers (e.g., ABC12, XYZ78)
 */
export function generateCashierCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let code = '';
  
  // Generate 3 random letters
  for (let i = 0; i < 3; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // Generate 2 random numbers
  for (let i = 0; i < 2; i++) {
    code += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return code;
}

/**
 * Validates cashier code format
 */
export function validateCashierCode(code: string): boolean {
  const pattern = /^[A-Z]{3}[0-9]{2}$/;
  return pattern.test(code);
}
