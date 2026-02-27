import re

file_path = 'src/components/AddExpenseSheet.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# 1. Update Imports
if 'Tabs,' not in content:
    content = content.replace(
        'import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";',
        'import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";\nimport { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";'
    )

# 2. Update Props Interface
# onSubmit needs to accept payers
content = content.replace(
    'onSubmit: (data: {\n    groupId: string;\n    amount: number;\n    paidBy: string;\n    participants: string[];\n    note: string;\n    place: string;\n  }) => void;',
    'onSubmit: (data: {\n    groupId: string;\n    amount: number;\n    paidBy: string;\n    payers?: { id: string; amount: number }[];\n    participants: string[];\n    note: string;\n    place: string;\n  }) => void;'
)

# 3. Add State Variables
# Find [selectedCategory, setSelectedCategory] and add new states after it
state_pattern = r'const \[selectedCategory, setSelectedCategory\] = useState<string>\(\'others\'\);'
new_states = """const [selectedCategory, setSelectedCategory] = useState<string>('others');
  const [payerMode, setPayerMode] = useState<'single' | 'multiple'>('single');
  const [multiPayers, setMultiPayers] = useState<{ id: string; amount: string }[]>([]);"""

content = re.sub(state_pattern, new_states, content)

# 4. Update Reset Logic
# Inside useEffect for open
reset_pattern = r'setSelectedCategory\(\'others\'\);'
new_reset = """setSelectedCategory('others');
      setPayerMode('single');
      setMultiPayers([]);"""
content = re.sub(reset_pattern, new_reset, content)

# 5. Add Helper Functions
# Add handlePayerChange before handleSubmit
helper_funcs = """
  const handlePayerAmountChange = (memberId: string, value: string) => {
    setMultiPayers(prev => {
      const existing = prev.find(p => p.id === memberId);
      if (!existing && !value) return prev; // Don't add empty entries

      const newList = prev.filter(p => p.id !== memberId);
      if (value) {
        newList.push({ id: memberId, amount: value });
      }
      return newList;
    });
  };

  const totalPaidAmount = useMemo(() => {
    return multiPayers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  }, [multiPayers]);

  const remainingToPay = useMemo(() => {
    const total = parseFloat(amount) || 0;
    return total - totalPaidAmount;
  }, [amount, totalPaidAmount]);
"""

# Insert before handleSubmit
content = content.replace('// Handle expense submission', helper_funcs + '\n  // Handle expense submission')

# 6. Update handleSubmit
# Construct payers array
submit_logic_start = 'const handleSubmit = async () => {'
submit_logic_new = """const handleSubmit = async () => {
    const totalAmount = parseFloat(amount);

    // Validate Multiple Payers
    if (payerMode === 'multiple') {
      if (Math.abs(remainingToPay) > 0.05) {
        toast.error(`Total paid (${formatAmount(totalPaidAmount)}) must match expense amount (${formatAmount(totalAmount)})`);
        return;
      }
      if (multiPayers.length === 0) {
        toast.error("Please add at least one payer");
        return;
      }
    }"""

content = content.replace(submit_logic_start, submit_logic_new)

# Update onSubmit call payload
# Need to pass payers
# Find the object passed to onSubmit and saveOfflineExpense
# Note: This is complex with regex. I'll replace the entire `handleSubmit` block or specific lines.
# Actually, I can rely on `paidBy` being primary payer for backward compat.

# Let's find: `paidBy,` inside `handleSubmit` and inject logic.
# Wait, I need to define `finalPaidBy` and `finalPayers`.

content = content.replace(
    'const handleSubmit = async () => {',
    """const handleSubmit = async () => {
    const totalAmount = parseFloat(amount);

    let finalPayers: { id: string; amount: number }[] | undefined;
    let finalPaidBy = paidBy;

    if (payerMode === 'multiple') {
      if (Math.abs(remainingToPay) > 0.05) {
        toast.error(`Total paid (${formatAmount(totalPaidAmount)}) must match expense amount (${formatAmount(totalAmount)})`);
        return;
      }
      if (multiPayers.length === 0) {
        toast.error("Please add at least one payer");
        return;
      }
      finalPayers = multiPayers.map(p => ({ id: p.id, amount: parseFloat(p.amount) }));
      // Set primary payer (largest amount) for legacy support
      const primary = finalPayers.reduce((prev, current) => (prev.amount > current.amount) ? prev : current);
      finalPaidBy = primary.id;
    } else {
      // Single mode
      // finalPayers remains undefined (or we could set it for consistency, but backend handles it)
    }
"""
)

# Replace usage of `paidBy` with `finalPaidBy` and add `payers: finalPayers`
content = content.replace(
    'paidBy,',
    'paidBy: finalPaidBy,\n        payers: finalPayers,'
)

# 7. Update canProceed logic
# step === 3 check
can_proceed_pattern = r'if \(step === 3\) return paidBy !== "";'
can_proceed_new = """if (step === 3) {
      if (payerMode === 'single') return paidBy !== "";
      // For multiple, check if amounts match
      const total = parseFloat(amount) || 0;
      const currentPaid = multiPayers.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      return Math.abs(total - currentPaid) < 0.05 && multiPayers.length > 0;
    }"""
content = re.sub(can_proceed_pattern, can_proceed_new, content)

# 8. Update Step 3 UI
# This is the hardest part. Replacing the content of step 3 div.
# Start: {/* Step 3: Who Paid - Compact Mobile Style */}
# End: {/* Step 4: Split Between

step3_start = "{/* Step 3: Who Paid - Compact Mobile Style */}"
step3_end = "{/* Step 4: Split Between"

