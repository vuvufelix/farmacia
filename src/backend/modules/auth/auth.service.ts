import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../../database/db.js';
import { env } from '../../config/environment.js';

export class AuthService {
  static async login(username: string, pass: string) {
    const user: any = db.prepare('SELECT * FROM User WHERE username = ?').get(username);

    if (!user || user.active === 0) {
      throw new Error('Utilizador não encontrado ou inativo');
    }

    const passwordMatch = await bcrypt.compare(pass, user.password);
    if (!passwordMatch) {
      throw new Error('Senha incorreta');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role
      }
    };
  }
}