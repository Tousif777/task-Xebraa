import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { verifyToken, extractToken } from "../utils/jwt";
import { AuthenticationError } from "../utils/errors";

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
            throw new AuthenticationError("Authorization token required");
        }

        const token = extractToken(authHeader);
        
        try {
            const decoded = (await verifyToken(token)) as JwtPayload;

            const user = await User.findById(decoded.userId).select("-password");
            if (!user) {
                throw new AuthenticationError("User not found or token is invalid");
            }

            req.user = user;
            next();
        } catch (tokenError) {
            throw new AuthenticationError("Invalid or expired token");
        }
    } catch (error) {
        next(error); // Pass the error to the error handling middleware
    }
};
