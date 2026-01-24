/**
 * Translations Database Schema
 * Stores all i18n translations in the database
 */

async function createTranslationsTable(db) {
    await db.query(`
    CREATE TABLE IF NOT EXISTS translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      language VARCHAR(10) NOT NULL,
      namespace VARCHAR(50) NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(language, namespace, key)
    );

    CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language);
    CREATE INDEX IF NOT EXISTS idx_translations_namespace ON translations(namespace);
    CREATE INDEX IF NOT EXISTS idx_translations_lang_ns ON translations(language, namespace);
  `);

    console.log('✅ Translations table created successfully');
}

module.exports = {
    createTranslationsTable
};
