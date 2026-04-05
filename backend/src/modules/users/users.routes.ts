import { Router } from 'express';
import { usersController } from './users.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { createUserSchema, updateUserSchema, userQuerySchema } from './users.validation';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', validate(userQuerySchema, 'query'), (req, res, next) => {
  usersController.findAll(req, res).catch(next);
});

router.get('/:id', (req, res, next) => {
  usersController.findById(req, res).catch(next);
});

router.post('/', validate(createUserSchema), (req, res, next) => {
  usersController.create(req, res).catch(next);
});

router.patch('/:id', validate(updateUserSchema), (req, res, next) => {
  usersController.update(req, res).catch(next);
});

router.delete('/:id', (req, res, next) => {
  usersController.remove(req, res).catch(next);
});

export default router;
