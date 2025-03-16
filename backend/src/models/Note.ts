import mongoose, { Document, Schema } from "mongoose";
import { IUser } from "./User";

export interface INote extends Document {
    title: string;
    content: string;
    author: IUser["_id"];
    collaborators: IUser["_id"][];
    createdAt: Date;
    updatedAt: Date;
}

const noteSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        content: {
            type: String,
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        collaborators: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                default: [],
            },
        ],
    },
    {
        timestamps: true,
    },
);

export const Note = mongoose.model<INote>("Note", noteSchema);
