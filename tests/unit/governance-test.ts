import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that owner can add and remove admins",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const owner = accounts.get('deployer')!;
        const newAdmin = accounts.get('wallet_1')!;
        
        // Test adding admin
        let block = chain.mineBlock([
            Tx.contractCall('governance', 'add-admin', [types.principal(newAdmin.address)], owner.address)
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');
        
        // Test removing admin
        block = chain.mineBlock([
            Tx.contractCall('governance', 'remove-admin', [types.principal(newAdmin.address)], owner.address)
        ]);
        assertEquals(block.receipts[0].result, '(ok true)');
    },
});

Clarinet.test({
    name: "Ensure that non-owner cannot add admin",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const nonOwner = accounts.get('wallet_1')!;
        const newAdmin = accounts.get('wallet_2')!;
        
        // Test adding admin as non-owner
        let block = chain.mineBlock([
            Tx.contractCall('governance', 'add-admin', [types.principal(newAdmin.address)], nonOwner.address)
        ]);
        assertEquals(block.receipts[0].result, '(err u1)');
    },
});
