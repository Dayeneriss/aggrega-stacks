import React from 'react';
import MainLayout from '../components/Layout/MainLayout';

const Pools: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Liquidity Pools</h1>
        <div className="bg-white shadow-md rounded-lg p-6">
          <p>Liquidity pools functionality coming soon!</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Pools;
