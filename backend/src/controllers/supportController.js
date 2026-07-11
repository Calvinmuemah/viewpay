const db = require('../config/db');
const supportQueries = require('../queries/supportQueries');

class SupportController {
  static async createTicket(req, res, next) {
    try {
      const { subject, message } = req.body;
      if (!subject || !message) {
        return res.status(400).json({ success: false, message: 'subject and message are required' });
      }

      const isUser = req.user ? true : false;
      const id = isUser ? req.user.id : req.advertiser.id;

      const result = await db.transaction(async (client) => {
        // 1. Create Ticket
        const ticketRes = await client.query(supportQueries.createTicket, [
          isUser ? id : null,
          !isUser ? id : null,
          subject
        ]);

        const ticket = ticketRes.rows[0];

        // 2. Create Message
        await client.query(supportQueries.createMessage, [
          ticket.id,
          isUser ? 'user' : 'advertiser',
          id,
          message
        ]);

        return ticket;
      });

      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMyTickets(req, res, next) {
    try {
      const isUser = req.user ? true : false;
      const id = isUser ? req.user.id : req.advertiser.id;

      const queryStr = isUser ? supportQueries.getTicketsByUser : supportQueries.getTicketsByAdvertiser;
      const result = await db.query(queryStr, [id]);

      res.status(200).json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTicketDetails(req, res, next) {
    try {
      const { id } = req.params;
      
      // Fetch Ticket
      const ticketRes = await db.query(supportQueries.getTicketById, [id]);
      if (ticketRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const ticket = ticketRes.rows[0];

      // Security check
      if (req.user && ticket.user_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      if (req.advertiser && ticket.advertiser_id !== req.advertiser.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const messages = await db.query(supportQueries.getMessagesByTicketId, [id]);

      res.status(200).json({
        success: true,
        data: {
          ticket,
          messages: messages.rows
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async replyTicket(req, res, next) {
    try {
      const { id } = req.params;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, message: 'Message cannot be empty' });
      }

      // Fetch Ticket
      const ticketRes = await db.query(supportQueries.getTicketById, [id]);
      if (ticketRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const ticket = ticketRes.rows[0];
      let senderType = 'admin';
      let senderId = req.admin ? req.admin.id : null;

      if (req.user) {
        if (ticket.user_id !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
        senderType = 'user';
        senderId = req.user.id;
      } else if (req.advertiser) {
        if (ticket.advertiser_id !== req.advertiser.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
        senderType = 'advertiser';
        senderId = req.advertiser.id;
      }

      const result = await db.transaction(async (client) => {
        // Add Message
        const msgRes = await client.query(supportQueries.createMessage, [
          id,
          senderType,
          senderId,
          message
        ]);

        // Update Ticket Update status
        const nextStatus = senderType === 'admin' ? 'pending_user' : 'open';
        await client.query(supportQueries.updateTicketStatus, [nextStatus, id]);

        return msgRes.rows[0];
      });

      res.status(200).json({
        success: true,
        message: 'Message sent successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminGetTickets(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const countRes = await db.query(supportQueries.countAllTickets);
      const total = parseInt(countRes.rows[0].count);

      const tickets = await db.query(supportQueries.getAllTickets, [limit, offset]);

      res.status(200).json({
        success: true,
        data: {
          tickets: tickets.rows,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminResolveTicket(req, res, next) {
    try {
      const { id } = req.params;
      const result = await db.query(supportQueries.updateTicketStatus, ['closed', id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      res.status(200).json({
        success: true,
        message: 'Ticket resolved and closed',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SupportController;
