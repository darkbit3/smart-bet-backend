import { Router } from 'express';
import { voucherController } from '../controllers/voucher.controller';
import { authenticateToken } from '../middleware/authenticate';

const router = Router();

// Create a new voucher (admin only)
router.post('/create', voucherController.createVoucher);

// Get voucher by code
router.get('/:voucher_code', voucherController.getVoucherByCode);

// Process voucher deposit
router.post('/deposit', authenticateToken, voucherController.processVoucherDeposit);

// Process voucher withdrawal
router.post('/withdraw', authenticateToken, voucherController.processVoucherWithdraw);

// Get vouchers by phone number
router.get('/phone/:phone_number', authenticateToken, voucherController.getVouchersByPhoneNumber);

// Mark expired vouchers as returned (cleanup job)
router.post('/cleanup', authenticateToken, voucherController.markExpiredVouchers);

// Return expired vouchers to owners (24-hour auto-return)
router.post('/return-expired', authenticateToken, voucherController.returnExpiredVouchers);

// Voucher withdrawal API
router.post('/withdrawal', authenticateToken, voucherController.processVoucherWithdraw);

export default router;
