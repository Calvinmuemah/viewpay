module.exports = {
  createTicket: `
    INSERT INTO support_tickets (user_id, advertiser_id, subject, status)
    VALUES ($1, $2, $3, 'open')
    RETURNING id, subject, status, created_at
  `,

  createMessage: `
    INSERT INTO support_messages (ticket_id, sender_type, sender_id, message)
    VALUES ($1, $2, $3, $4)
    RETURNING id, sender_type, sender_id, message, created_at
  `,

  getTicketsByUser: `
    SELECT id, subject, status, created_at, updated_at
    FROM support_tickets
    WHERE user_id = $1
    ORDER BY updated_at DESC
  `,

  getTicketsByAdvertiser: `
    SELECT id, subject, status, created_at, updated_at
    FROM support_tickets
    WHERE advertiser_id = $1
    ORDER BY updated_at DESC
  `,

  getTicketById: `
    SELECT * FROM support_tickets WHERE id = $1
  `,

  getMessagesByTicketId: `
    SELECT id, sender_type, sender_id, message, created_at
    FROM support_messages
    WHERE ticket_id = $1
    ORDER BY created_at ASC
  `,

  updateTicketStatus: `
    UPDATE support_tickets 
    SET status = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2 
    RETURNING id, status, updated_at
  `,

  getAllTickets: `
    SELECT t.*, 
      u.name as user_name, u.email as user_email,
      adv.company_name as advertiser_company, adv.email as advertiser_email
    FROM support_tickets t
    LEFT JOIN users u ON t.user_id = u.id
    LEFT JOIN advertisers adv ON t.advertiser_id = adv.id
    ORDER BY t.updated_at DESC
    LIMIT $1 OFFSET $2
  `,

  countAllTickets: `
    SELECT COUNT(*) FROM support_tickets
  `
};
