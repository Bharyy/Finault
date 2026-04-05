import { Request, Response } from 'express';
import { usersService } from './users.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

export class UsersController {
  async findAll(req: Request, res: Response) {
    const result = await usersService.findAll(req.query as Record<string, string>);
    sendSuccess(res, result.users, 200, result.meta);
  }

  async findById(req: Request, res: Response) {
    const user = await usersService.findById(req.params.id as string);
    sendSuccess(res, user);
  }

  async create(req: Request, res: Response) {
    const user = await usersService.create(req.body);
    sendSuccess(res, user, 201);
  }

  async update(req: Request, res: Response) {
    const user = await usersService.update(req.params.id as string, req.body, req.user!.userId);
    sendSuccess(res, user);
  }

  async remove(req: Request, res: Response) {
    const result = await usersService.softDelete(req.params.id as string, req.user!.userId);
    sendSuccess(res, result);
  }
}

export const usersController = new UsersController();
