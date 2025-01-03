import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navigation: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <nav className="bg-primary text-white py-4">
      <div className="container mx-auto flex justify-center">
        <ul className="flex space-x-6">
          <li><Link to="/" className="hover:text-secondary transition-colors">Home</Link></li>
          {isAuthenticated ? (
            <>
              <li><Link to="/profile" className="hover:text-secondary transition-colors">Profile</Link></li>
              <li>
                <a 
                  href="#" 
                  onClick={logout} 
                  className="hover:text-secondary transition-colors"
                >
                  Logout
                </a>
              </li>
            </>
          ) : (
            <li><Link to="/auth" className="hover:text-secondary transition-colors">Login/Register</Link></li>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
