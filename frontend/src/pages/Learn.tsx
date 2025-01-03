import React from 'react';
import MainLayout from '../components/Layout/MainLayout';

const Learn: React.FC = () => {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Learn Stacks</h1>
        <div className="bg-white shadow-md rounded-lg p-6">
          <p>Educational resources coming soon!</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default Learn;
