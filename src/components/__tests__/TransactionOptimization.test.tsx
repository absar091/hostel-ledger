// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React, { memo } from "react";
import { TransactionList } from "../TransactionList";
import { type Transaction, type Group } from "@/contexts/FirebaseDataContext";

const mocks = vi.hoisted(() => {
  const MockItem = vi.fn(({ groupName }: { groupName?: string }) => (
    <div data-testid="transaction-item">{groupName || "No Group"}</div>
  ));
  return {
    MockItem,
  };
});

// We need to apply memo in the mock factory itself, using the required React
vi.mock("../TransactionItem", async (importOriginal) => {
  const React = await import("react");
  // Important: We must ensure React.memo is working correctly.
  // The issue might be that other props (like onClick) are changing.
  // In the test, we pass `() => {}` inline which creates a new function reference every render.
  const MemoizedItem = React.memo(mocks.MockItem);
  return {
    TransactionItem: MemoizedItem,
  };
});

describe("TransactionList Optimization", () => {
  const mockTransactions: Transaction[] = [
    {
      id: "t1",
      groupId: "g1",
      type: "expense",
      title: "Lunch",
      amount: 100,
      paidBy: "u1",
      paidByName: "User 1",
      participants: [{ id: "u1", name: "User 1", amount: 100 }],
      createdAt: new Date().toISOString(),
      date: new Date().toISOString(),
    },
  ];

  const mockGroups: Group[] = [
    {
      id: "g1",
      name: "Group 1",
      emoji: "🍔",
      members: [],
      createdBy: "u1",
      createdAt: new Date().toISOString(),
    },
  ];

  it("should not re-render TransactionItem when an unrelated group changes", () => {
    // Define stable props
    const handleSelect = vi.fn();
    const formatAmount = (a: number) => `${a}`;

    const { rerender } = render(
      <TransactionList
        transactions={mockTransactions}
        groups={mockGroups}
        onSelectTransaction={handleSelect}
        formatAmount={formatAmount}
      />
    );

    // Initial render count should be 1
    expect(mocks.MockItem).toHaveBeenCalledTimes(1);

    // Create a new groups array with an unrelated change (new group added)
    const newGroups = [
      mockGroups[0],
      {
        id: "g2",
        name: "Group 2",
        emoji: "🚀",
        members: [],
        createdBy: "u1",
        createdAt: new Date().toISOString(),
      },
    ];

    // Rerender the list with the new groups array
    // IMPORTANT: We must pass the SAME function references for onSelectTransaction and formatAmount
    // otherwise TransactionItem will re-render because those props changed.
    rerender(
      <TransactionList
        transactions={mockTransactions}
        groups={newGroups}
        onSelectTransaction={handleSelect}
        formatAmount={formatAmount}
      />
    );

    // Render count should still be 1 because:
    // 1. The transaction object hasn't changed.
    // 2. The groupName derived from groups.find(...) is "Group 1", which is the same string.
    // 3. MemoizedTransactionItem sees stable props (including the stable functions) and skips re-render.
    expect(mocks.MockItem).toHaveBeenCalledTimes(1);
  });

  it("should re-render TransactionItem when its specific group name changes", () => {
    // Clear previous calls
    mocks.MockItem.mockClear();

    const handleSelect = vi.fn();
    const formatAmount = (a: number) => `${a}`;

    const { rerender } = render(
      <TransactionList
        transactions={mockTransactions}
        groups={mockGroups}
        onSelectTransaction={handleSelect}
        formatAmount={formatAmount}
      />
    );

    expect(mocks.MockItem).toHaveBeenCalledTimes(1);

    // Change the name of Group 1
    const updatedGroups = [
      {
        ...mockGroups[0],
        name: "Group 1 Updated",
      },
    ];

    rerender(
      <TransactionList
        transactions={mockTransactions}
        groups={updatedGroups}
        onSelectTransaction={handleSelect}
        formatAmount={formatAmount}
      />
    );

    // Render count should increase to 2 because groupName prop changed
    expect(mocks.MockItem).toHaveBeenCalledTimes(2);
    expect(mocks.MockItem).toHaveBeenLastCalledWith(
      expect.objectContaining({ groupName: "Group 1 Updated" }),
      expect.anything()
    );
  });
});
