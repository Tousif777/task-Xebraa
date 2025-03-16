import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { verifyToken, extractToken } from "../utils/jwt";

interface JwtPayload {
    userId: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ message: "Authorization token required" });
        }

        const token = extractToken(authHeader);
        try {
            const decoded = (await verifyToken(token)) as JwtPayload;

            const user = await User.findById(decoded.userId).select(
                "-password",
            );
            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            req.user = user;
            next();
        } catch (tokenError) {
            console.error("Token verification failed:", tokenError);
            return res.status(401).json({ message: "Invalid token" });
        }
    } catch (error) {
        res.status(401).json({ message: "Please authenticate" });
    }
};
