// shared/types/contracts.ts
export interface SwapParams {
    tokenIn: string;
    tokenOut: string;
    amount: string;
    slippage: number;
  }
  
  // Utilisable dans le backend ET le frontend
  import { SwapParams } from '@shared/types/contracts';