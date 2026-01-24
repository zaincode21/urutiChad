const { v4: uuidv4 } = require('uuid');
const database = require('../database/database');
const axios = require('axios');

class IntegrationService {
  /**
   * Create new integration
   */
  async createIntegration(integrationData) {
    try {
      const {
        name, type, provider, api_key, api_secret, webhook_url,
        base_url, endpoints, config, is_active
      } = integrationData;

      const integrationId = uuidv4();
      await database.run(`
        INSERT INTO integrations (
          id, name, type, provider, api_key, api_secret, webhook_url,
          base_url, endpoints, config, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        integrationId, name, type, provider, api_key, api_secret, webhook_url,
        base_url, JSON.stringify(endpoints || {}), JSON.stringify(config || {}), is_active
      ]);

      return { id: integrationId, name };
    } catch (error) {
      console.error('Create integration error:', error);
      throw error;
    }
  }

  /**
   * Get all integrations
   */
  async getIntegrations(filters = {}) {
    try {
      let query = `
        SELECT * FROM integrations 
        WHERE 1=1
      `;

      const params = [];
      if (filters.type) {
        query += ' AND type = ?';
        params.push(filters.type);
      }
      if (filters.provider) {
        query += ' AND provider = ?';
        params.push(filters.provider);
      }
      if (filters.is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      query += ' ORDER BY created_at DESC';

      const integrations = await database.all(query, params);
      return integrations.map(integration => ({
        ...integration,
        endpoints: integration.endpoints ? JSON.parse(integration.endpoints) : {},
        config: integration.config ? JSON.parse(integration.config) : {}
      }));
    } catch (error) {
      console.error('Get integrations error:', error);
      throw error;
    }
  }

  /**
   * Get integration by ID
   */
  async getIntegrationById(integrationId) {
    try {
      const integration = await database.get(`
        SELECT * FROM integrations WHERE id = ?
      `, [integrationId]);

      if (!integration) {
        throw new Error('Integration not found');
      }

      return {
        ...integration,
        endpoints: integration.endpoints ? JSON.parse(integration.endpoints) : {},
        config: integration.config ? JSON.parse(integration.config) : {}
      };
    } catch (error) {
      console.error('Get integration error:', error);
      throw error;
    }
  }

  /**
   * Update integration
   */
  async updateIntegration(integrationId, updateData) {
    try {
      const {
        name, type, provider, api_key, api_secret, webhook_url,
        base_url, endpoints, config, is_active
      } = updateData;

      await database.run(`
        UPDATE integrations SET
          name = ?, type = ?, provider = ?, api_key = ?, api_secret = ?,
          webhook_url = ?, base_url = ?, endpoints = ?, config = ?, is_active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        name, type, provider, api_key, api_secret, webhook_url,
        base_url, JSON.stringify(endpoints || {}), JSON.stringify(config || {}), is_active,
        integrationId
      ]);

      return { id: integrationId, name };
    } catch (error) {
      console.error('Update integration error:', error);
      throw error;
    }
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId) {
    try {
      await database.run('DELETE FROM integrations WHERE id = ?', [integrationId]);
      return { success: true };
    } catch (error) {
      console.error('Delete integration error:', error);
      throw error;
    }
  }

  /**
   * Test integration connection
   */
  async testIntegration(integrationId) {
    try {
      const integration = await this.getIntegrationById(integrationId);
      
      if (!integration.is_active) {
        throw new Error('Integration is not active');
      }

      // Test the connection based on integration type
      switch (integration.type) {
        case 'api':
          return await this.testApiConnection(integration);
        case 'webhook':
          return await this.testWebhookConnection(integration);
        case 'oauth':
          return await this.testOAuthConnection(integration);
        default:
          throw new Error('Unsupported integration type');
      }
    } catch (error) {
      console.error('Test integration error:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testApiConnection(integration) {
    try {
      const testEndpoint = integration.endpoints.test || '/test';
      const response = await axios.get(`${integration.base_url}${testEndpoint}`, {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Test webhook connection
   */
  async testWebhookConnection(integration) {
    try {
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: { message: 'Test webhook connection' }
      };

      const response = await axios.post(integration.webhook_url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': integration.api_key
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Test OAuth connection
   */
  async testOAuthConnection(integration) {
    try {
      // For OAuth, we typically test the token endpoint
      const tokenEndpoint = integration.endpoints.token || '/oauth/token';
      const response = await axios.post(`${integration.base_url}${tokenEndpoint}`, {
        grant_type: 'client_credentials',
        client_id: integration.api_key,
        client_secret: integration.api_secret
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.status,
        data: { access_token: '***' } // Don't expose the actual token
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Execute integration action
   */
  async executeIntegration(integrationId, action, data = {}) {
    try {
      const integration = await this.getIntegrationById(integrationId);
      
      if (!integration.is_active) {
        throw new Error('Integration is not active');
      }

      // Log the execution
      const executionId = uuidv4();
      await database.run(`
        INSERT INTO integration_executions (
          id, integration_id, action, request_data, status
        ) VALUES (?, ?, ?, ?, ?)
      `, [executionId, integrationId, action, JSON.stringify(data), 'pending']);

      let result;
      switch (action) {
        case 'sync_products':
          result = await this.syncProducts(integration, data);
          break;
        case 'sync_orders':
          result = await this.syncOrders(integration, data);
          break;
        case 'sync_customers':
          result = await this.syncCustomers(integration, data);
          break;
        case 'send_webhook':
          result = await this.sendWebhook(integration, data);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      // Update execution status
      await database.run(`
        UPDATE integration_executions 
        SET status = ?, response_data = ?, completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [result.success ? 'completed' : 'failed', JSON.stringify(result), executionId]);

      return result;
    } catch (error) {
      console.error('Execute integration error:', error);
      throw error;
    }
  }

  /**
   * Sync products with external system
   */
  async syncProducts(integration, data) {
    try {
      const endpoint = integration.endpoints.products || '/products';
      const response = await axios.post(`${integration.base_url}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data,
        synced_count: data.products?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync orders with external system
   */
  async syncOrders(integration, data) {
    try {
      const endpoint = integration.endpoints.orders || '/orders';
      const response = await axios.post(`${integration.base_url}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data,
        synced_count: data.orders?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sync customers with external system
   */
  async syncCustomers(integration, data) {
    try {
      const endpoint = integration.endpoints.customers || '/customers';
      const response = await axios.post(`${integration.base_url}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${integration.api_key}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data,
        synced_count: data.customers?.length || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send webhook to external system
   */
  async sendWebhook(integration, data) {
    try {
      const response = await axios.post(integration.webhook_url, data, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': integration.api_key
        }
      });

      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get integration executions
   */
  async getExecutions(integrationId, filters = {}) {
    try {
      let query = `
        SELECT ie.*, i.name as integration_name
        FROM integration_executions ie
        JOIN integrations i ON ie.integration_id = i.id
        WHERE ie.integration_id = ?
      `;

      const params = [integrationId];
      
      if (filters.status) {
        query += ' AND ie.status = ?';
        params.push(filters.status);
      }
      if (filters.action) {
        query += ' AND ie.action = ?';
        params.push(filters.action);
      }

      query += ' ORDER BY ie.created_at DESC LIMIT 100';

      const executions = await database.all(query, params);
      return executions.map(execution => ({
        ...execution,
        request_data: execution.request_data ? JSON.parse(execution.request_data) : {},
        response_data: execution.response_data ? JSON.parse(execution.response_data) : {}
      }));
    } catch (error) {
      console.error('Get executions error:', error);
      throw error;
    }
  }

  /**
   * Get integration analytics
   */
  async getIntegrationAnalytics(period = '30') {
    try {
      // Overall statistics
      const overallStats = await database.get(`
        SELECT 
          COUNT(*) as total_integrations,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_integrations,
          COUNT(DISTINCT type) as integration_types,
          COUNT(DISTINCT provider) as providers
        FROM integrations 
        WHERE created_at >= datetime('now', '-${period} days')
      `);

      // Execution statistics
      const executionStats = await database.get(`
        SELECT 
          COUNT(*) as total_executions,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_executions,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_executions,
          AVG(CASE WHEN completed_at IS NOT NULL 
            THEN (julianday(completed_at) - julianday(created_at)) * 24 * 60 * 60 
            ELSE NULL END) as avg_execution_time
        FROM integration_executions 
        WHERE created_at >= datetime('now', '-${period} days')
      `);

      // Top integrations by usage
      const topIntegrations = await database.all(`
        SELECT 
          i.name, i.type, i.provider,
          COUNT(ie.id) as execution_count,
          SUM(CASE WHEN ie.status = 'completed' THEN 1 ELSE 0 END) as success_count
        FROM integrations i
        LEFT JOIN integration_executions ie ON i.id = ie.integration_id
        WHERE ie.created_at >= datetime('now', '-${period} days')
        GROUP BY i.id
        ORDER BY execution_count DESC
        LIMIT 10
      `);

      return {
        overall_stats: overallStats,
        execution_stats: executionStats,
        top_integrations: topIntegrations
      };
    } catch (error) {
      console.error('Get integration analytics error:', error);
      throw error;
    }
  }
}

module.exports = new IntegrationService(); 