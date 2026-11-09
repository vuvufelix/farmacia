import db from '../../database/db.js';
import crypto from 'crypto';

export class CategoryService {
  static async listCategories() {
    const stmt = db.prepare('SELECT * FROM Category ORDER BY name ASC');
    return stmt.all();
  }

  static async createCategory(data: { name: string; description?: string }) {
    const id = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO Category (id, name, description) 
      VALUES (?, ?, ?)
    `);
    stmt.run(id, data.name, data.description || null);
    
    return db.prepare('SELECT * FROM Category WHERE id = ?').get(id);
  }
}