import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Mock tokens pour les tests
const tokenA = 'token-a';
const tokenB = 'token-b';
const tokenC = 'token-c';
const dexA = 'dex-a';
const dexB = 'dex-b';

Clarinet.test({
    name: "Ensure admin can add and retrieve routes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        // Test ajout d'une route simple
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenA),
                    types.principal(tokenB),
                    types.list([types.principal(tokenA), types.principal(tokenB)]),
                    types.principal(dexA)
                ],
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Vérification de la route ajoutée
        let getRoute = chain.callReadOnlyFn(
            'route-manager',
            'get-routes',
            [
                types.principal(tokenA),
                types.principal(tokenB)
            ],
            admin.address
        );
        assertEquals(
            getRoute.result,
            `(some {dex: ${dexA}, path: [${tokenA}, ${tokenB}]})`
        );
    },
});

Clarinet.test({
    name: "Test multi-hop route addition and retrieval",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        // Ajout d'une route multi-hop (A -> C -> B)
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenA),
                    types.principal(tokenB),
                    types.list([
                        types.principal(tokenA),
                        types.principal(tokenC),
                        types.principal(tokenB)
                    ]),
                    types.principal(dexA)
                ],
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Vérification de la route multi-hop
        let getRoute = chain.callReadOnlyFn(
            'route-manager',
            'get-routes',
            [
                types.principal(tokenA),
                types.principal(tokenB)
            ],
            admin.address
        );
        assertEquals(
            getRoute.result,
            `(some {dex: ${dexA}, path: [${tokenA}, ${tokenC}, ${tokenB}]})`
        );
    },
});

Clarinet.test({
    name: "Test best route selection with multiple options",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        // Ajout de plusieurs routes alternatives
        let block = chain.mineBlock([
            // Route directe via DEX A
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenA),
                    types.principal(tokenB),
                    types.list([types.principal(tokenA), types.principal(tokenB)]),
                    types.principal(dexA)
                ],
                admin.address
            ),
            // Route alternative via DEX B
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenA),
                    types.principal(tokenB),
                    types.list([
                        types.principal(tokenA),
                        types.principal(tokenC),
                        types.principal(tokenB)
                    ]),
                    types.principal(dexB)
                ],
                admin.address
            )
        ]);
        
        // Test de sélection de la meilleure route
        let bestRoute = chain.callReadOnlyFn(
            'route-manager',
            'get-best-route',
            [
                types.uint(1000), // amount-in
                types.principal(tokenA),
                types.principal(tokenB)
            ],
            admin.address
        );
        
        // Vérifie que la fonction retourne une route valide
        // Note: Le résultat exact dépendra de la logique de prix implémentée
        assertEquals(bestRoute.result.includes('dex'), true);
        assertEquals(bestRoute.result.includes('path'), true);
    },
});

Clarinet.test({
    name: "Ensure non-admin cannot add routes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonAdmin = accounts.get('wallet_1')!;
        
        // Tentative d'ajout de route par un non-admin
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenA),
                    types.principal(tokenB),
                    types.list([types.principal(tokenA), types.principal(tokenB)]),
                    types.principal(dexA)
                ],
                nonAdmin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u1)');
    },
});

Clarinet.test({
    name: "Test path validation and constraints",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        // Test avec un chemin trop long (> 10 tokens)
        const longPath = Array(11).fill(types.principal(tokenA));
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(tokenA),
                    types.principal(tokenB),
                    types.list(longPath),
                    types.principal(dexA)
                ],
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u3)'); // Erreur de chemin trop long
    },
});
