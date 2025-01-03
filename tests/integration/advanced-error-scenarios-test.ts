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
    // Montants et limites
    normalAmount: 1000000000,     // 1000 tokens
    maxAmount: 1000000000000000,  // 1M tokens (limite max)
    basePrice: 1000000,           // 1.0
    maxSlippage: 1000,            // 10% en points de base
};

async function setupAdvancedErrorTest(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const priceFeed = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
        // Configuration de base
        Tx.contractCall(
            'route-manager',
            'add-route',
            [
                types.principal(mockData.tokenA),
                types.principal(mockData.tokenB),
                types.list([types.principal(mockData.tokenA), types.principal(mockData.tokenB)]),
                types.principal(mockData.dexA)
            ],
            admin.address
        )
    ]);
    
    return block.height;
}

Clarinet.test({
    name: "Test error: Circular route detection",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Tentative d'ajout d'une route circulaire
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenA),
                    types.list([
                        types.principal(mockData.tokenA),
                        types.principal(mockData.tokenB),
                        types.principal(mockData.tokenA)
                    ]),
                    types.principal(mockData.dexA)
                ],
                admin.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u10)'); // Erreur route circulaire
    },
});

Clarinet.test({
    name: "Test error: Maximum route length exceeded",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Création d'une route trop longue
        const longPath = Array(12).fill(types.principal(mockData.tokenA));
        
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.list(longPath),
                    types.principal(mockData.dexA)
                ],
                admin.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u11)'); // Erreur longueur maximum dépassée
    },
});

Clarinet.test({
    name: "Test error: Excessive slippage protection",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        const priceFeed = accounts.get('wallet_1')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Configuration d'un prix initial
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

        // Tentative de swap avec un slippage excessif
        block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.normalAmount),
                    types.uint(mockData.normalAmount * 2), // Slippage > 100%
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u12)'); // Erreur slippage excessif
    },
});

Clarinet.test({
    name: "Test error: Maximum transaction amount exceeded",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Tentative de swap avec un montant supérieur à la limite
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.maxAmount * 2), // Dépasse la limite maximale
                    types.uint(mockData.maxAmount),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u13)'); // Erreur montant maximum dépassé
    },
});

Clarinet.test({
    name: "Test error: Blacklisted token detection",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const user = accounts.get('wallet_2')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Ajout d'un token à la blacklist
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance',
                'add-to-blacklist',
                [types.principal(mockData.tokenC)],
                admin.address
            )
        ]);

        // Tentative de swap avec un token blacklisté
        block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.normalAmount),
                    types.uint(mockData.normalAmount),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenC), // Token blacklisté
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u14)'); // Erreur token blacklisté
    },
});

Clarinet.test({
    name: "Test error: Simultaneous route updates",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Tentative de mises à jour simultanées de la même route
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.list([types.principal(mockData.tokenA), types.principal(mockData.tokenB)]),
                    types.principal(mockData.dexA)
                ],
                admin.address
            ),
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.list([types.principal(mockData.tokenA), types.principal(mockData.tokenC), types.principal(mockData.tokenB)]),
                    types.principal(mockData.dexB)
                ],
                admin.address
            )
        ]);

        assertEquals(block.receipts[1].result, '(err u15)'); // Erreur mise à jour simultanée
    },
});

Clarinet.test({
    name: "Test error: Invalid recipient address",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Tentative de swap avec une adresse de destinataire invalide
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.normalAmount),
                    types.uint(mockData.normalAmount),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal('SP000000000000000000000000000000000') // Adresse invalide
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u16)'); // Erreur adresse destinataire invalide
    },
});

Clarinet.test({
    name: "Test error: Emergency shutdown activation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const user = accounts.get('wallet_2')!;
        
        await setupAdvancedErrorTest(chain, accounts);

        // Activation du mode urgence
        let block = chain.mineBlock([
            Tx.contractCall(
                'governance',
                'emergency-shutdown',
                [],
                admin.address
            )
        ]);

        // Tentative de swap pendant le shutdown
        block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.normalAmount),
                    types.uint(mockData.normalAmount),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u17)'); // Erreur système en pause
    },
});
