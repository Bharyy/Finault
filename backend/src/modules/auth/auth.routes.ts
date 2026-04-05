import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rateLimiter';
import { registerSchema, loginSchema, refreshSchema } from './auth.validation';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), (req, res, next) => {
  authController.register(req, res).catch(next);
});

router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post('/refresh', validate(refreshSchema), (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

router.post('/logout', authenticate, (req, res, next) => {
  authController.logout(req, res).catch(next);
});

router.get('/me', authenticate, (req, res, next) => {
  authController.me(req, res).catch(next);
});

export default router;
