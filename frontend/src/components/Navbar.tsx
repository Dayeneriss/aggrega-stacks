import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStacksAuth } from '../contexts/StacksAuthContext';

const Navbar: React.FC = () => {
  const { isAuthenticated, userData, connectWallet, disconnectWallet } = useStacksAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const formatAddress = (address?: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link 
          to="/" 
          className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"
        >
          SwapSmart
        </Link>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 hover:text-blue-600 focus:outline-none"
          >
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6 items-center">
          <Link 
            to="/swap" 
            className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
          >
            Swap
          </Link>
          <Link 
            to="/pools" 
            className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
          >
            Pools
          </Link>
          <Link 
            to="/learn" 
            className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
          >
            Learn
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {formatAddress(userData?.profile?.stxAddress?.mainnet)}
              </span>
              <button 
                onClick={disconnectWallet}
                className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={connectWallet}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white shadow-lg md:hidden">
            <div className="flex flex-col p-4 space-y-2">
              <Link 
                to="/swap" 
                className="text-gray-700 hover:text-blue-600 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Swap
              </Link>
              <Link 
                to="/pools" 
                className="text-gray-700 hover:text-blue-600 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Pools
              </Link>
              <Link 
                to="/learn" 
                className="text-gray-700 hover:text-blue-600 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Learn
              </Link>
              {isAuthenticated ? (
                <div className="space-y-2">
                  <div className="text-gray-700 py-2">
                    {formatAddress(userData?.profile?.stxAddress?.mainnet)}
                  </div>
                  <button 
                    onClick={disconnectWallet}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
