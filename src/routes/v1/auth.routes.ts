import { Router } from 'express';
import { AuthController } from '../../controllers/auth.controller.js';

export default Router()
  .post('/auth/login', AuthController.login)
  .post('/auth/refresh', AuthController.refresh)
  .post('/auth/logout', AuthController.logout);



