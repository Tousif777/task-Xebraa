import express from "express";
import {
    getNotes,
    getNote,
    createNote,
    updateNote,
    deleteNote,
    addCollaborator,
    removeCollaborator,
} from "../controllers/noteController";
import { auth } from "../middleware/auth";

const router = express.Router();

// All routes require authentication
router.use(auth);

router.get("/", getNotes);
router.get("/:id", getNote);
router.post("/", createNote);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);
router.post("/:id/collaborators", addCollaborator);
router.delete("/:id/collaborators", removeCollaborator);

export default router;
