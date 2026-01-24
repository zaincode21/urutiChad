const express = require('express');
const database = require('../database/database');
const { managerAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /translations/{language}/{namespace}:
 *   get:
 *     summary: Get translations for a specific language and namespace
 *     tags: [Translations]
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: namespace
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:language/:namespace', async (req, res) => {
    try {
        const { language, namespace } = req.params;

        const translations = await database.all(
            'SELECT key, value FROM translations WHERE language = $1 AND namespace = $2',
            [language, namespace]
        );

        // Convert array to nested object
        const translationObject = {};
        translations.forEach(({ key, value }) => {
            setNestedValue(translationObject, key, value);
        });

        res.json(translationObject);
    } catch (error) {
        console.error('Get translations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /translations/{language}:
 *   get:
 *     summary: Get all translations for a specific language
 *     tags: [Translations]
 *     parameters:
 *       - in: path
 *         name: language
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:language', async (req, res) => {
    try {
        const { language } = req.params;

        const translations = await database.all(
            'SELECT namespace, key, value FROM translations WHERE language = $1',
            [language]
        );

        // Group by namespace
        const translationsByNamespace = {};
        translations.forEach(({ namespace, key, value }) => {
            if (!translationsByNamespace[namespace]) {
                translationsByNamespace[namespace] = {};
            }
            setNestedValue(translationsByNamespace[namespace], key, value);
        });

        res.json(translationsByNamespace);
    } catch (error) {
        console.error('Get all translations error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /translations:
 *   post:
 *     summary: Create or update a translation
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', managerAuth, async (req, res) => {
    try {
        const { language, namespace, key, value } = req.body;

        if (!language || !namespace || !key || !value) {
            return res.status(400).json({
                error: 'Missing required fields: language, namespace, key, value'
            });
        }

        // Upsert translation
        await database.run(`
      INSERT INTO translations (language, namespace, key, value)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (language, namespace, key)
      DO UPDATE SET value = $4, updated_at = CURRENT_TIMESTAMP
    `, [language, namespace, key, value]);

        res.status(201).json({
            message: 'Translation saved successfully',
            translation: { language, namespace, key, value }
        });
    } catch (error) {
        console.error('Create translation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /translations/{id}:
 *   put:
 *     summary: Update a translation
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', managerAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { value } = req.body;

        if (!value) {
            return res.status(400).json({ error: 'Value is required' });
        }

        await database.run(
            'UPDATE translations SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [value, id]
        );

        res.json({ message: 'Translation updated successfully' });
    } catch (error) {
        console.error('Update translation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /translations/{id}:
 *   delete:
 *     summary: Delete a translation
 *     tags: [Translations]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', managerAuth, async (req, res) => {
    try {
        const { id } = req.params;

        await database.run('DELETE FROM translations WHERE id = $1', [id]);

        res.json({ message: 'Translation deleted successfully' });
    } catch (error) {
        console.error('Delete translation error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Helper function to set nested object values from dot notation keys
 * Example: "filters.title" -> { filters: { title: value } }
 */
function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((acc, key) => {
        if (!acc[key]) acc[key] = {};
        return acc[key];
    }, obj);
    target[lastKey] = value;
}

module.exports = router;
