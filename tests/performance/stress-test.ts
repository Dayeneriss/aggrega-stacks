import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const mockData = {
    // Tokens de test
    tokens: [
        'token-a', 'token-b', 'token-c', 
        'token-d', 'token-e', 'token-f'
    ],
    // DEXs de test
    dexes: [
        'dex-a', 'dex-b', 'dex-c'
    ],
    // Montants pour les tests
    amounts: {
        small: 100000000,      // 100 tokens
        medium: 1000000000,    // 1000 tokens
        large: 10000000000,    // 10000 tokens
    },
    // Prix de base
    basePrice: 1000000        // 1.0
};

async function setupStressTestEnvironment(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const priceFeed = accounts.get('wallet_1')!;
    
    // Configuration du réseau de routes
    const routeSetup = mockData.tokens.flatMap((tokenIn, i) => 
        mockData.tokens.slice(i + 1).map((tokenOut, j) => 
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenIn),
                    types.principal(tokenOut),
                    types.list([types.principal(tokenIn), types.principal(tokenOut)]),
                    types.principal(mockData.dexes[j % mockData.dexes.length])
                ],
                admin.address
            )
        )
    );

    // Configuration des prix initiaux
    const priceSetup = mockData.tokens.map(token =>
        Tx.contractCall(
            'price-manager',
            'update-price',
            [
                types.principal(token),
                types.uint(mockData.basePrice)
            ],
            priceFeed.address
        )
    );

    // Configuration des liquidités
    const liquiditySetup = mockData.tokens.flatMap((tokenIn, i) =>
        mockData.tokens.slice(i + 1).flatMap((tokenOut, j) =>
            mockData.dexes.map(dex =>
                Tx.contractCall(
                    'liquidity-manager',
                    'update-liquidity',
                    [
                        types.principal(dex),
                        types.principal(tokenIn),
                        types.principal(tokenOut),
                        types.uint(mockData.amounts.large * 100) // Grande liquidité pour les tests
                    ],
                    admin.address
                )
            )
        )
    );

    let block = chain.mineBlock([
        ...routeSetup,
        ...priceSetup,
        ...liquiditySetup
    ]);

    return block.height;
}

Clarinet.test({
    name: "Stress test: Multiple simultaneous swaps",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const users = Array.from({ length: 5 }, (_, i) => accounts.get(`wallet_${i + 2}`)!);
        
        await setupStressTestEnvironment(chain, accounts);

        // Génération de multiples swaps simultanés
        const simultaneousSwaps = users.flatMap(user =>
            mockData.tokens.slice(0, -1).map((tokenIn, i) =>
                Tx.contractCall(
                    'router',
                    'swap-tokens',
                    [
                        types.uint(mockData.amounts.medium),
                        types.uint(mockData.amounts.medium * 0.95), // 5% slippage
                        types.principal(tokenIn),
                        types.principal(mockData.tokens[i + 1]),
                        types.principal(user.address)
                    ],
                    user.address
                )
            )
        );

        let block = chain.mineBlock(simultaneousSwaps);
        
        // Vérification que tous les swaps ont réussi
        block.receipts.forEach(receipt => {
            assertEquals(receipt.result, '(ok true)');
        });
    },
});

Clarinet.test({
    name: "Performance test: Complex route finding",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupStressTestEnvironment(chain, accounts);

        // Test de recherche de route avec différentes tailles de montants
        const routeTests = Object.values(mockData.amounts).map(amount =>
            chain.callReadOnlyFn(
                'route-manager',
                'get-best-route',
                [
                    types.uint(amount),
                    types.principal(mockData.tokens[0]),
                    types.principal(mockData.tokens[mockData.tokens.length - 1])
                ],
                user.address
            )
        );

        // Vérification que toutes les recherches de route retournent un résultat
        routeTests.forEach(result => {
            assertEquals(result.result.includes('none'), false);
        });
    },
});

Clarinet.test({
    name: "Stress test: Rapid price updates",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('wallet_1')!;
        
        await setupStressTestEnvironment(chain, accounts);

        // Simulation de mises à jour rapides des prix
        const priceUpdates = Array.from({ length: 20 }, (_, i) =>
            mockData.tokens.map(token =>
                Tx.contractCall(
                    'price-manager',
                    'update-price',
                    [
                        types.principal(token),
                        types.uint(mockData.basePrice * (1 + (i % 10) / 100)) // Variation de prix de 0-9%
                    ],
                    priceFeed.address
                )
            )
        ).flat();

        let block = chain.mineBlock(priceUpdates);
        
        // Vérification que toutes les mises à jour ont réussi
        block.receipts.forEach(receipt => {
            assertEquals(receipt.result, '(ok true)');
        });
    },
});

Clarinet.test({
    name: "Performance test: Large liquidity movements",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const user = accounts.get('wallet_2')!;
        
        await setupStressTestEnvironment(chain, accounts);

        // Simulation de grands mouvements de liquidité
        const liquidityMoves = mockData.dexes.flatMap(dex =>
            mockData.tokens.slice(0, -1).flatMap((tokenIn, i) =>
                Tx.contractCall(
                    'liquidity-manager',
                    'update-liquidity',
                    [
                        types.principal(dex),
                        types.principal(tokenIn),
                        types.principal(mockData.tokens[i + 1]),
                        types.uint(mockData.amounts.large * 1000) // Très grande liquidité
                    ],
                    admin.address
                )
            )
        );

        let block = chain.mineBlock(liquidityMoves);
        
        // Test de swap après les mouvements de liquidité
        block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.amounts.large),
                    types.uint(mockData.amounts.large * 0.95),
                    types.principal(mockData.tokens[0]),
                    types.principal(mockData.tokens[1]),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(ok true)');
    },
});
