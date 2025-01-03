import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const mockData = {
    // Tokens
    tokenA: 'token-a',
    tokenB: 'token-b',
    tokenC: 'token-c',
    tokenD: 'token-d',
    // DEXs
    dexA: 'dex-a',
    dexB: 'dex-b',
    dexC: 'dex-c',
    // Prix de base (en microunités)
    basePrice: 1000000, // 1.0
};

async function setupRoutingEnvironment(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const priceFeed = accounts.get('wallet_1')!;

    // Configuration des routes multiples
    let block = chain.mineBlock([
        // Route 1: A -> B (directe)
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
        // Route 2: A -> C -> B
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
        ),
        // Route 3: A -> D -> B
        Tx.contractCall(
            'route-manager',
            'add-route',
            [
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.list([
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenD),
                    types.principal(mockData.tokenB)
                ]),
                types.principal(mockData.dexC)
            ],
            admin.address
        )
    ]);

    return block.height;
}

Clarinet.test({
    name: "Test route selection based on price efficiency",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const priceFeed = accounts.get('wallet_1')!;

        // Setup de l'environnement
        await setupRoutingEnvironment(chain, accounts);

        // Configuration des prix différents sur chaque route
        let block = chain.mineBlock([
            // Prix standard pour route directe
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenB),
                    types.uint(mockData.basePrice)
                ],
                priceFeed.address
            ),
            // Meilleur prix via tokenC
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenC),
                    types.uint(mockData.basePrice * 0.9)
                ],
                priceFeed.address
            ),
            // Prix moins bon via tokenD
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenD),
                    types.uint(mockData.basePrice * 1.1)
                ],
                priceFeed.address
            )
        ]);

        // Test de sélection de route
        let bestRoute = chain.callReadOnlyFn(
            'route-manager',
            'get-best-route',
            [
                types.uint(1000000), // montant d'entrée
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB)
            ],
            admin.address
        );

        // Vérifie que la route via tokenC (la moins chère) est sélectionnée
        assertEquals(bestRoute.result.includes(mockData.tokenC), true);
    },
});

Clarinet.test({
    name: "Test route fallback when primary route lacks liquidity",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const user = accounts.get('wallet_2')!;

        // Setup de l'environnement
        await setupRoutingEnvironment(chain, accounts);

        // Configuration des liquidités
        let block = chain.mineBlock([
            // Route principale avec liquidité insuffisante
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexA),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.uint(100000) // Très peu de liquidité
                ],
                admin.address
            ),
            // Route alternative avec bonne liquidité
            Tx.contractCall(
                'liquidity-manager',
                'update-liquidity',
                [
                    types.principal(mockData.dexB),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenC),
                    types.uint(10000000000)
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
                    types.uint(10000000000)
                ],
                admin.address
            )
        ]);

        // Test de sélection de route avec un montant important
        let bestRoute = chain.callReadOnlyFn(
            'route-manager',
            'get-best-route',
            [
                types.uint(1000000000), // montant important
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB)
            ],
            admin.address
        );

        // Vérifie que la route alternative est sélectionnée
        assertEquals(bestRoute.result.includes(mockData.dexB), true);
    },
});

Clarinet.test({
    name: "Test route optimization with gas costs",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const user = accounts.get('wallet_2')!;

        // Setup de l'environnement
        await setupRoutingEnvironment(chain, accounts);

        // Test avec un petit montant où les frais de gas sont significatifs
        let bestRouteSmall = chain.callReadOnlyFn(
            'route-manager',
            'get-best-route',
            [
                types.uint(100000), // petit montant
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB)
            ],
            admin.address
        );

        // Test avec un gros montant où le prix est plus important que les frais de gas
        let bestRouteLarge = chain.callReadOnlyFn(
            'route-manager',
            'get-best-route',
            [
                types.uint(100000000000), // gros montant
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB)
            ],
            admin.address
        );

        // Pour les petits montants, la route directe devrait être préférée
        assertEquals(bestRouteSmall.result.includes(mockData.dexA), true);
        
        // Pour les gros montants, la route la moins chère devrait être préférée
        // même si elle implique plus d'étapes
        assertEquals(bestRouteLarge.result.includes(mockData.dexB), true);
    },
});
