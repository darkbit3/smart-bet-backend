import { dbManager } from '../database/databaseManager';

export class CashierUserHistoryService {
  static async searchUserHistory(phoneNumber: string) {
    try {
      console.log('Starting phone search for:', phoneNumber);
      
      const sqlite = dbManager.getSQLite();
      console.log('Database connection status:', dbManager.isDBConnected());
      
      // Normalize phone number for consistent search
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      console.log('Normalized phone number:', normalizedPhone);
      
      // Search transactions by phone number with multiple formats - fetch ALL transactions
      const transactionsQuery = `
        SELECT 
          id,
          phone_number,
          amount,
          type,
          status,
          reference,
          created_at
        FROM transactions
        WHERE (
          phone_number = ? OR 
          phone_number = ? OR
          phone_number LIKE ? OR
          phone_number LIKE ?
        )
        ORDER BY created_at DESC
        -- No LIMIT clause - fetch all transactions
      `;
      
      console.log('Executing query:', transactionsQuery);
      
      // Create multiple search patterns for different phone formats
      const searchPatterns = [
        normalizedPhone,                    // Exact match (+251909090998)
        normalizedPhone.replace('+251', '9'), // Without prefix (909090998)
        `%${normalizedPhone}%`,              // Contains (+251909090998)
        `%${normalizedPhone.replace('+251', '9')}%` // Contains without prefix (909090998)
      ];
      
      console.log('Search patterns:', searchPatterns);
      
      // First, let's try a simple query to check if the table exists
      try {
        const tableCheck = await sqlite.all("SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'");
        console.log('Table check result:', tableCheck);
        
        if (tableCheck.length === 0) {
          console.log('Table transactions does not exist. Checking available tables...');
          const allTables = await sqlite.all("SELECT name FROM sqlite_master WHERE type='table'");
          console.log('All available tables:', allTables);
        }
      } catch (tableError) {
        console.log('Error checking table existence:', tableError);
      }
      
      const transactions = await sqlite.all(transactionsQuery, searchPatterns);
      
      console.log(`Phone search for ${normalizedPhone}: Found ${transactions.length} transactions`);
      console.log('Transactions:', transactions);
      
      return {
        success: true,
        data: {
          transactions: transactions.map((t: any) => ({
            id: t.id.toString(),
            type: t.type, // 'withdrawal', 'deposit', etc.
            description: this.getTransactionDescription(t.type, t.amount),
            date: t.created_at,
            amount: t.amount,
            status: t.status,
            phone_number: t.phone_number,
            reference: t.reference,
            // Adding missing fields for frontend compatibility
            username: 'Unknown', // No player data available
            cashier_name: 'Unknown', // No cashier data available
            transaction_type: t.type, // Map type to transaction_type for frontend
            balance_before: 0, // Not available in this table
            balance_after: 0 // Not available in this table
          }))
        }
      };
      
    } catch (error) {
      console.error('Error searching user history:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      return { success: false, message: `Server error while searching user history: ${error.message}` };
    }
  }

  private static normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Handle +251 format - keep as +251 format since that's how it's stored
    if (phone.startsWith('+251') && digits.length >= 12) {
      const phoneNumber = digits.substring(2); // Remove +25
      if (phoneNumber.startsWith('9') && phoneNumber.length >= 9) {
        return '+251' + phoneNumber.substring(0, 9); // Keep +251 format
      }
    }
    
    // Handle 09 format - convert to +251 format for database search
    if (phone.startsWith('09') && digits.length >= 10) {
      return '+251' + digits.substring(1, 10); // Convert 09 to +2519
    }
    
    // Handle 9 format - convert to +251 format
    if (phone.startsWith('9') && digits.length >= 9) {
      return '+251' + digits.substring(0, 9); // Convert 9 to +2519
    }
    
    // Return original if no pattern matches
    return phone;
  }

  private static getTransactionDescription(type: string, amount: number): string {
    switch (type) {
      case "deposit":
        return `Deposited $${amount.toFixed(2)}`;
      case "withdraw":
        return `Withdrew $${amount.toFixed(2)}`;
      case "bet":
        return `Placed bet of $${amount.toFixed(2)}`;
      default:
        return `${type} transaction of $${amount.toFixed(2)}`;
    }
  }
}
