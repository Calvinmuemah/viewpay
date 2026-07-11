module.exports = {
  findAdvertiserByEmail: `
    SELECT * FROM advertisers WHERE email = $1
  `,

  findAdvertiserById: `
    SELECT id, company_name, contact_name, email, is_verified, balance, status, failed_login_attempts, locked_until, created_at 
    FROM advertisers 
    WHERE id = $1
  `,

  insertAdvertiser: `
    INSERT INTO advertisers (company_name, contact_name, email, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, company_name, contact_name, email, created_at
  `,

  verifyAdvertiserEmail: `
    UPDATE advertisers SET is_verified = TRUE WHERE email = $1 RETURNING id, is_verified
  `,

  updateFailedAttempts: `
    UPDATE advertisers 
    SET failed_login_attempts = $1, locked_until = $2 
    WHERE id = $3
  `,

  resetFailedAttempts: `
    UPDATE advertisers 
    SET failed_login_attempts = 0, locked_until = NULL 
    WHERE id = $1
  `,

  updateAdvertiserPassword: `
    UPDATE advertisers SET password_hash = $1 WHERE email = $2
  `,

  updateAdvertiserBalance: `
    UPDATE advertisers 
    SET balance = balance + $1 
    WHERE id = $2
    RETURNING balance
  `,

  getCampaignsByAdvertiser: `
    SELECT * FROM campaigns WHERE advertiser_id = $1 ORDER BY created_at DESC
  `,

  getInvoicesByAdvertiser: `
    SELECT * FROM invoices WHERE advertiser_id = $1 ORDER BY created_at DESC
  `,

  getDepositsByAdvertiser: `
    SELECT * FROM deposits WHERE advertiser_id = $1 ORDER BY created_at DESC
  `
};
