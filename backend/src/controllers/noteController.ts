import { Request, Response } from "express";
import { Note } from "../models/Note";
import { IUser } from "../models/User";
import { User } from "../models/User";

interface AuthRequest extends Request {
    user?: IUser;
}

// Get all notes for the authenticated user (including ones they can collaborate on)
export const getNotes = async (req: AuthRequest, res: Response) => {
    try {
        const notes = await Note.find({
            $or: [{ author: req.user?._id }, { collaborators: req.user?._id }],
        })
            .sort({ updatedAt: -1 })
            .populate("collaborators", "email name")
            .exec();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notes" });
    }
};

// Get a specific note
export const getNote = async (req: AuthRequest, res: Response) => {
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            $or: [{ author: req.user?._id }, { collaborators: req.user?._id }],
        })
            .populate("collaborators", "email name")
            .exec();

        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        res.json(note);
    } catch (error) {
        res.status(500).json({ message: "Error fetching note" });
    }
};

// Create a new note
export const createNote = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content } = req.body;

        const note = new Note({
            title,
            content,
            author: req.user?._id,
            collaborators: [],
        });

        await note.save();
        res.status(201).json(note);
    } catch (error) {
        res.status(500).json({ message: "Error creating note" });
    }
};

// Update a note
export const updateNote = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content } = req.body;

        const note = await Note.findOne({
            _id: req.params.id,
            $or: [{ author: req.user?._id }, { collaborators: req.user?._id }],
        })
            .populate("collaborators", "email name")
            .exec();

        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        note.title = title;
        note.content = content;
        await note.save();

        res.json(note);
    } catch (error) {
        res.status(500).json({ message: "Error updating note" });
    }
};

// Delete a note
export const deleteNote = async (req: AuthRequest, res: Response) => {
    try {
        const note = await Note.findOne({
            _id: req.params.id,
            author: req.user?._id, // Only author can delete
        }).exec();

        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        await note.deleteOne();
        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting note" });
    }
};

// Add collaborator to a note
export const addCollaborator = async (req: AuthRequest, res: Response) => {
    try {
        const { email } = req.body;

        const note = await Note.findOne({
            _id: req.params.id,
            author: req.user?._id, // Only author can add collaborators
        })
            .populate("collaborators", "email name")
            .exec();

        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        // Find user by email
        const collaborator = await User.findOne({ email }).exec();
        if (!collaborator) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if user is already a collaborator
        if (
            note.collaborators.some(
                (c) => c._id.toString() === collaborator._id.toString(),
            )
        ) {
            return res
                .status(400)
                .json({ message: "User is already a collaborator" });
        }

        note.collaborators.push(collaborator._id);
        await note.save();

        // Fetch updated note with populated collaborators
        const updatedNote = await Note.findById(note._id)
            .populate("collaborators", "email name")
            .exec();

        res.json(updatedNote);
    } catch (error) {
        res.status(500).json({ message: "Error adding collaborator" });
    }
};

// Remove collaborator from a note
export const removeCollaborator = async (req: AuthRequest, res: Response) => {
    try {
        const { email } = req.body;

        const note = await Note.findOne({
            _id: req.params.id,
            author: req.user?._id, // Only author can remove collaborators
        })
            .populate("collaborators", "email name")
            .exec();

        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        // Find user by email
        const collaborator = await User.findOne({ email }).exec();
        if (!collaborator) {
            return res.status(404).json({ message: "User not found" });
        }

        note.collaborators = note.collaborators.filter(
            (c) => c._id.toString() !== collaborator._id.toString(),
        );
        await note.save();

        // Fetch updated note with populated collaborators
        const updatedNote = await Note.findById(note._id)
            .populate("collaborators", "email name")
            .exec();

        res.json(updatedNote);
    } catch (error) {
        res.status(500).json({ message: "Error removing collaborator" });
    }
};
