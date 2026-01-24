const express = require('express');
const { body, validationResult } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const integrationService = require('../services/integrationService');

const router = express.Router();

// Get all integrations
router.get('/', auth, async (req, res) => {
  try {
    const integrations = await integrationService.getIntegrations(req.query);
    res.json({ integrations });
  } catch (error) {
    console.error('Get integrations error:', error);
    res.status(500).json({ error: 'Failed to get integrations' });
  }
});

// Get integration by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const integration = await integrationService.getIntegrationById(req.params.id);
    res.json({ integration });
  } catch (error) {
    console.error('Get integration error:', error);
    res.status(404).json({ error: 'Integration not found' });
  }
});

// Create new integration
router.post('/', adminAuth, [
  body('name').notEmpty().withMessage('Integration name is required'),
  body('type').isIn(['api', 'webhook', 'oauth']).withMessage('Invalid integration type'),
  body('provider').notEmpty().withMessage('Provider is required'),
  body('api_key').notEmpty().withMessage('API key is required'),
  body('base_url').notEmpty().withMessage('Base URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const integration = await integrationService.createIntegration(req.body);
    res.status(201).json({ integration });
  } catch (error) {
    console.error('Create integration error:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration
router.put('/:id', adminAuth, [
  body('name').notEmpty().withMessage('Integration name is required'),
  body('type').isIn(['api', 'webhook', 'oauth']).withMessage('Invalid integration type'),
  body('provider').notEmpty().withMessage('Provider is required'),
  body('api_key').notEmpty().withMessage('API key is required'),
  body('base_url').notEmpty().withMessage('Base URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const integration = await integrationService.updateIntegration(req.params.id, req.body);
    res.json({ integration });
  } catch (error) {
    console.error('Update integration error:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Delete integration
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const result = await integrationService.deleteIntegration(req.params.id);
    res.json({ result });
  } catch (error) {
    console.error('Delete integration error:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// Test integration connection
router.post('/:id/test', auth, async (req, res) => {
  try {
    const result = await integrationService.testIntegration(req.params.id);
    res.json({ result });
  } catch (error) {
    console.error('Test integration error:', error);
    res.status(500).json({ error: 'Failed to test integration' });
  }
});

// Execute integration action
router.post('/:id/execute', auth, [
  body('action').isIn(['sync_products', 'sync_orders', 'sync_customers', 'send_webhook']).withMessage('Invalid action'),
  body('data').isObject().withMessage('Data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await integrationService.executeIntegration(
      req.params.id, 
      req.body.action, 
      req.body.data
    );
    res.json({ result });
  } catch (error) {
    console.error('Execute integration error:', error);
    res.status(500).json({ error: 'Failed to execute integration' });
  }
});

// Get integration executions
router.get('/:id/executions', auth, async (req, res) => {
  try {
    const executions = await integrationService.getExecutions(req.params.id, req.query);
    res.json({ executions });
  } catch (error) {
    console.error('Get executions error:', error);
    res.status(500).json({ error: 'Failed to get executions' });
  }
});

// Get integration analytics
router.get('/analytics/overview', auth, async (req, res) => {
  try {
    const period = req.query.period || '30';
    const analytics = await integrationService.getIntegrationAnalytics(period);
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Sync products with external system
router.post('/:id/sync/products', auth, async (req, res) => {
  try {
    const result = await integrationService.executeIntegration(
      req.params.id, 
      'sync_products', 
      req.body
    );
    res.json({ result });
  } catch (error) {
    console.error('Sync products error:', error);
    res.status(500).json({ error: 'Failed to sync products' });
  }
});

// Sync orders with external system
router.post('/:id/sync/orders', auth, async (req, res) => {
  try {
    const result = await integrationService.executeIntegration(
      req.params.id, 
      'sync_orders', 
      req.body
    );
    res.json({ result });
  } catch (error) {
    console.error('Sync orders error:', error);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
});

// Sync customers with external system
router.post('/:id/sync/customers', auth, async (req, res) => {
  try {
    const result = await integrationService.executeIntegration(
      req.params.id, 
      'sync_customers', 
      req.body
    );
    res.json({ result });
  } catch (error) {
    console.error('Sync customers error:', error);
    res.status(500).json({ error: 'Failed to sync customers' });
  }
});

// Send webhook
router.post('/:id/webhook', auth, async (req, res) => {
  try {
    const result = await integrationService.executeIntegration(
      req.params.id, 
      'send_webhook', 
      req.body
    );
    res.json({ result });
  } catch (error) {
    console.error('Send webhook error:', error);
    res.status(500).json({ error: 'Failed to send webhook' });
  }
});

module.exports = router; 