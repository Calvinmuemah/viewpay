module.exports = {
  insertWithdrawal: `
    INSERT INTO withdrawals (user_id, amount, fee, net_amount, payment_method, payment_details, status)
    VALUES ($1, $2, $3, $4, $5, $6, 'pending')
    RETURNING id, amount, fee, net_amount, payment_method, status, created_at
  `,

  getWithdrawalById: `
    SELECT w.*, u.name as user_name, u.email as user_email
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    WHERE w.id = $1
  `,

  getWithdrawalsByUserId: `
    SELECT id, amount, fee, net_amount, payment_method, payment_details, status, admin_notes, processed_at, created_at
    FROM withdrawals
    WHERE user_id = $1
    ORDER BY created_at DESC
  `,

  updateWithdrawalStatus: `
    UPDATE withdrawals 
    SET status = $1, admin_notes = $2, processed_at = $3, updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING id, user_id, amount, status, admin_notes, processed_at
  `,

  getAllWithdrawals: `
    SELECT w.*, u.name as user_name, u.email as user_email
    FROM withdrawals w
    JOIN users u ON w.user_id = u.id
    WHERE ($1::VARCHAR IS NULL OR w.status = $1)
    ORDER BY w.created_at DESC
    LIMIT $2 OFFSET $3
  `,

  countAllWithdrawals: `
    SELECT COUNT(*) 
    FROM withdrawals 
    WHERE ($1::VARCHAR IS NULL OR status = $1)
  `
};
