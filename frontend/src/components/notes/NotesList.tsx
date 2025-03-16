import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Note, notesApi } from "../../services/notesApi";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { useAuth } from "../../hooks/useAuth";
import { Loader2 } from "lucide-react";

export const NotesList = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { logout } = useAuth();

    const loadNotes = useCallback(async () => {
        try {
            const data = await notesApi.getNotes();
            setNotes(data);
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load notes",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadNotes();
    }, [loadNotes]);

    const handleDelete = async (id: string) => {
        try {
            await notesApi.deleteNote(id);
            setNotes(notes.filter((note) => note._id !== id));
            toast({
                title: "Success",
                description: "Note deleted successfully",
            });
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete note",
            });
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to logout",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">My Notes</h1>
                <div className="flex gap-4">
                    <Button onClick={() => navigate("/notes/new")}>
                        Create Note
                    </Button>
                    <Button variant="outline" onClick={handleLogout}>
                        Logout
                    </Button>
                </div>
            </div>

            {notes.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">
                        No notes yet. Create your first note!
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {notes.map((note) => (
                        <div
                            key={note._id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                            <h2 className="text-xl font-semibold mb-2">
                                {note.title}
                            </h2>
                            <p className="text-muted-foreground mb-4 line-clamp-3">
                                {note.content}
                            </p>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        navigate(`/notes/${note._id}`)
                                    }
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDelete(note._id)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
