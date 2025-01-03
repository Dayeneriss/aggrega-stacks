import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

const mockData = {
    // Tokens principaux
    stablecoin: 'usda-token',
    btc: 'xbtc-token',
    eth: 'xeth-token',
    // DEXs
    primaryDex: 'primary-dex',
    secondaryDex: 'secondary-dex',
    // Prix de base (en microunités)
    prices: {
        btc: 50000000000,  // $50,000
        eth: 3000000000,   // $3,000
        stable: 1000000    // $1
    },
    // Montants
    amounts: {
        small: 1000000,     // $1
        medium: 10000000,   // $10
        large: 100000000    // $100
    }
};

async function setupMarketScenario(chain: Chain, accounts: Map<string, Account>) {
    const admin = accounts.get('deployer')!;
    const priceFeed = accounts.get('wallet_1')!;

    // Configuration initiale du marché
    let block = chain.mineBlock([
        // Configuration des routes principales
        Tx.contractCall(
            'route-manager',
            'add-route',
            [
                types.principal(mockData.stablecoin),
                types.principal(mockData.btc),
                types.list([
                    types.principal(mockData.stablecoin),
                    types.principal(mockData.btc)
                ]),
                types.principal(mockData.primaryDex)
            ],
            admin.address
        ),
        // Prix initiaux
        Tx.contractCall(
            'price-manager',
            'update-price',
            [
                types.principal(mockData.btc),
                types.uint(mockData.prices.btc)
            ],
            priceFeed.address
        )
    ]);

    return block.height;
}

Clarinet.test({
    name: "Simulation: Market volatility scenario",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('wallet_1')!;
        const trader = accounts.get('wallet_2')!;
        
        await setupMarketScenario(chain, accounts);

        // Simulation d'une période de forte volatilité
        const volatilityScenario = [
            // Chute brutale du prix (-20%)
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.btc),
                    types.uint(mockData.prices.btc * 0.8)
                ],
                priceFeed.address
            ),
            // Tentative de swap pendant la volatilité
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.amounts.medium),
                    types.uint(mockData.amounts.medium * 0.75), // Slippage plus large
                    types.principal(mockData.stablecoin),
                    types.principal(mockData.btc),
                    types.principal(trader.address)
                ],
                trader.address
            )
        ];

        let block = chain.mineBlock(volatilityScenario);
        
        // Le swap devrait réussir malgré la volatilité grâce au slippage élevé
        assertEquals(block.receipts[1].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Simulation: Flash crash recovery",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const priceFeed = accounts.get('wallet_1')!;
        const trader = accounts.get('wallet_2')!;
        
        await setupMarketScenario(chain, accounts);

        // Simulation d'un flash crash
        const flashCrashScenario = [
            // Chute brutale (-50%)
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.btc),
                    types.uint(mockData.prices.btc * 0.5)
                ],
                priceFeed.address
            ),
            // Récupération rapide
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.btc),
                    types.uint(mockData.prices.btc * 0.9)
                ],
                priceFeed.address
            )
        ];

        let block = chain.mineBlock(flashCrashScenario);
        
        // Vérification que le système a correctement géré le flash crash
        let priceAfterCrash = chain.callReadOnlyFn(
            'price-manager',
            'get-token-price',
            [types.principal(mockData.btc)],
            trader.address
        );
        
        // Le prix devrait être revenu à 90% du prix initial
        assertEquals(
            priceAfterCrash.result,
            `{price: u${mockData.prices.btc * 0.9}, last-update: u${block.height}}`
        );
    },
});

Clarinet.test({
    name: "Simulation: High volume trading period",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const traders = Array.from({ length: 5 }, (_, i) => accounts.get(`wallet_${i + 2}`)!);
        
        await setupMarketScenario(chain, accounts);

        // Simulation d'une période de trading intense
        const highVolumeScenario = traders.flatMap(trader => [
            // Achat
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.amounts.large),
                    types.uint(mockData.amounts.large * 0.95),
                    types.principal(mockData.stablecoin),
                    types.principal(mockData.btc),
                    types.principal(trader.address)
                ],
                trader.address
            ),
            // Vente
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.amounts.large),
                    types.uint(mockData.amounts.large * 0.95),
                    types.principal(mockData.btc),
                    types.principal(mockData.stablecoin),
                    types.principal(trader.address)
                ],
                trader.address
            )
        ]);

        let block = chain.mineBlock(highVolumeScenario);
        
        // Vérification que toutes les transactions ont réussi
        block.receipts.forEach(receipt => {
            assertEquals(receipt.result, '(ok true)');
        });
    },
});

Clarinet.test({
    name: "Simulation: Market manipulation attempt",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const maliciousTrader = accounts.get('wallet_2')!;
        const priceFeed = accounts.get('wallet_1')!;
        
        await setupMarketScenario(chain, accounts);

        // Tentative de manipulation de marché
        const manipulationAttempt = [
            // Mise à jour rapide des prix
            Tx.contractCall(
                'price-manager',
                'update-price',
                [
                    types.principal(mockData.btc),
                    types.uint(mockData.prices.btc * 1.5) // +50%
                ],
                priceFeed.address
            ),
            // Tentative de swap immédiat
            Tx.contractCall(
                'router',
                'swap-tokens',
                [
                    types.uint(mockData.amounts.large),
                    types.uint(mockData.amounts.large * 0.95),
                    types.principal(mockData.stablecoin),
                    types.principal(mockData.btc),
                    types.principal(maliciousTrader.address)
                ],
                maliciousTrader.address
            )
        ];

        let block = chain.mineBlock(manipulationAttempt);
        
        // Le swap devrait échouer à cause de la protection contre la manipulation
        assertEquals(block.receipts[1].result.includes('err'), true);
    },
});
