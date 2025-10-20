import axios from 'axios';

const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';

// Common ERC20 tokens on Monad Testnet (you can expand this list)
const KNOWN_TOKENS = {
  '0x1234567890123456789012345678901234567890': {
    name: 'Test Token',
    symbol: 'TEST',
    decimals: 18
  },
  // Add more known token addresses here as they get deployed on Monad
};

export class TokenService {
  static async getWalletTokens(walletAddress) {
    try {
      // Get native MON balance
      const nativeBalance = await this.getNativeBalance(walletAddress);
      
      // For now, return native balance + some mock tokens
      // In production, you would scan for ERC20 token transfers and balances
      const tokens = [
        {
          symbol: 'MON',
          name: 'Monad',
          balance: nativeBalance,
          decimals: 18,
          value: (parseFloat(nativeBalance) * 0.1).toFixed(2), // Mock price
          address: 'native'
        },
        {
          symbol: 'TEST',
          name: 'Test Token',
          balance: '1000.00',
          decimals: 18,
          value: '10.00',
          address: '0x1234567890123456789012345678901234567890'
        }
      ];

      return tokens;
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return [];
    }
  }

  static async getNativeBalance(walletAddress) {
    try {
      const response = await axios.post(MONAD_RPC_URL, {
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [walletAddress, 'latest'],
        id: 1
      });

      if (response.data.result) {
        // Convert from wei to MON
        const balanceWei = parseInt(response.data.result, 16);
        return (balanceWei / 1e18).toFixed(4);
      }
      return '0';
    } catch (error) {
      console.error('Error fetching native balance:', error);
      return '0';
    }
  }

  static async getTokenBalance(tokenAddress, walletAddress) {
    try {
      // ERC20 balanceOf method
      const data = '0x70a08231' + walletAddress.slice(2).padStart(64, '0');
      
      const response = await axios.post(MONAD_RPC_URL, {
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: tokenAddress,
          data: data
        }, 'latest'],
        id: 1
      });

      if (response.data.result && response.data.result !== '0x') {
        const balanceWei = parseInt(response.data.result, 16);
        const tokenInfo = KNOWN_TOKENS[tokenAddress.toLowerCase()];
        const decimals = tokenInfo?.decimals || 18;
        return (balanceWei / Math.pow(10, decimals)).toFixed(4);
      }
      return '0';
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return '0';
    }
  }
}

export default TokenService;