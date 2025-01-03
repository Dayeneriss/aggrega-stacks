import React from 'react';
import MainLayout from '../components/Layout/MainLayout';
import { Link } from 'react-router-dom';
import { useStacksAuth } from '../contexts/StacksAuthContext';

const Home: React.FC = () => {
  const { isAuthenticated, connectWallet } = useStacksAuth();

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-10 text-center">
              <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                SwapSmart
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                Your native swap aggregator on Stacks
              </p>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                {[
                  {
                    icon: "🔗",
                    title: "Stacks Native",
                    description: "Designed specifically for the Stacks ecosystem"
                  },
                  {
                    icon: "💡",
                    title: "Smart Swap",
                    description: "Find the best rate in one click"
                  },
                  {
                    icon: "🔒",
                    title: "Bitcoin Security",
                    description: "Leverage the robustness of Bitcoin"
                  }
                ].map((feature, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 p-6 rounded-xl transform transition duration-300 hover:scale-105 hover:shadow-lg"
                  >
                    <div className="text-5xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold mb-2 text-blue-600">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                ))}
              </div>

              {!isAuthenticated ? (
                <button 
                  onClick={connectWallet}
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full text-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:-translate-y-1 shadow-lg"
                >
                  Connect Stacks Wallet
                </button>
              ) : (
                <Link 
                  to="/swap" 
                  className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-10 py-4 rounded-full text-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all transform hover:-translate-y-1 shadow-lg"
                >
                  Start Swap
                </Link>
              )}

              <div className="mt-8 text-gray-500 flex justify-center space-x-4">
                <div className="flex items-center">
                  <span className="mr-2">🌐</span>
                  Powered by Stacks
                </div>
                <div className="flex items-center">
                  <span className="mr-2">💎</span>
                  Bitcoin Security
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Home;
