import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/Layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return null; // This should not happen due to ProtectedRoute
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Your Profile</h1>
          <section className="profile-details space-y-4">
            <div className="bg-gray-100 p-4 rounded-md">
              <p className="font-semibold">Email:</p>
              <p className="text-gray-700">{user.email}</p>
            </div>
            {user.username && (
              <div className="bg-gray-100 p-4 rounded-md">
                <p className="font-semibold">Username:</p>
                <p className="text-gray-700">{user.username}</p>
              </div>
            )}
            <div className="bg-gray-100 p-4 rounded-md">
              <p className="font-semibold">User ID:</p>
              <p className="text-gray-700">{user.id}</p>
            </div>
          </section>
          <section className="profile-actions mt-6">
            <button 
              className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-dark transition-colors"
              onClick={handleLogout}
            >
              Logout
            </button>
          </section>
        </div>
      </div>
    </MainLayout>
  );
};

export default Profile;
