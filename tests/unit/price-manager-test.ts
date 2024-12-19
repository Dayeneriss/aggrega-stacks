import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Mock data pour les tests
const mockData = {
    tokenA: 'token-a',
    tokenB: 'token-b',
    tokenC: 'token-c',
    dexA: 'dex-a',
    dexB: 'dex-b',
    // Prix en microunités (1.0 = 1000000)
    basePrice: 1000000,    // 1.0
    highPrice: 1500000,    // 1.5
    lowPrice: 500000,      // 0.5
    testAmount: 1000000000 // 1000 tokens
};

Clarinet.test({
    name: "Ensure price feed can update token prices",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('deployer')!;
        
        // Test mise à jour du prix
        let block = chain.mineBlock([
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenA),
                    types.uint(mockData.basePrice)
                ],
                priceFeed.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Vérification du prix mis à jour
        let getPrice = chain.callReadOnlyFn(
            'price-manager',
            'get-token-price',
            [types.principal(mockData.tokenA)],
            priceFeed.address
        );
        assertEquals(
            getPrice.result,
            `{price: u${mockData.basePrice}, last-update: u${block.height}}`
        );
    },
});

Clarinet.test({
    name: "Test best price calculation across multiple routes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('deployer')!;
        
        // Configuration des prix sur différentes routes
        let block = chain.mineBlock([
            // Prix pour tokenA
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenA),
                    types.uint(mockData.basePrice)
                ],
                priceFeed.address
            ),
            // Prix pour tokenB
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenB),
                    types.uint(mockData.highPrice)
                ],
                priceFeed.address
            ),
            // Prix pour tokenC
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenC),
                    types.uint(mockData.lowPrice)
                ],
                priceFeed.address
            )
        ]);

        // Test du calcul du meilleur prix avec plusieurs routes
        const routes = [
            // Route directe A -> B
            {
                dex: mockData.dexA,
                path: [mockData.tokenA, mockData.tokenB]
            },
            // Route indirecte A -> C -> B
            {
                dex: mockData.dexB,
                path: [mockData.tokenA, mockData.tokenC, mockData.tokenB]
            }
        ];

        let bestPrice = chain.callReadOnlyFn(
            'price-manager',
            'get-best-price',
            [
                types.uint(mockData.testAmount),
                types.list(routes.map(r => types.tuple({
                    'dex': types.principal(r.dex),
                    'path': types.list(r.path.map(t => types.principal(t)))
                })))
            ],
            priceFeed.address
        );

        // Vérifie que le résultat n'est pas none
        assertEquals(bestPrice.result.includes('none'), false);
    },
});

Clarinet.test({
    name: "Ensure non-price-feed cannot update prices",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonPriceFeed = accounts.get('wallet_1')!;
        
        // Tentative de mise à jour du prix par un non-price-feed
        let block = chain.mineBlock([
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenA),
                    types.uint(mockData.basePrice)
                ],
                nonPriceFeed.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u1)');
    },
});

Clarinet.test({
    name: "Test price impact on large orders",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('deployer')!;
        
        // Configuration du prix initial
        let setupBlock = chain.mineBlock([
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenA),
                    types.uint(mockData.basePrice)
                ],
                priceFeed.address
            )
        ]);

        // Test avec différentes tailles d'ordres
        const smallOrder = mockData.testAmount;
        const largeOrder = mockData.testAmount * 100;

        let smallOrderPrice = chain.callReadOnlyFn(
            'price-manager',
            'calculate-price-with-impact',
            [
                types.uint(smallOrder),
                types.principal(mockData.tokenA)
            ],
            priceFeed.address
        );

        let largeOrderPrice = chain.callReadOnlyFn(
            'price-manager',
            'calculate-price-with-impact',
            [
                types.uint(largeOrder),
                types.principal(mockData.tokenA)
            ],
            priceFeed.address
        );

        // Vérifie que le prix par unité est plus élevé pour les grands ordres
        const smallPricePerUnit = parseInt(smallOrderPrice.result.substr(2)) / smallOrder;
        const largePricePerUnit = parseInt(largeOrderPrice.result.substr(2)) / largeOrder;
        assertEquals(largePricePerUnit > smallPricePerUnit, true);
    },
});

Clarinet.test({
    name: "Test price staleness check",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('deployer')!;
        
        // Mise à jour du prix
        let block = chain.mineBlock([
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenA),
                    types.uint(mockData.basePrice)
                ],
                priceFeed.address
            )
        ]);

        // Avance de plusieurs blocs
        chain.mineEmptyBlock(100);

        // Vérification de la fraîcheur du prix
        let checkStaleness = chain.callReadOnlyFn(
            'price-manager',
            'is-price-stale',
            [types.principal(mockData.tokenA)],
            priceFeed.address
        );

        // Le prix devrait être considéré comme périmé après 100 blocs
        assertEquals(checkStaleness.result, 'true');
    },
});
