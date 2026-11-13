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
      // Recebe o pacote completo enviado pelo frontend: { licenseKey, payload, signature }
      const signedData = req.body;
      
      if (!signedData || !signedData.licenseKey || !signedData.payload || !signedData.signature) {
        return res.status(400).json({ error: 'Pacote de ativação incompleto ou inválido.' });
      }

      const result = await LicenseService.activateLicense(signedData);
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}