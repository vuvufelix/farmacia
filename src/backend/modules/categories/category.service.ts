import db from '../../database/db.js';
import crypto from 'crypto';

export class CategoryService {
  static async listCategories() {
    // Aponta para a tabela mapeada 'categories'
    const stmt = db.prepare('SELECT * FROM categories ORDER BY name ASC');
    return stmt.all();
  }

  static async createCategory(data: { name: string; description?: string }) {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO categories (id, name, createdAt, updatedAt) 
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(id, data.name.trim());
    
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  }
}