step3_implementation = """{/* Step 3: Who Paid - Compact Mobile Style */}
            {step === 3 && (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center gap-2 justify-center mb-4">
                  <p className="text-sm text-[#4a6850] font-bold text-center">{t('sheets.add_expense.who_paid_prompt')}</p>
                  <Tooltip
                    content={t('sheets.add_expense.who_paid_prompt')}
                    position="bottom"
                  />
                </div>

                {/* Mode Toggle */}
                <div className="bg-gray-100 p-1 rounded-xl flex mb-4">
                  <button
                    className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", payerMode === 'single' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setPayerMode('single')}
                  >
                    Single Payer
                  </button>
                  <button
                    className={cn("flex-1 py-2 rounded-lg text-sm font-bold transition-all", payerMode === 'multiple' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
                    onClick={() => setPayerMode('multiple')}
                  >
                    Multiple Payers
                  </button>
                </div>

                {isLoadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-fade-in">
                    <div className="w-8 h-8 border-4 border-[#4a6850]/20 border-t-[#4a6850] rounded-full animate-spin"></div>
                    <p className="text-sm text-[#4a6850]/70 font-bold">{t('common.loading')}</p>
                  </div>
                ) : (
                  <>
                    {/* SINGLE PAYER MODE */}
                    {payerMode === 'single' && members.filter(m => !m.isTemporary).map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setPaidBy(member.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95",
                          paidBy === member.id
                            ? "bg-gradient-to-r from-[#4a6850]/10 to-[#3d5643]/10 border-2 border-[#4a6850]"
                            : "bg-white border-2 border-gray-200 hover:border-[#4a6850]/30 hover:bg-[#4a6850]/5"
                        )}
                      >
                        <Avatar name={member.name} size="sm" />
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 tracking-tight block truncate">{member.name}</span>
                            {(member.id === fullGroupData?.createdBy || (member as any).userId === fullGroupData?.createdBy) && (
                              <span className="px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 border border-yellow-200 text-[10px] font-black uppercase tracking-wider">{t('sheets.add_expense.owner')}</span>
                            )}
                          </div>
                        </div>
                        {paidBy === member.id && (
                          <div className="w-6 h-6 rounded-full bg-[#4a6850] flex items-center justify-center shadow-md flex-shrink-0">
                            <Check className="w-3.5 h-3.5 text-white font-bold" />
                          </div>
                        )}
                      </button>
                    ))}

                    {/* MULTIPLE PAYER MODE */}
                    {payerMode === 'multiple' && (
                      <div className="space-y-3">
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-2 flex justify-between items-center">
                           <span className="text-xs font-bold text-orange-800">Total to allocate:</span>
                           <span className="text-sm font-black text-orange-900">{formatAmount(parseFloat(amount) || 0)}</span>
                        </div>

                        {members.map((member) => {
                           const payerEntry = multiPayers.find(p => p.id === member.id);
                           const isPaying = !!payerEntry;

                           return (
                             <div key={member.id} className={cn(
                               "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                               isPaying ? "border-[#4a6850] bg-[#4a6850]/5" : "border-gray-100 bg-white"
                             )}>
                                <Avatar name={member.name} size="sm" />
                                <div className="flex-1 min-w-0">
                                   <div className="font-bold text-sm text-gray-900 truncate">{member.name}</div>
                                </div>
                                <div className="relative w-28">
                                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">{selectedGroupData?.currency || ''}</span>
                                   <Input
                                      type="number"
                                      placeholder="0"
                                      className={cn(
                                        "w-full h-10 pl-6 text-right font-bold rounded-xl border-gray-200 focus:border-[#4a6850]",
                                        isPaying ? "text-[#4a6850]" : "text-gray-400"
                                      )}
                                      value={payerEntry?.amount || ''}
                                      onChange={(e) => handlePayerAmountChange(member.id, e.target.value)}
                                   />
                                </div>
                             </div>
                           );
                        })}

                        {/* Remaining Indicator */}
                        <div className={cn(
                          "fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-xl border backdrop-blur-md transition-all z-50 flex items-center gap-2",
                          Math.abs(remainingToPay) < 0.05
                            ? "bg-emerald-500/90 border-emerald-400 text-white"
                            : "bg-gray-900/90 border-gray-700 text-white"
                        )}>
                           {Math.abs(remainingToPay) < 0.05 ? (
                             <>
                               <Check className="w-4 h-4 font-bold" />
                               <span className="font-black text-sm">Perfectly allocated!</span>
                             </>
                           ) : (
                             <>
                               <span className="text-xs font-bold opacity-80">{remainingToPay > 0 ? "Remaining:" : "Overpaid:"}</span>
                               <span className={cn("font-black text-lg tabular-nums", remainingToPay < 0 ? "text-red-300" : "text-white")}>
                                 {formatAmount(Math.abs(remainingToPay))}
                               </span>
                             </>
                           )}
                        </div>
                        {/* Spacer for fixed indicator */}
                        <div className="h-12"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
"""

# Use regex to find and replace the block
# We escape special chars in pattern, but step3_implementation contains replacements
pattern_step3 = re.escape(step3_start) + r".*?" + re.escape(step3_end)
# Wait, re.escape will escape {} which are used in regex for quantification sometimes, but mostly safe.
# However, React code has lots of {} which might confuse regex if not careful.
# Instead of regex dotall, let's use string split/join if exact match.
# But exact match is hard if indentation differs.

# Let's try finding start index and end index
start_idx = content.find(step3_start)
end_idx = content.find(step3_end)

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + step3_implementation + "\n\n            " + content[end_idx:]
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully replaced Step 3 UI.")
else:
    print("Could not find Step 3 block markers.")
    exit(1)
