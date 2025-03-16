import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notesApi, Note } from "../../services/notesApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Loader2, Users, UserPlus, X } from "lucide-react";
import { socketService } from "../../services/socket";
import { useAuth } from "../../hooks/useAuth";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";

interface ActiveUser {
    userId: string;
    username: string;
    socketId: string;
}

export function NoteEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [note, setNote] = useState<Note | null>(null);
    const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (id) {
            loadNote();
        }

        // Connect to socket
        if (user) {
            const token = localStorage.getItem("accessToken");
            if (token) {
                console.log("NoteEditor: Connecting to socket...");
                // Ensure token has Bearer prefix
                const formattedToken = token.startsWith("Bearer ")
                    ? token
                    : `Bearer ${token}`;

                // First disconnect any existing connections
                socketService.disconnect();

                // Then connect with the token
                socketService.connect(formattedToken, () => {
                    // Only try to join note and set up listeners after connection is established
                    if (id) {
                        console.log("Socket connected, now joining note:", id);
                        socketService.joinNote(id, user.name);

                        // Set up socket event listeners
                        socketService.onUserJoined(({ activeUsers }) => {
                            setActiveUsers(activeUsers);
                        });

                        socketService.onUserLeft(({ activeUsers }) => {
                            setActiveUsers(activeUsers);
                        });

                        socketService.onActiveUsers(({ activeUsers }) => {
                            setActiveUsers(activeUsers);
                        });

                        socketService.onNoteUpdated(
                            ({ content, title, userId }) => {
                                console.log(
                                    "Note update received from:",
                                    userId,
                                );
                                // Update if it's from another user OR from our user but from a different client
                                setNote((prev) =>
                                    prev ? { ...prev, content, title } : null,
                                );
                                setTitle(title);
                                setContent(content);
                            },
                        );
                    }
                });
            }
        }

        return () => {
            if (id) {
                socketService.leaveNote(id);
            }
            socketService.removeAllListeners();
        };
    }, [id, user]);

    const loadNote = async () => {
        try {
            setLoading(true);
            const noteData = await notesApi.getNote(id!);
            setNote(noteData);
            setTitle(noteData.title);
            setContent(noteData.content);
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load note",
            });
            navigate("/notes");
        } finally {
            setLoading(false);
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        handleTyping(e.target.value, title);
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
        handleTyping(content, e.target.value);
    };

    const handleTyping = (newContent: string, newTitle: string) => {
        if (id && user) {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            setIsTyping(true);
            typingTimeoutRef.current = setTimeout(() => {
                socketService.updateNote(id, newContent, newTitle);
                setIsTyping(false);
            }, 500);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            if (id) {
                const updatedNote = await notesApi.updateNote(id, {
                    title,
                    content,
                });
                setNote(updatedNote);
                toast({
                    title: "Success",
                    description: "Note updated successfully",
                });
            } else {
                await notesApi.createNote({ title, content });
                toast({
                    title: "Success",
                    description: "Note created successfully",
                });
                navigate("/notes");
            }
        } catch {
            toast({
                variant: "destructive",
                title: "Error",
                description: `Failed to ${id ? "update" : "create"} note`,
            });
        }
    };

    const handleAddCollaborator = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !newCollaboratorEmail.trim()) return;

        try {
            const updatedNote = await notesApi.addCollaborator(
                id,
                newCollaboratorEmail,
            );
            setNote(updatedNote);
            setNewCollaboratorEmail("");
            toast({
                title: "Success",
                description: "Collaborator added successfully",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error.response?.data?.message ||
                    "Failed to add collaborator",
            });
        }
    };

    const handleRemoveCollaborator = async (email: string) => {
        if (!id) return;

        try {
            const updatedNote = await notesApi.removeCollaborator(id, email);
            setNote(updatedNote);
            toast({
                title: "Success",
                description: "Collaborator removed successfully",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description:
                    error.response?.data?.message ||
                    "Failed to remove collaborator",
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

    const isAuthor = note?.author === user?.id;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">
                    {id ? "Edit Note" : "Create Note"}
                </h1>
                <div className="flex items-center gap-4">
                    {id && (
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            <span className="text-sm text-muted-foreground">
                                {activeUsers.length} active user
                                {activeUsers.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                    )}
                    {isAuthor && id && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Manage Collaborators
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        Manage Collaborators
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <form
                                        onSubmit={handleAddCollaborator}
                                        className="flex gap-2"
                                    >
                                        <Input
                                            type="email"
                                            placeholder="Collaborator's email"
                                            value={newCollaboratorEmail}
                                            onChange={(e) =>
                                                setNewCollaboratorEmail(
                                                    e.target.value,
                                                )
                                            }
                                            className="flex-1"
                                        />
                                        <Button type="submit">Add</Button>
                                    </form>
                                    <div className="space-y-2">
                                        <h3 className="font-medium">
                                            Current Collaborators
                                        </h3>
                                        {note?.collaborators.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                No collaborators yet
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {note?.collaborators.map(
                                                    (collaborator) => (
                                                        <div
                                                            key={
                                                                collaborator._id
                                                            }
                                                            className="flex items-center justify-between bg-muted p-2 rounded"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {
                                                                        collaborator.name
                                                                    }
                                                                </span>
                                                                <span className="text-sm text-muted-foreground">
                                                                    {
                                                                        collaborator.email
                                                                    }
                                                                </span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRemoveCollaborator(
                                                                        collaborator.email,
                                                                    )
                                                                }
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{id ? "Edit Note" : "Create Note"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label
                                htmlFor="title"
                                className="block text-sm font-medium mb-1"
                            >
                                Title
                            </label>
                            <Input
                                id="title"
                                value={title}
                                onChange={handleTitleChange}
                                required
                                className="w-full"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor="content"
                                className="block text-sm font-medium mb-1"
                            >
                                Content
                            </label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={handleContentChange}
                                required
                                className="w-full min-h-[200px]"
                            />
                        </div>
                        {isTyping && (
                            <p className="text-sm text-muted-foreground">
                                Changes will be saved automatically...
                            </p>
                        )}
                        <div className="flex gap-2">
                            <Button type="submit">
                                {id ? "Update Note" : "Create Note"}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate("/notes")}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
