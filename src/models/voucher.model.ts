export interface Voucher {
    id: number;
    voucher_code: string;
    withdraw_phone_number?: string;
    deposit_phone_number?: string;
    amount: number;
    status: 'pending' | 'return' | 'completed';
    time: string;
    created_at: string;
    updated_at: string;
}

export interface CreateVoucherData {
    voucher_code: string;
    withdraw_phone_number?: string;
    deposit_phone_number?: string;
    amount: number;
    status?: 'pending' | 'return' | 'completed';
}

export interface UpdateVoucherData {
    withdraw_phone_number?: string;
    deposit_phone_number?: string;
    status?: 'pending' | 'return' | 'completed';
}
