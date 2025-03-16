import express from "express";
import {
    register,
    login,
    refresh,
    logout,
} from "../controllers/authController";
import { auth } from "../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", auth, logout);

export default router;
