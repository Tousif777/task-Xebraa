import { Request, Response } from "express";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";

interface AuthRequest extends Request {
    user?: IUser;
}

const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = new User({ email, password, name });
        await user.save();

        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshToken = refreshToken;
        await user.save();

        // Set refresh token as HTTP-only cookie
        res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        res.status(201).json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).exec();
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshToken = refreshToken;
        await user.save();

        // Set refresh token as HTTP-only cookie
        res.cookie("refreshToken", refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        res.json({
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
            accessToken,
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

export const refresh = async (req: Request, res: Response) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token required" });
        }

        const decoded = (await verifyRefreshToken(refreshToken)) as {
            userId: string;
        };

        const user = await User.findById(decoded.userId).exec();
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const tokens = generateTokens(user._id);
        user.refreshToken = tokens.refreshToken;
        await user.save();

        // Set new refresh token as HTTP-only cookie
        res.cookie(
            "refreshToken",
            tokens.refreshToken,
            REFRESH_TOKEN_COOKIE_OPTIONS,
        );

        res.json({
            accessToken: tokens.accessToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
            },
        });
    } catch (error) {
        console.error("Token refresh error:", error);
        res.status(401).json({ message: "Invalid refresh token" });
    }
};

export const logout = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({ message: "User not found" });
        }

        const user = await User.findById(req.user._id).exec();
        if (user) {
            user.refreshToken = undefined;
            await user.save();
        }

        // Clear refresh token cookie
        res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
