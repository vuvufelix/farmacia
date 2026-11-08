// src/backend/modules/license/license.controller.ts
import { Request, Response } from 'express';
import { LicenseService } from './license.service.js';

export class LicenseController {
  static async getStatus(req: Request, res: Response) {
    try {
      const status = await LicenseService.getStatus();
      return res.json(status);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async activate(req: Request, res: Response) {
    try {
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: 'Por favor, forneça a chave de ativação.' });
      }

      const result = await LicenseService.activateWithKey(key);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}