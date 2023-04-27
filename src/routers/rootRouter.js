import express from 'express';
import {
  getJoin,
  postJoin,
  getLogin,
  postLogin,
  logout,
} from '../controllers/userController';
import { home, search } from '../controllers/videoController';
import { protectUrlMiddleware, publicOnlyMiddleware } from '../middlewares';

export const rootRouter = express.Router();

rootRouter.get('/', home);
rootRouter.route('/join').all(publicOnlyMiddleware).get(getJoin).post(postJoin);
rootRouter
  .route('/login')
  .all(publicOnlyMiddleware)
  .get(getLogin)
  .post(postLogin);
rootRouter.get('/search', search);
rootRouter.get('/logout', protectUrlMiddleware, logout);
