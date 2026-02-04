
import { describe, it, expect } from 'vitest';
import { calculateExpenseSettlements, netSettlements, validateSettlementConsistency } from '../expenseLogic';

describe('expenseLogic Settlements', () => {

    describe('calculateExpenseSettlements', () => {
        const groupId = 'group1';
        const alice = { participantId: 'Alice', participantName: 'Alice', amount: 10, isRemainder: false };
        const bob = { participantId: 'Bob', participantName: 'Bob', amount: 10, isRemainder: false };
        const charlie = { participantId: 'Charlie', participantName: 'Charlie', amount: 10, isRemainder: false };

        it('should return receivables for payer when payer is current user', () => {
            const splits = [alice, bob, charlie];
            // Alice (current user) paid 30. Everyone owes Alice 10.
            // Alice's split is 10 (her share).
            const updates = calculateExpenseSettlements(splits, 'Alice', 'Alice', groupId);

            expect(updates).toHaveLength(2); // Bob and Charlie

            const bobUpdate = updates.find(u => u.personId === 'Bob');
            expect(bobUpdate).toBeDefined();
            expect(bobUpdate?.toReceiveChange).toBe(10);
            expect(bobUpdate?.toPayChange).toBe(0);

            const charlieUpdate = updates.find(u => u.personId === 'Charlie');
            expect(charlieUpdate?.toReceiveChange).toBe(10);
        });

        it('should return payable to payer when current user is participant', () => {
            const splits = [alice, bob, charlie];
            // Bob paid. Current user is Alice. Alice owes Bob 10.
            const updates = calculateExpenseSettlements(splits, 'Bob', 'Alice', groupId);

            expect(updates).toHaveLength(1); // Only update for Bob (payer)

            const bobUpdate = updates.find(u => u.personId === 'Bob');
            expect(bobUpdate?.toPayChange).toBe(10);
            expect(bobUpdate?.toReceiveChange).toBe(0);
        });

        it('should return empty array if current user is not involved', () => {
            const splits = [alice, bob, charlie];
            // Bob paid. Current user is Dave (not in splits).
            const updates = calculateExpenseSettlements(splits, 'Bob', 'Dave', groupId);

            expect(updates).toHaveLength(0);
        });

        it('should throw error if payer is not in splits', () => {
            const splits = [alice, bob];
            expect(() => calculateExpenseSettlements(splits, 'Charlie', 'Alice', groupId))
                .toThrow("Payer must be a participant");
        });
    });

    describe('netSettlements', () => {
        it('should net amounts when both receive and pay exist', () => {
            const settlements = {
                group1: {
                    Alice: { toReceive: 20, toPay: 10 }
                }
            };
            const netted = netSettlements(settlements);
            expect(netted.group1.Alice.toReceive).toBe(10);
            expect(netted.group1.Alice.toPay).toBe(0);
        });

        it('should net amounts when pay > receive', () => {
            const settlements = {
                group1: {
                    Alice: { toReceive: 5, toPay: 15 }
                }
            };
            const netted = netSettlements(settlements);
            expect(netted.group1.Alice.toReceive).toBe(0);
            expect(netted.group1.Alice.toPay).toBe(10);
        });

        it('should zero out equal amounts', () => {
            const settlements = {
                group1: {
                    Alice: { toReceive: 10, toPay: 10 }
                }
            };
            const netted = netSettlements(settlements);
            expect(netted.group1.Alice.toReceive).toBe(0);
            expect(netted.group1.Alice.toPay).toBe(0);
        });
    });

    describe('validateSettlementConsistency', () => {
        it('should detect self-settlements', () => {
            const settlements = {
                Alice: { toReceive: 10, toPay: 0 }
            };
            const result = validateSettlementConsistency(settlements, 'Alice');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain("User cannot have settlements with themselves");
        });

        it('should detect mixed positive amounts', () => {
            const settlements = {
                Bob: { toReceive: 10, toPay: 10 }
            };
            const result = validateSettlementConsistency(settlements, 'Alice');
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain("should be netted");
        });
    });
});
