import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const mockData = {
    // Tokens
    tokenA: 'token-a',
    tokenB: 'token-b',
    tokenC: 'token-c',
    // DEXs
    dexA: 'dex-a',
    dexB: 'dex-b',
    // Montants
    normalAmount: 1000000000,    // 1000 tokens
    hugeLiquidity: 1000000000000, // 1M tokens
    // Prix
    basePrice: 1000000,          // 1.0
};

async function setupErrorTestEnvironment(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const priceFeed = accounts.get('wallet_1')!;
    
    // Configuration basique pour les tests
    let block = chain.mineBlock([
        // Ajout d'une route simple
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
        // Configuration prix initial
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
    
    return block.height;
}

Clarinet.test({
    name: "Test error: Non-existent route",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupErrorTestEnvironment(chain, accounts);

        // Tentative de swap avec des tokens sans route configurée
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.normalAmount),
                    types.uint(mockData.normalAmount),
                    types.principal(mockData.tokenB), // Route B->C n'existe pas
                    types.principal(mockData.tokenC),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u3)'); // Code erreur pour route non trouvée
    },
});

Clarinet.test({
    name: "Test error: Stale price data",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupErrorTestEnvironment(chain, accounts);
        
        // Avancer de nombreux blocs pour rendre les prix obsolètes
        chain.mineEmptyBlock(100);

        // Tentative de swap avec des prix obsolètes
        let block = chain.mineBlock([
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

        assertEquals(block.receipts[0].result, '(err u4)'); // Code erreur pour prix obsolète
    },
});

Clarinet.test({
    name: "Test error: Invalid token addresses",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupErrorTestEnvironment(chain, accounts);

        // Tentative de swap avec une adresse de token invalide
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.normalAmount),
                    types.uint(mockData.normalAmount),
                    types.principal(user.address), // Adresse invalide pour un token
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u5)'); // Code erreur pour token invalide
    },
});

Clarinet.test({
    name: "Test error: Zero amount swap",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupErrorTestEnvironment(chain, accounts);

        // Tentative de swap avec un montant nul
        let block = chain.mineBlock([
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(0), // Montant zéro
                    types.uint(0),
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.principal(user.address)
                ],
                user.address
            )
        ]);

        assertEquals(block.receipts[0].result, '(err u6)'); // Code erreur pour montant invalide
    },
});

Clarinet.test({
    name: "Test error: Insufficient allowance",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        
        await setupErrorTestEnvironment(chain, accounts);

        // Tentative de swap sans allowance suffisante
        let block = chain.mineBlock([
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

        assertEquals(block.receipts[0].result, '(err u7)'); // Code erreur pour allowance insuffisante
    },
});

Clarinet.test({
    name: "Test error: DEX execution failure",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const user = accounts.get('wallet_2')!;
        
        await setupErrorTestEnvironment(chain, accounts);

        // Configuration d'un DEX défectueux
        let block = chain.mineBlock([
            Tx.contractCall(
                'route-manager',
                'add-route',
                [
                    types.principal(mockData.tokenA),
                    types.principal(mockData.tokenB),
                    types.list([types.principal(mockData.tokenA), types.principal(mockData.tokenB)]),
                    types.principal(mockData.dexB) // DEX qui va échouer
                ],
                admin.address
            )
        ]);

        // Tentative de swap qui devrait échouer au niveau du DEX
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

        assertEquals(block.receipts[0].result, '(err u8)'); // Code erreur pour échec d'exécution DEX
    },
});

Clarinet.test({
    name: "Test error: Price manipulation protection",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const user = accounts.get('wallet_2')!;
        const priceFeed = accounts.get('wallet_1')!;
        
        await setupErrorTestEnvironment(chain, accounts);

        // Simulation d'une variation de prix suspecte
        let block = chain.mineBlock([
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.tokenA),
                    types.uint(mockData.basePrice * 2) // Doublement soudain du prix
                ],
                priceFeed.address
            )
        ]);

        // Tentative de swap qui devrait être bloquée par la protection
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

        assertEquals(block.receipts[0].result, '(err u9)'); // Code erreur pour variation de prix suspecte
    },
});
