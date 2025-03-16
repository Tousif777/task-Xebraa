import React, { createContext, useState, useEffect } from "react";
import { authApi } from "../services/api";

export interface User {
    id: string;
    email: string;
    name: string;
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined,
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem("accessToken");
            if (token) {
                try {
                    const { user } = await authApi.refreshToken();
                    setUser(user);
                } catch {
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (email: string, password: string) => {
        const { user } = await authApi.login(email, password);
        setUser(user);
    };

    const register = async (email: string, password: string, name: string) => {
        const { user } = await authApi.register(email, password, name);
        setUser(user);
    };

    const logout = async () => {
        await authApi.logout();
        setUser(null);
    };

    if (loading) {
        return <div>Loading...</div>; // You might want to replace this with a proper loading component
    }

    return (
        <AuthContext.Provider
            value={{ user, loading, login, register, logout }}
        >
            {children}
        </AuthContext.Provider>
    );
};
