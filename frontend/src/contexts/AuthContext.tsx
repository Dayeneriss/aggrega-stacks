import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the user object
interface User {
  id: string;
  email: string;
  username?: string;
}

// Define the shape of the authentication context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isAuthenticated: false
});

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Simulated login - replace with actual authentication logic
    try {
      // In a real app, this would be an API call
      const mockUser: User = {
        id: 'mock-user-id',
        email: email,
        username: email.split('@')[0]
      };
      setUser(mockUser);
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, username?: string) => {
    // Simulated registration - replace with actual registration logic
    try {
      const mockUser: User = {
        id: 'mock-user-id',
        email: email,
        username: username || email.split('@')[0]
      };
      setUser(mockUser);
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
