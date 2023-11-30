import { Router } from 'express';
import {
	activeUser,
	createUser,
	deactiveUser,
	deleteUser,
	getUser,
	listUsers,
	loginUser,
	updateUser,
} from './user.controller';
import authMiddleware from '../framework/auth';

const router = Router();
router.post('/', createUser);
router.put('/:uuid', authMiddleware, updateUser);
router.delete('/:uuid', authMiddleware, deleteUser);
router.patch('/active/:uuid', authMiddleware, activeUser);
router.patch('/deactive/:uuid', authMiddleware, deactiveUser);
router.post('/login', loginUser);
router.get('/', authMiddleware, listUsers);
router.get('/:uuid', authMiddleware, getUser);

export default router;
