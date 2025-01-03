import React, { createContext, useState, useContext, useEffect } from 'react';
import { AppConfig, UserSession } from '@stacks/connect';
import { showConnect } from '@stacks/connect-react';

interface StacksAuthContextType {
  isAuthenticated: boolean;
  userSession: UserSession;
  connectWallet: () => void;
  disconnectWallet: () => void;
  userData: any;
}

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const StacksAuthContext = createContext<StacksAuthContextType>({
  isAuthenticated: false,
  userSession,
  connectWallet: () => {},
  disconnectWallet: () => {},
  userData: null
});

export const StacksAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(userSession.isUserSignedIn());
  const [userData, setUserData] = useState(userSession.isUserSignedIn() ? userSession.loadUserData() : null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const data = userSession.loadUserData();
      setUserData(data);
      setIsAuthenticated(true);
    }
  }, []);

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'SwapSmart',
        icon: window.location.origin + '/logo.svg'
      },
      redirectTo: '/',
      onFinish: () => {
        setIsAuthenticated(true);
        setUserData(userSession.loadUserData());
        window.location.reload();
      },
      userSession
    });
  };

  const disconnectWallet = () => {
    userSession.signUserOut();
    setIsAuthenticated(false);
    setUserData(null);
    window.location.reload();
  };

  return (
    <StacksAuthContext.Provider 
      value={{ 
        isAuthenticated, 
        userSession, 
        connectWallet, 
        disconnectWallet, 
        userData 
      }}
    >
      {children}
    </StacksAuthContext.Provider>
  );
};

export const useStacksAuth = () => useContext(StacksAuthContext);

export default StacksAuthContext;
