import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Mock data pour les tests d'intégration
const mockData = {
    // Tokens
    tokenA: 'token-a',
    tokenB: 'token-b',
    tokenC: 'token-c',
    // DEXs
    dexA: 'dex-a',
    dexB: 'dex-b',
    // Montants
    swapAmount: 1000000000,    // 1000 tokens
    minOutput: 950000000,      // 950 tokens (5% slippage)
    // Prix
    priceA: 1000000,          // 1.0
    priceB: 1500000,          // 1.5
    priceC: 750000,           // 0.75
    // Liquidité
    baseLiquidity: 100000000000 // 100,000 tokens
};

async function setupTestEnvironment(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const priceFeed = accounts.get('wallet_1')!;
    
    // 1. Configuration de la gouvernance
    let block = chain.mineBlock([
        Tx.contractCall(
            'governance',
            'add-admin',
            [types.principal(priceFeed.address)],
            admin.address
        )
    ]);

    // 2. Configuration des routes
    block = chain.mineBlock([
        // Route directe A -> B
        Tx.contractCall(
            'route-manager',
            'add-route',
            [
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.list([
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB)
                ]),
                types.principal(mockData.dexA)
            ],
            admin.address
        ),
        // Route alternative A -> C -> B
        Tx.contractCall(
            'route-manager',
            'add-route',
            [
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.list([
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenC),
                    types.principal(mockData.tokenB)
                ]),
                types.principal(mockData.dexB)
            ],
            admin.address
        )
    ]);

    // 3. Configuration des prix
    block = chain.mineBlock([
        Tx.contractCall(
            'price-manager',
            'update-price',
            [types.principal(mockData.tokenA), types.uint(mockData.priceA)],
            priceFeed.address
        ),
        Tx.contractCall(
            'price-manager',
            'update-price',
            [types.principal(mockData.tokenB), types.uint(mockData.priceB)],
            priceFeed.address
        ),
        Tx.contractCall(
            'price-manager',
            'update-price',
            [types.principal(mockData.tokenC), types.uint(mockData.priceC)],
            priceFeed.address
        )
    ]);

    // 4. Configuration des liquidités
    block = chain.mineBlock([
        Tx.contractCall(
            'liquidity-manager',
            'update-liquidity',
            [
                types.principal(mockData.dexA),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.uint(mockData.baseLiquidity)
            ],
            admin.address
        ),
        Tx.contractCall(
            'liquidity-manager',
            'update-liquidity',
            [
                types.principal(mockData.dexB),
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenC),
                types.uint(mockData.baseLiquidity)
            ],
            admin.address
        ),
        Tx.contractCall(
            'liquidity-manager',
            'update-liquidity',
            [
                types.principal(mockData.dexB),
                types.principal(mockData.tokenC),
                types.principal(mockData.tokenB),
                types.uint(mockData.baseLiquidity)
            ],
            admin.address
        )
    ]);

    return block.height;
}

Clarinet.test({
    name: "Test complete swap flow with route selection",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        // Setup de l'environnement de test
        await setupTestEnvironment(chain, accounts);

        // Exécution du swap
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.swapAmount),
                    types.uint(mockData.minOutput),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        // Vérification du succès du swap
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Vérification des événements émis
        const events = block.receipts[0].events;
        assertEquals(events.length > 0, true);
    },
});

Clarinet.test({
    name: "Test swap flow with insufficient liquidity",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        const admin = accounts.get('deployer')!;
        
        // Setup avec liquidité insuffisante
        await setupTestEnvironment(chain, accounts);
        
        // Mise à jour de la liquidité à un niveau très bas
        let block = chain.mineBlock([
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(mockData.swapAmount / 2) // Liquidité insuffisante
                ],
                admin.address
            )
        ]);

        // Tentative de swap
        block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.swapAmount),
                    types.uint(mockData.minOutput),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        // Vérification de l'échec du swap
        assertEquals(block.receipts[0].result.includes('err'), true);
    },
});

Clarinet.test({
    name: "Test swap flow with price impact protection",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        // Setup normal
        await setupTestEnvironment(chain, accounts);

        // Tentative de swap avec un minOutput très élevé
        const highMinOutput = mockData.swapAmount * 2; // Demande un retour irréaliste
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.swapAmount),
                    types.uint(highMinOutput),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        // Vérification que le swap a échoué à cause du slippage
        assertEquals(block.receipts[0].result.includes('err'), true);
    },
});
