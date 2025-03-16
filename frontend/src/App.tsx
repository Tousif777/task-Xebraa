import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { LoginForm } from "./components/auth/LoginForm";
import { RegisterForm } from "./components/auth/RegisterForm";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { UnauthenticatedRoute } from "./components/auth/UnauthenticatedRoute";
import { NotesList } from "./components/notes/NotesList";
import { NoteEditor } from "./components/notes/NoteEditor";
import { Toaster } from "./components/ui/toaster";

function App() {
    return (
        <Router>
            <AuthProvider>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <UnauthenticatedRoute>
                                <LoginForm />
                            </UnauthenticatedRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <UnauthenticatedRoute>
                                <RegisterForm />
                            </UnauthenticatedRoute>
                        }
                    />
                    <Route path="/" element={<Navigate to="/notes" />} />
                    <Route
                        path="/notes"
                        element={
                            <ProtectedRoute>
                                <NotesList />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/notes/new"
                        element={
                            <ProtectedRoute>
                                <NoteEditor />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/notes/:id"
                        element={
                            <ProtectedRoute>
                                <NoteEditor />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
                <Toaster />
            </AuthProvider>
        </Router>
    );
}

export default App;
