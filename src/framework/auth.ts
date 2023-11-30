import jwt from 'jsonwebtoken';
import { Roles } from './roles.interface';

export interface JWT {
  uuid: string;
  name: string;
  email: string;
  rol: Roles;
  expires: Date;
}

export default function authMiddleware(req: any, res: any, next: any) {
	const token = req.headers.authorization;
	const secretKey = process.env.JWT_SECRET || '';
	if (!token) {
		return res.status(401).json({ message: 'Permission denied' });
	}

	jwt.verify(token, secretKey, (err: any, decoded: any) => {
		if (err) {
			return res.status(403).json({ message: 'Invalid token' });
		}
		if (new Date(decoded.expires) < new Date()) {
			return res.status(403).json({ message: 'Token expired' });
		}

		req.user = decoded;
		next();
	});
}
