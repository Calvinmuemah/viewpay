module.exports = {
  findWalletByUserId: `
    SELECT * FROM wallets WHERE user_id = $1
  `,

  findWalletByAdvertiserId: `
    SELECT * FROM wallets WHERE advertiser_id = $1
  `,

  insertWallet: `
    INSERT INTO wallets (user_id, advertiser_id, balance, pending_balance, currency)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, balance, pending_balance, currency
  `,

  updateWalletBalance: `
    UPDATE wallets 
    SET balance = balance + $1, pending_balance = pending_balance + $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING id, balance, pending_balance
  `,

  insertTransaction: `
    INSERT INTO wallet_transactions (wallet_id, amount, tx_type, description, status, reference_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, amount, tx_type, description, status, created_at
  `,

  getTransactionsByWalletId: `
    SELECT id, amount, tx_type, description, status, reference_id, created_at
    FROM wallet_transactions
    WHERE wallet_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `,

  countTransactionsByWalletId: `
    SELECT COUNT(*) FROM wallet_transactions WHERE wallet_id = $1
  `,

  getWalletStatement: `
    SELECT id, amount, tx_type, description, status, created_at
    FROM wallet_transactions
    WHERE wallet_id = $1
    ORDER BY created_at DESC
  `
};
