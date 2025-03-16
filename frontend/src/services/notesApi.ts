import api from "./api";

interface Collaborator {
    _id: string;
    email: string;
    name: string;
}

export interface Note {
    _id: string;
    title: string;
    content: string;
    author: string;
    collaborators: Collaborator[];
    createdAt: string;
    updatedAt: string;
}

export const notesApi = {
    getNotes: async (): Promise<Note[]> => {
        const response = await api.get("/notes");
        return response.data;
    },

    getNote: async (id: string): Promise<Note> => {
        const response = await api.get(`/notes/${id}`);
        return response.data;
    },

    createNote: async (data: {
        title: string;
        content: string;
    }): Promise<Note> => {
        const response = await api.post("/notes", data);
        return response.data;
    },

    updateNote: async (
        id: string,
        data: { title: string; content: string },
    ): Promise<Note> => {
        const response = await api.put(`/notes/${id}`, data);
        return response.data;
    },

    deleteNote: async (id: string): Promise<void> => {
        await api.delete(`/notes/${id}`);
    },

    addCollaborator: async (noteId: string, email: string): Promise<Note> => {
        const response = await api.post(`/notes/${noteId}/collaborators`, {
            email,
        });
        return response.data;
    },

    removeCollaborator: async (
        noteId: string,
        email: string,
    ): Promise<Note> => {
        const response = await api.delete(`/notes/${noteId}/collaborators`, {
            data: { email },
        });
        return response.data;
    },
};
