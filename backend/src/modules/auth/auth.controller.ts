import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201);
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    sendSuccess(res, result);
  }

  async refresh(req: Request, res: Response) {
    const result = await authService.refreshToken(req.body.refreshToken);
    sendSuccess(res, result);
  }

  async logout(req: Request, res: Response) {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { message: 'Logged out successfully' });
  }

  async me(req: Request, res: Response) {
    const user = await authService.getProfile(req.user!.userId);
    sendSuccess(res, user);
  }
}

export const authController = new AuthController();
