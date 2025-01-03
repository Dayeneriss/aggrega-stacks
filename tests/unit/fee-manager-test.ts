import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Mock data pour les tests
const mockData = {
    // Montants de test (en microunités)
    testAmount: 1000000000,     // 1000 tokens
    smallAmount: 100000000,     // 100 tokens
    largeAmount: 10000000000,   // 10000 tokens
    // Pourcentages de frais (en points de base, 1 bp = 0.01%)
    defaultFee: 30,             // 0.3%
    lowFee: 10,                 // 0.1%
    highFee: 50,               // 0.5%
};

Clarinet.test({
    name: "Test basic fee calculation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Test du calcul des frais avec le taux par défaut
        let feeCalculation = chain.callReadOnlyFn(
            'fee-manager',
            'calculate-fee',
            [types.uint(mockData.testAmount)],
            deployer.address
        );

        // Vérifie que les frais sont de 0.3% du montant
        const expectedFee = Math.floor(mockData.testAmount * mockData.defaultFee / 10000);
        assertEquals(feeCalculation.result, `u${expectedFee}`);
    },
});

Clarinet.test({
    name: "Ensure only admin can change fee percentage",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const nonAdmin = accounts.get('wallet_1')!;
        
        // Test changement de frais par l'admin
        let block = chain.mineBlock([
            Tx.contractCall(
                'fee-manager',
                'set-fee',
                [types.uint(mockData.lowFee)],
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Test changement de frais par un non-admin
        block = chain.mineBlock([
            Tx.contractCall(
                'fee-manager',
                'set-fee',
                [types.uint(mockData.highFee)],
                nonAdmin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u1)');
    },
});

Clarinet.test({
    name: "Test fee calculation with different amounts",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        // Test avec petit montant
        let smallFeeCal = chain.callReadOnlyFn(
            'fee-manager',
            'calculate-fee',
            [types.uint(mockData.smallAmount)],
            deployer.address
        );
        const expectedSmallFee = Math.floor(mockData.smallAmount * mockData.defaultFee / 10000);
        assertEquals(smallFeeCal.result, `u${expectedSmallFee}`);

        // Test avec grand montant
        let largeFeeCal = chain.callReadOnlyFn(
            'fee-manager',
            'calculate-fee',
            [types.uint(mockData.largeAmount)],
            deployer.address
        );
        const expectedLargeFee = Math.floor(mockData.largeAmount * mockData.defaultFee / 10000);
        assertEquals(largeFeeCal.result, `u${expectedLargeFee}`);
    },
});

Clarinet.test({
    name: "Test fee recipient management",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const newRecipient = accounts.get('wallet_1')!;
        
        // Test changement du destinataire des frais
        let block = chain.mineBlock([
            Tx.contractCall(
                'fee-manager',
                'set-fee-recipient',
                [types.principal(newRecipient.address)],
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Vérification du nouveau destinataire
        let getFeeRecipient = chain.callReadOnlyFn(
            'fee-manager',
            'get-fee-recipient',
            [],
            admin.address
        );
        assertEquals(getFeeRecipient.result, `${newRecipient.address}`);
    },
});

Clarinet.test({
    name: "Test fee limits and constraints",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const admin = accounts.get('deployer')!;
        const maxFee = 100; // 1%
        
        // Test avec un taux de frais trop élevé
        let block = chain.mineBlock([
            Tx.contractCall(
                'fee-manager',
                'set-fee',
                [types.uint(maxFee + 1)], // Tente de définir un taux > 1%
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(err u2)'); // Erreur de dépassement de limite

        // Test avec un taux de frais valide
        block = chain.mineBlock([
            Tx.contractCall(
                'fee-manager',
                'set-fee',
                [types.uint(maxFee)],
                admin.address
            )
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Test fee calculation precision",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const smallestAmount = 100; // Très petit montant pour tester la précision
        
        // Test du calcul des frais avec un très petit montant
        let feeCalculation = chain.callReadOnlyFn(
            'fee-manager',
            'calculate-fee',
            [types.uint(smallestAmount)],
            deployer.address
        );

        // Vérifie que le calcul des frais gère correctement les petits montants
        const expectedFee = Math.floor(smallestAmount * mockData.defaultFee / 10000);
        assertEquals(feeCalculation.result, `u${expectedFee}`);
        
        // Vérifie que les frais ne sont jamais négatifs
        assertEquals(parseInt(feeCalculation.result.substr(1)) >= 0, true);
    },
});
