import jwt from "jsonwebtoken";
import { Types } from "mongoose";

// Use the same JWT_SECRET for all operations
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

// Token expiration times
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

/**
 * Generate access and refresh tokens
 */
export const generateTokens = (userId: Types.ObjectId | string) => {
    const userIdStr = userId.toString();

    const accessToken = jwt.sign({ userId: userIdStr }, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign({ userId: userIdStr }, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        // Log the token and secret being used (for debugging only - remove in production)
        console.log("Verifying token...");
        console.log(
            "JWT_SECRET:",
            JWT_SECRET.substring(0, 3) +
                "..." +
                (JWT_SECRET.length > 6
                    ? JWT_SECRET.substring(JWT_SECRET.length - 3)
                    : ""),
        );

        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error(
                    "JWT verification failed:",
                    err.name,
                    err.message,
                );
                reject(err);
            } else {
                console.log("JWT verified successfully");
                resolve(decoded);
            }
        });
    });
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) {
                console.error(
                    "Refresh token verification failed:",
                    err.message,
                );
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

/**
 * Extract token from Authorization header or raw token
 */
export const extractToken = (tokenStr: string): string => {
    return tokenStr.startsWith("Bearer ") ? tokenStr.substring(7) : tokenStr;
};
