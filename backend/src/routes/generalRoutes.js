const express = require('express');
const router = express.Router();
const GeneralController = require('../controllers/generalController');

router.get('/faqs', GeneralController.getFaqs);
router.get('/settings', GeneralController.getSystemSettings);
router.get('/terms-privacy', GeneralController.getTermsAndPrivacy);
router.get('/cron-reset', GeneralController.cronResetBudgets);

module.exports = router;
