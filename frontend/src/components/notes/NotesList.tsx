import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Note, notesApi } from "../../services/notesApi";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { useAuth } from "../../hooks/useAuth";
import { Loader2, Plus, LogOut, Pencil, Trash2, Search, StickyNote } from "lucide-react";
import { Input } from "../ui/input";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

export const NotesList = () => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();
    const { toast } = useToast();
    const { logout, user } = useAuth();

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

    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/30">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground animate-pulse">Loading your notes...</p>
            </div>
        );
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header with gradient background */}
            <div className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background p-8 mb-8 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">My Notes</h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back, {user?.name || "User"}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            onClick={() => navigate("/notes/new")}
                            size="sm"
                            className="rounded-full shadow-sm hover:shadow-md transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Note
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={handleLogout}
                            size="sm"
                            className="rounded-full"
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Search bar */}
                <div className="relative mt-6 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search notes..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-background/80 backdrop-blur-sm border-muted"
                    />
                </div>
            </div>

            {filteredNotes.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-16 bg-muted/20 rounded-xl border border-dashed border-muted"
                >
                    <StickyNote className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">No notes found</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        {searchTerm ? 
                            "No notes match your search criteria. Try a different search term." : 
                            "You don't have any notes yet. Create your first note to get started."}
                    </p>
                    {searchTerm && (
                        <Button 
                            variant="outline"
                            onClick={() => setSearchTerm("")}
                            className="mt-4"
                        >
                            Clear search
                        </Button>
                    )}
                    {!searchTerm && (
                        <Button 
                            onClick={() => navigate("/notes/new")}
                            className="mt-4"
                        >
                            Create your first note
                        </Button>
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {filteredNotes.map((note) => (
                        <motion.div key={note._id} variants={item}>
                            <Card className="h-full overflow-hidden hover:shadow-md transition-all border-muted/60 group relative">
                                <CardHeader className="pb-2">
                                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                                        {note.title}
                                    </CardTitle>
                                    <CardDescription className="flex items-center text-xs">
                                        {note.updatedAt && (
                                            <>Updated: {format(new Date(note.updatedAt), 'MMM d, yyyy')}</>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground line-clamp-4 text-sm">
                                        {note.content}
                                    </p>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 pt-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-full"
                                        onClick={() => navigate(`/notes/${note._id}`)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDelete(note._id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete</span>
                                    </Button>
                                </CardFooter>
                                {/* Hover overlay with fade gradient for better readability */}
                                <div 
                                    className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                    style={{ top: '70%' }}
                                />
                                {/* Clickable overlay for the entire card */}
                                <div 
                                    className="absolute inset-0 cursor-pointer"
                                    onClick={() => navigate(`/notes/${note._id}`)}
                                />
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
};
