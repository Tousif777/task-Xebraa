import { Request, Response, NextFunction } from "express";
import { User, IUser } from "../models/User";
import { Types } from "mongoose";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthenticationError, BadRequestError, ConflictError, NotFoundError } from "../utils/errors";

interface AuthRequest extends Request {
    user?: IUser;
}

const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
        throw new BadRequestError("Email and password are required");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ConflictError("User with this email already exists");
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
});

export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequestError("Email and password are required");
    }

    const user = await User.findOne({ email }).exec();
    if (!user) {
        throw new AuthenticationError("Invalid credentials");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        throw new AuthenticationError("Invalid credentials");
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
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        throw new AuthenticationError("Refresh token required");
    }

    try {
        const decoded = (await verifyRefreshToken(refreshToken)) as {
            userId: string;
        };

        const user = await User.findById(decoded.userId).exec();
        if (!user || user.refreshToken !== refreshToken) {
            throw new AuthenticationError("Invalid refresh token");
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
        throw new AuthenticationError("Invalid or expired refresh token");
    }
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthenticationError("User not authenticated");
    }

    const user = await User.findById(req.user._id).exec();
    if (!user) {
        throw new NotFoundError("User");
    }
    
    user.refreshToken = undefined;
    await user.save();

    // Clear refresh token cookie
    res.clearCookie("refreshToken", REFRESH_TOKEN_COOKIE_OPTIONS);

    res.json({ message: "Logged out successfully" });
});
