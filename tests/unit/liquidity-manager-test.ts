import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Mock data pour les tests
const mockData = {
    dexA: 'dex-a',
    dexB: 'dex-b',
    tokenA: 'token-a',
    tokenB: 'token-b',
    initialLiquidity: 1000000, // 1M tokens
    smallAmount: 1000,         // 1K tokens
    largeAmount: 2000000      // 2M tokens
};

Clarinet.test({
    name: "Ensure authorized user can update liquidity",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const authorized = accounts.get('deployer')!;
        
        // Test mise à jour de la liquidité
        let block = chain.mineBlock([
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.initialLiquidity)
                ],
                authorized.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Vérification de la liquidité mise à jour
        let checkLiquidity = chain.callReadOnlyFn(
            'liquidity-manager',
            'check-liquidity',
            [
                types.principal(mockData.dexA),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.uint(mockData.smallAmount)
            ],
            authorized.address
        );
        assertEquals(checkLiquidity.result, 'true');
    },
});

Clarinet.test({
    name: "Test liquidity checks with insufficient amounts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const authorized = accounts.get('deployer')!;
        
        // Configuration de la liquidité initiale
        let block = chain.mineBlock([
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.initialLiquidity)
                ],
                authorized.address
            )
        ]);

        // Test avec un montant supérieur à la liquidité disponible
        let checkLiquidity = chain.callReadOnlyFn(
            'liquidity-manager',
            'check-liquidity',
            [
                types.principal(mockData.dexA),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.uint(mockData.largeAmount)
            ],
            authorized.address
        );
        assertEquals(checkLiquidity.result, 'false');
    },
});

Clarinet.test({
    name: "Ensure non-authorized users cannot update liquidity",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonAuthorized = accounts.get('wallet_1')!;
        
        // Tentative de mise à jour de la liquidité par un utilisateur non autorisé
        let block = chain.mineBlock([
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.initialLiquidity)
                ],
                nonAuthorized.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u1)');
    },
});

Clarinet.test({
    name: "Test liquidity tracking across multiple DEXes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const authorized = accounts.get('deployer')!;
        
        // Configuration des liquidités sur différents DEX
        let block = chain.mineBlock([
            // Liquidité sur DEX A
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.initialLiquidity)
                ],
                authorized.address
            ),
            // Liquidité sur DEX B
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexB),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.initialLiquidity * 2) // Double liquidité sur DEX B
                ],
                authorized.address
            )
        ]);

        // Vérification des liquidités sur les deux DEX
        let checkDexA = chain.callReadOnlyFn(
            'liquidity-manager',
            'check-liquidity',
            [
                types.principal(mockData.dexA),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.uint(mockData.initialLiquidity)
            ],
            authorized.address
        );
        let checkDexB = chain.callReadOnlyFn(
            'liquidity-manager',
            'check-liquidity',
            [
                types.principal(mockData.dexB),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.uint(mockData.initialLiquidity * 2)
            ],
            authorized.address
        );

        assertEquals(checkDexA.result, 'true');
        assertEquals(checkDexB.result, 'true');
    },
});

Clarinet.test({
    name: "Test liquidity update timestamps",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const authorized = accounts.get('deployer')!;
        
        // Mise à jour de la liquidité
        let block = chain.mineBlock([
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.initialLiquidity)
                ],
                authorized.address
            )
        ]);

        // Vérification du timestamp de mise à jour
        let poolInfo = chain.callReadOnlyFn(
            'liquidity-manager',
            'get-pool-liquidity',
            [
                types.principal(mockData.dexA),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB)
            ],
            authorized.address
        );
        
        // Vérifie que le last-update est égal à la hauteur du bloc actuel
        assertEquals(
            poolInfo.result,
            `{liquidity: u${mockData.initialLiquidity}, last-update: u${block.height}}`
        );
    },
});
