import { Request, Response } from "express";
import { Note } from "../models/Note";
import { IUser } from "../models/User";
import { User } from "../models/User";
import { asyncHandler } from "../middleware/asyncHandler";
import { AuthorizationError, BadRequestError, NotFoundError } from "../utils/errors";

interface AuthRequest extends Request {
    user?: IUser;
}

// Get all notes for the authenticated user (including ones they can collaborate on)
export const getNotes = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const notes = await Note.find({
        $or: [{ author: req.user._id }, { collaborators: req.user._id }],
    })
        .sort({ updatedAt: -1 })
        .populate("collaborators", "email name")
        .exec();
        
    res.json(notes);
});

// Get a specific note
export const getNote = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const note = await Note.findOne({
        _id: req.params.id,
        $or: [{ author: req.user._id }, { collaborators: req.user._id }],
    })
        .populate("collaborators", "email name")
        .exec();

    if (!note) {
        throw new NotFoundError("Note");
    }

    res.json(note);
});

// Create a new note
export const createNote = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const { title, content } = req.body;
    
    if (!title) {
        throw new BadRequestError("Title is required");
    }

    const note = new Note({
        title,
        content,
        author: req.user._id,
        collaborators: [],
    });

    await note.save();
    res.status(201).json(note);
});

// Update a note
export const updateNote = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const { title, content } = req.body;
    
    if (!title) {
        throw new BadRequestError("Title is required");
    }

    const note = await Note.findOne({
        _id: req.params.id,
        $or: [{ author: req.user._id }, { collaborators: req.user._id }],
    })
        .populate("collaborators", "email name")
        .exec();

    if (!note) {
        throw new NotFoundError("Note");
    }

    note.title = title;
    note.content = content;
    await note.save();

    res.json(note);
});

// Delete a note
export const deleteNote = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const note = await Note.findOne({
        _id: req.params.id,
        author: req.user._id, // Only author can delete
    }).exec();

    if (!note) {
        throw new NotFoundError("Note");
    }

    await note.deleteOne();
    res.json({ message: "Note deleted successfully" });
});

// Add collaborator to a note
export const addCollaborator = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const { email } = req.body;
    
    if (!email) {
        throw new BadRequestError("Email is required");
    }

    const note = await Note.findOne({
        _id: req.params.id,
        author: req.user._id, // Only author can add collaborators
    })
        .populate("collaborators", "email name")
        .exec();

    if (!note) {
        throw new NotFoundError("Note");
    }

    // Find user by email
    const collaborator = await User.findOne({ email }).exec();
    if (!collaborator) {
        throw new NotFoundError("User with the provided email");
    }

    // Check if user is already a collaborator
    if (
        note.collaborators.some(
            (c) => c._id.toString() === collaborator._id.toString(),
        )
    ) {
        throw new BadRequestError("User is already a collaborator");
    }

    note.collaborators.push(collaborator._id);
    await note.save();

    // Fetch updated note with populated collaborators
    const updatedNote = await Note.findById(note._id)
        .populate("collaborators", "email name")
        .exec();

    res.json(updatedNote);
});

// Remove collaborator from a note
export const removeCollaborator = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user?._id) {
        throw new AuthorizationError("Authentication required");
    }

    const { email } = req.body;
    
    if (!email) {
        throw new BadRequestError("Email is required");
    }

    const note = await Note.findOne({
        _id: req.params.id,
        author: req.user._id, // Only author can remove collaborators
    })
        .populate("collaborators", "email name")
        .exec();

    if (!note) {
        throw new NotFoundError("Note");
    }

    // Find user by email
    const collaborator = await User.findOne({ email }).exec();
    if (!collaborator) {
        throw new NotFoundError("User with the provided email");
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
});
