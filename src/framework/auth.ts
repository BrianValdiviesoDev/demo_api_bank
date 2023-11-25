import jwt from "jsonwebtoken";

export interface JWT {
  uuid: string;
  name: string;
  email: string;
}

export default function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization;
  const secretKey = process.env.JWT_SECRET || "";
  if (!token) {
    return res.status(401).json({ message: "Permission denied" });
  }

  jwt.verify(token, secretKey, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }
    req.user = decoded;
    next();
  });
}
