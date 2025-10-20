import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { createPublicClient, createWalletClient, custom, http, getContract } from 'viem';
import { monadTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Initial state
const initialState = {
  walletAddress: '',
  connected: false,
  activeView: 'dashboard',
  walletData: {
    activities: {},
    tokens: { tokens: [] },
    gas: {},
    delegations: { delegations: [] },
    risk: {},
    analytics: {}
  },
  loading: false,
  notifications: [],
  settings: {
    theme: 'dark',
    autoRefresh: true,
    riskThreshold: 70
  },
  // New state for smart accounts
  smartAccount: null,
  provider: null,
  signer: null,
  chainId: null,
  isSmartAccount: false
};

// Action types
const ACTION_TYPES = {
  SET_WALLET: 'SET_WALLET',
  DISCONNECT_WALLET: 'DISCONNECT_WALLET',
  SET_ACTIVE_VIEW: 'SET_ACTIVE_VIEW',
  SET_WALLET_DATA: 'SET_WALLET_DATA',
  SET_LOADING: 'SET_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  CLEAR_NOTIFICATION: 'CLEAR_NOTIFICATION',
  CLEAR_ALL_NOTIFICATIONS: 'CLEAR_ALL_NOTIFICATIONS',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SET_PROVIDER: 'SET_PROVIDER',
  SET_SMART_ACCOUNT: 'SET_SMART_ACCOUNT',
  SET_CHAIN_ID: 'SET_CHAIN_ID'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_WALLET:
      return {
        ...state,
        walletAddress: action.payload.address,
        connected: true,
        isSmartAccount: action.payload.isSmartAccount || false
      };
    
    case ACTION_TYPES.DISCONNECT_WALLET:
      return {
        ...initialState,
        settings: state.settings
      };
    
    case ACTION_TYPES.SET_ACTIVE_VIEW:
      return {
        ...state,
        activeView: action.payload.view
      };
    
    case ACTION_TYPES.SET_WALLET_DATA:
      return {
        ...state,
        walletData: { ...state.walletData, ...action.payload.data }
      };
    
    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: action.payload.loading
      };
    
    case ACTION_TYPES.ADD_NOTIFICATION:
      const newNotification = {
        ...action.payload.notification,
        timestamp: new Date().toISOString(),
        id: Date.now() + Math.random() // Unique ID for each notification
      };
      return {
        ...state,
        notifications: [newNotification, ...state.notifications.slice(0, 9)] // Keep only latest 10
      };
    
    case ACTION_TYPES.CLEAR_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter((_, index) => index !== action.payload.index)
      };
    
    case ACTION_TYPES.CLEAR_ALL_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };
    
    case ACTION_TYPES.UPDATE_SETTINGS:
      return {
        ...state,
        settings: { ...state.settings, ...action.payload.settings }
      };
    
    case ACTION_TYPES.SET_PROVIDER:
      return {
        ...state,
        provider: action.payload.provider,
        signer: action.payload.signer
      };
    
    case ACTION_TYPES.SET_SMART_ACCOUNT:
      return {
        ...state,
        smartAccount: action.payload.smartAccount
      };
    
    case ACTION_TYPES.SET_CHAIN_ID:
      return {
        ...state,
        chainId: action.payload.chainId
      };
    
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Check for existing connection on mount
  useEffect(() => {
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet(); // Auto-reconnect if wallet is already connected
        }
      } catch (error) {
        console.error('Auto-connect error:', error);
      }
    }
  };

  // Smart Account Integration
  const initializeSmartAccount = async (provider, address, signer) => {
    try {
      const factoryAddress = import.meta.env.VITE_SMART_ACCOUNT_FACTORY;
      
      if (!factoryAddress) {
        console.log('Smart Account Factory not configured');
        return;
      }

      console.log('🔄 Setting up Smart Account...');
      console.log('🔍 Debug Smart Account:');
      console.log('Factory Address:', factoryAddress);
      console.log('User Address:', address);

      // Create contract instance with viem
      const factoryContract = getContract({
        address: factoryAddress,
        abi: [
          {
            name: 'getAddress',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: '', type: 'address' }]
          },
          {
            name: 'entryPoint',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'address' }]
          }
        ],
        client: { public: provider, wallet: signer }
      });

      const entryPoint = await factoryContract.read.entryPoint();
      console.log('Contract EntryPoint:', entryPoint);

      // Get the smart account address
      const smartAccountAddress = await factoryContract.read.getAddress([address]);
      console.log('Calculated Smart Account:', smartAccountAddress);

      dispatch({
        type: ACTION_TYPES.SET_SMART_ACCOUNT,
        payload: { 
          smartAccount: {
            address: smartAccountAddress,
            factory: factoryAddress,
            entryPoint: entryPoint,
            isInitialized: true
          }
        }
      });

      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'success',
            title: 'Smart Account Ready',
            message: `Smart account: ${smartAccountAddress.slice(0, 8)}...`
          }
        }
      });

    } catch (error) {
      console.error('Smart Account setup error:', error);
      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'warning',
            title: 'Smart Account Setup',
            message: 'Using regular wallet: ' + error.message
          }
        }
      });
    }
  };

  // Enhanced wallet connection with Smart Account support
  const connectWallet = async () => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { loading: true } });
    
    if (!window.ethereum) {
      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'error',
            title: 'MetaMask Not Found',
            message: 'Please install MetaMask to use this dApp.'
          }
        }
      });
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { loading: false } });
      return;
    }
    
    try {
      // Request accounts from MetaMask
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      
      // Create viem clients
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
      });

      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
      });

      // Get network info
      const chainId = await publicClient.getChainId();

      // Check if we're on Monad Testnet (chainId 10143)
      if (chainId !== 10143) {
        dispatch({
          type: ACTION_TYPES.ADD_NOTIFICATION,
          payload: {
            notification: {
              type: 'warning',
              title: 'Wrong Network',
              message: 'Please switch to Monad Testnet to use SmartGuard'
            }
          }
        });
        
        try {
          // Try to switch to Monad Testnet
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x279F' }], // 10143 in hex
          });
        } catch (switchError) {
          // If chain is not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x279F',
                chainName: 'Monad Testnet',
                rpcUrls: ['https://testnet-rpc.monad.xyz'],
                nativeCurrency: {
                  name: 'Monad',
                  symbol: 'MON',
                  decimals: 18
                },
                blockExplorerUrls: ['https://testnet.monadexplorer.com/']
              }]
            });
          }
        }
      }

      // Set provider and wallet state
      dispatch({
        type: ACTION_TYPES.SET_PROVIDER,
        payload: { provider: publicClient, signer: walletClient }
      });

      dispatch({
        type: ACTION_TYPES.SET_CHAIN_ID,
        payload: { chainId: Number(chainId) }
      });

      dispatch({
        type: ACTION_TYPES.SET_WALLET,
        payload: { address, isSmartAccount: false }
      });

      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'success',
            title: 'Wallet Connected',
            message: `Connected to ${address.slice(0, 8)}...${address.slice(-6)}`
          }
        }
      });

      // Initialize Smart Account
      await initializeSmartAccount(publicClient, address, walletClient);

    } catch (error) {
      console.error('Wallet connection error:', error);
      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'error',
            title: 'Connection Failed',
            message: error.message || 'Failed to connect wallet'
          }
        }
      });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { loading: false } });
    }
  };

  // Enhanced disconnect
  const disconnectWallet = () => {
    dispatch({ type: ACTION_TYPES.DISCONNECT_WALLET });
    dispatch({
      type: ACTION_TYPES.ADD_NOTIFICATION,
      payload: {
        notification: {
          type: 'info',
          title: 'Wallet Disconnected',
          message: 'You have been disconnected from SmartGuard'
        }
      }
    });
  };

  // Enhanced data refresh
  const refreshWalletData = async () => {
    if (!state.walletAddress) return;
    
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { loading: true } });
    try {
      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'info',
            title: 'Refreshing Data',
            message: 'Fetching latest blockchain data...'
          }
        }
      });
    } catch (error) {
      console.error('Refresh error:', error);
      dispatch({
        type: ACTION_TYPES.ADD_NOTIFICATION,
        payload: {
          notification: {
            type: 'error',
            title: 'Refresh Failed',
            message: 'Failed to update wallet data'
          }
        }
      });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { loading: false } });
    }
  };

  // Notification management functions
  const clearNotification = (index) => {
    dispatch({
      type: ACTION_TYPES.CLEAR_NOTIFICATION,
      payload: { index }
    });
  };

  const clearAllNotifications = () => {
    dispatch({
      type: ACTION_TYPES.CLEAR_ALL_NOTIFICATIONS
    });
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== state.walletAddress) {
          dispatch({
            type: ACTION_TYPES.SET_WALLET,
            payload: { address: accounts[0] }
          });
          dispatch({
            type: ACTION_TYPES.ADD_NOTIFICATION,
            payload: {
              notification: {
                type: 'info',
                title: 'Account Changed',
                message: `Switched to ${accounts[0].slice(0, 8)}...${accounts[0].slice(-6)}`
              }
            }
          });
        }
      };

      const handleChainChanged = (chainId) => {
        const newChainId = parseInt(chainId, 16);
        dispatch({
          type: ACTION_TYPES.SET_CHAIN_ID,
          payload: { chainId: newChainId }
        });
        
        if (newChainId !== 10143) {
          dispatch({
            type: ACTION_TYPES.ADD_NOTIFICATION,
            payload: {
              notification: {
                type: 'warning',
                title: 'Network Changed',
                message: 'Please switch back to Monad Testnet for full functionality'
              }
            }
          });
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [state.walletAddress]);

  // Actions
  const actions = {
    setWallet: (address, isSmartAccount = false) => dispatch({
      type: ACTION_TYPES.SET_WALLET,
      payload: { address, isSmartAccount }
    }),
    
    disconnectWallet,
    
    setActiveView: (view) => dispatch({
      type: ACTION_TYPES.SET_ACTIVE_VIEW,
      payload: { view }
    }),
    
    setWalletData: (data) => dispatch({
      type: ACTION_TYPES.SET_WALLET_DATA,
      payload: { data }
    }),
    
    setLoading: (loading) => dispatch({
      type: ACTION_TYPES.SET_LOADING,
      payload: { loading }
    }),
    
    addNotification: (notification) => dispatch({
      type: ACTION_TYPES.ADD_NOTIFICATION,
      payload: { notification }
    }),
    
    clearNotification,
    
    clearAllNotifications,
    
    updateSettings: (settings) => dispatch({
      type: ACTION_TYPES.UPDATE_SETTINGS,
      payload: { settings }
    }),
    
    connectWallet,
    refreshWalletData
  };

  const value = {
    ...state,
    ...actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Hook for using context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;