import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Helper pour créer un mock DEX pour les tests
const mockDex = {
    name: 'mock-dex',
    // Mock d'un DEX implémentant le trait dex-trait
    contract: `(impl-trait .router.dex-trait)
               (define-public (swap-exact-tokens-for-tokens (amount-in uint) (min-amount-out uint) (token-in principal) (token-out principal))
                   (ok u100))
               (define-public (get-amount-out (amount-in uint) (token-in principal) (token-out principal))
                   (ok u100))`
};

// Helper pour créer un mock token pour les tests
const mockToken = {
    name: 'mock-token',
    contract: `(define-fungible-token mock-token)
               (define-public (transfer (amount uint) (sender principal) (recipient principal))
                   (ok true))`
};

Clarinet.test({
    name: "Ensure basic swap works with valid parameters",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        
        // Test basic swap
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(100), // amount-in
                    types.uint(95),  // min-amount-out
                    types.principal(mockToken.name), // token-in
                    types.principal(mockToken.name), // token-out
                    types.principal(user.address)    // recipient
                ],
                user.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure swap fails with insufficient output amount",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_1')!;
        
        // Test swap with high min-amount-out
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(100),  // amount-in
                    types.uint(150),  // min-amount-out (trop élevé)
                    types.principal(mockToken.name), // token-in
                    types.principal(mockToken.name), // token-out
                    types.principal(user.address)    // recipient
                ],
                user.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u2)'); // Supposons que u2 soit l'erreur pour "insufficient output amount"
    },
});

Clarinet.test({
    name: "Test route selection with multiple DEXes",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const user = accounts.get('wallet_1')!;
        
        // Ajout d'une route valide
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(mockToken.name), // token-in
                    types.principal(mockToken.name), // token-out
                    types.list([types.principal(mockToken.name)]), // path
                    types.principal(mockDex.name)    // dex
                ],
                deployer.address
            ),
            // Test swap avec la route ajoutée
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(100),
                    types.uint(95),
                    types.principal(mockToken.name),
                    types.principal(mockToken.name),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);
        
        assertEquals(block.receipts[1].result, '(ok true)');
    },
});
