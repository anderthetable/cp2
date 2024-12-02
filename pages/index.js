import { useState } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

const tokenABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function mintToPlayer(address player, uint256 amount) returns (bool)"
];

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
const GAME_PRIVATE_KEY = process.env.GAME_PRIVATE_KEY; // ¡Guardar seguro!
const POINTS_PER_CLICK = 1;
const TOKEN_EXCHANGE_RATE = 100;


export default function Home() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [points, setPoints] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);

  const connectWallet = async () => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const accounts = await provider.listAccounts();
    
    setProvider(provider);
    setAccount(accounts[0]);
    await updateTokenBalance(provider, accounts[0]);
  };

  const updateTokenBalance = async (provider, account) => {
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenABI, provider);
    const balance = await tokenContract.balanceOf(account);
    setTokenBalance(ethers.utils.formatEther(balance));
  };

  const handleClick = () => setPoints(prev => prev + POINTS_PER_CLICK);

  const exchangePoints = async () => {
    if (points < TOKEN_EXCHANGE_RATE) return;
    
    const tokensToMint = Math.floor(points / TOKEN_EXCHANGE_RATE);
    const gameProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const gameWallet = new ethers.Wallet(GAME_PRIVATE_KEY, gameProvider);
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, tokenABI, gameWallet);
    
    try {
        // Obtener nonce actual
        const nonce = await gameProvider.getTransactionCount(gameWallet.address);
        
        const tx = await tokenContract.mintToPlayer(
            account, 
            ethers.utils.parseEther(tokensToMint.toString()),
            { nonce: nonce }  // Especificar nonce
        );
        await tx.wait();
        
        setPoints(points % TOKEN_EXCHANGE_RATE);
        await updateTokenBalance(provider, account);
    } catch (error) {
        console.error("Error:", error);
    }
};

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">P2E Clicker Game</h1>
        
        {!account ? (
          <button 
            onClick={connectWallet}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <div className="mb-4 space-y-2">
              <p>Account: {account.slice(0,6)}...{account.slice(-4)}</p>
              <p>Points: {points}</p>
              <p>Token Balance: {tokenBalance}</p>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={handleClick}
                className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                Click to Earn!
              </button>
              
              <button 
                onClick={exchangePoints}
                disabled={points < TOKEN_EXCHANGE_RATE}
                className="w-full bg-purple-500 text-white p-2 rounded hover:bg-purple-600 disabled:opacity-50"
              >
                Exchange Points for Tokens ({TOKEN_EXCHANGE_RATE} points = 1 token)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}