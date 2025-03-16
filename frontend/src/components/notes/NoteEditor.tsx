import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { notesApi, Note } from "../../services/notesApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useToast } from "../ui/use-toast";
import { Card, CardContent } from "../ui/card";
import { 
    Loader2, 
    Users, 
    UserPlus, 
    X, 
    Save, 
    ArrowLeft, 
    Clock,
    User,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { socketService } from "../../services/socket";
import { useAuth } from "../../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "../ui/dialog";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

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
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [note, setNote] = useState<Note | null>(null);
    const [newCollaboratorEmail, setNewCollaboratorEmail] = useState("");
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
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
                            toast({
                                title: "User joined",
                                description: "Someone joined this note",
                                duration: 3000,
                            });
                        });

                        socketService.onUserLeft(({ activeUsers }) => {
                            setActiveUsers(activeUsers);
                            toast({
                                title: "User left",
                                description: "Someone left this note",
                                duration: 3000,
                            });
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
            
            // Set last saved time if the note has an updatedAt field
            if (noteData.updatedAt) {
                setLastSaved(new Date(noteData.updatedAt));
            }
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
                
                // Update last saved time after a typing event is processed
                setLastSaved(new Date());
            }, 500);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (id) {
                const updatedNote = await notesApi.updateNote(id, {
                    title,
                    content,
                });
                setNote(updatedNote);
                setLastSaved(new Date());
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
        } finally {
            setSaving(false);
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Loading your note...</p>
            </div>
        );
    }

    const isAuthor = note?.author === user?.id;

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Navigation and info bar */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
            >
                <div className="flex items-center">
                    <Button 
                        variant="ghost"
                        size="sm"
                        className="mr-2 rounded-full h-9 w-9 p-0"
                        onClick={() => navigate("/notes")}
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Back to notes</span>
                    </Button>
                    <h1 className="text-2xl font-bold">
                        {id ? "Edit Note" : "Create Note"}
                    </h1>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {lastSaved && (
                        <div className="flex items-center gap-1 mr-3">
                            <Clock className="h-3 w-3" />
                            <span>Last saved: {format(lastSaved, 'h:mm a')}</span>
                        </div>
                    )}
                    
                    {id && activeUsers.length > 0 && (
                        <div className="flex -space-x-2 mr-2">
                            {activeUsers.slice(0, 3).map((activeUser, index) => (
                                <Avatar
                                    key={activeUser.socketId}
                                    className="border-2 border-background h-6 w-6"
                                >
                                    <AvatarFallback className="text-[10px] bg-primary/10">
                                        {activeUser.username.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {activeUsers.length > 3 && (
                                <Avatar className="border-2 border-background h-6 w-6">
                                    <AvatarFallback className="text-[10px] bg-muted">
                                        +{activeUsers.length - 3}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    )}
                    
                    {id && (
                        <div className="flex items-center">
                            <Badge variant="outline" className="gap-1.5">
                                <Users className="h-3 w-3" />
                                {activeUsers.length} active
                            </Badge>
                        </div>
                    )}
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-3"
                >
                    <Card className="overflow-hidden border-muted/60 shadow-sm">
                        <CardContent className="p-0">
                            <form onSubmit={handleSubmit} className="space-y-0">
                                <div className="border-b border-muted/60 p-4">
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={handleTitleChange}
                                        required
                                        placeholder="Note title"
                                        className="text-xl font-medium border-none px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                                <div>
                                    <Textarea
                                        id="content"
                                        value={content}
                                        onChange={handleContentChange}
                                        required
                                        placeholder="Write your note content here..."
                                        className="w-full min-h-[400px] resize-y border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 p-4 text-base"
                                    />
                                </div>
                                
                                <div className="flex justify-between items-center p-4 border-t border-muted/60 bg-muted/5">
                                    <div className="flex items-center">
                                        <AnimatePresence>
                                            {isTyping && (
                                                <motion.div 
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="text-sm text-muted-foreground flex items-center"
                                                >
                                                    <div className="flex space-x-1 mr-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0ms' }} />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '200ms' }} />
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '400ms' }} />
                                                    </div>
                                                    <span>Saving changes automatically</span>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <Button type="submit" disabled={isTyping || saving} className="gap-2">
                                        {saving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4" />
                                        )}
                                        {id ? "Save Changes" : "Create Note"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="lg:col-span-1"
                >
                    {isAuthor && id && (
                        <Card className="mb-6">
                            <CardContent className="p-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            <UserPlus className="h-4 w-4" />
                                            Collaboration
                                        </h3>
                                        
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8 text-xs">
                                                    Manage
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Manage Collaborators</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4 py-4">
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
                                                        <Button type="submit" size="sm">Add</Button>
                                                    </form>
                                                    <div className="space-y-2">
                                                        <h3 className="font-medium text-sm text-muted-foreground">
                                                            Current Collaborators
                                                        </h3>
                                                        {!note?.collaborators || note.collaborators.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">
                                                                No collaborators yet
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                                                {note?.collaborators.map(
                                                                    (collaborator) => (
                                                                        <div
                                                                            key={
                                                                                collaborator._id
                                                                            }
                                                                            className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                                                                        >
                                                                            <div className="flex items-center gap-2">
                                                                                <Avatar className="h-6 w-6">
                                                                                    <AvatarFallback className="text-xs">
                                                                                        {collaborator.name.substring(0, 2).toUpperCase()}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div className="flex flex-col">
                                                                                    <span className="font-medium text-sm">
                                                                                        {
                                                                                            collaborator.name
                                                                                        }
                                                                                    </span>
                                                                                    <span className="text-xs text-muted-foreground">
                                                                                        {
                                                                                            collaborator.email
                                                                                        }
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() =>
                                                                                    handleRemoveCollaborator(
                                                                                        collaborator.email,
                                                                                    )
                                                                                }
                                                                                className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive"
                                                                            >
                                                                                <X className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <DialogFooter>
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => document.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label="Close"]')?.click()}
                                                    >
                                                        Close
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-sm text-muted-foreground mb-2">Active collaborators</h4>
                                        {activeUsers.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No one is currently active</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {activeUsers.map(activeUser => (
                                                    <div 
                                                        key={activeUser.socketId} 
                                                        className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/30"
                                                    >
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                        </span>
                                                        <span>{activeUser.username}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {note && (
                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Note Details
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1.5 border-b border-muted/40">
                                        <span className="text-muted-foreground">Created by</span>
                                        <span className="font-medium flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {isAuthor ? 'You' : 'Other user'}
                                        </span>
                                    </div>
                                    
                                    {note.createdAt && (
                                        <div className="flex justify-between py-1.5 border-b border-muted/40">
                                            <span className="text-muted-foreground">Created</span>
                                            <span className="font-medium">
                                                {format(new Date(note.createdAt), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {note.updatedAt && (
                                        <div className="flex justify-between py-1.5 border-b border-muted/40">
                                            <span className="text-muted-foreground">Last updated</span>
                                            <span className="font-medium">
                                                {format(new Date(note.updatedAt), 'MMM d, yyyy')}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between py-1.5 border-b border-muted/40">
                                        <span className="text-muted-foreground">Collaborators</span>
                                        <span className="font-medium">
                                            {note.collaborators?.length || 0}
                                        </span>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="w-full text-xs"
                                            onClick={() => navigate("/notes")}
                                        >
                                            Back to All Notes
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
