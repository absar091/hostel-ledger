import fs from 'fs';

const path = './src/components/AddExpenseSheet.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /\{\/\* Split Summary - Compact - Only show when 2\+ participants \*\/\}[\s\S]*?\{\/\* Step 5: Add Details - iPhone Style \*\/\}/;

const replacement = `\{/* Split Summary - Compact - Only show when 2+ participants */\}
                {participants.length > 1 && paidBy && (
                  <div className="bg-gradient-to-r from-[#4a6850]/5 to-[#3d5643]/5 rounded-2xl p-4 mt-4 border border-[#4a6850]/20 shadow-md">
                    <div className="text-xs text-[#4a6850] mb-2 font-black uppercase tracking-wide">{t('sheets.add_expense.split_summary')}</div>
                    <div className="text-lg font-black text-gray-900 tracking-tight">
                      {formatAmount(splitDetails.perPerson)} {t('sheets.add_expense.per_person')}
                    </div>

                    {splitDetails.isCurrentUserPayer ? (
                      <>
                        {splitDetails.toReceive > 0 && (
                          <div className="text-[#4a6850] font-black mt-2 text-sm">
                            {t('sheets.add_expense.you_will_receive', { amount: formatAmount(splitDetails.toReceive), count: splitDetails.othersCount, people: splitDetails.othersCount === 1 ? t('sheets.add_expense.person') : t('sheets.add_expense.people') })}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Someone else paid */}
                        <div className="text-[#4a6850] font-black mt-2 text-sm">
                          {paidByName} will receive {formatAmount(splitDetails.toReceive > 0 ? splitDetails.toReceive : splitDetails.perPerson * splitDetails.othersCount)} from {splitDetails.othersCount} {splitDetails.othersCount === 1 ? t('sheets.add_expense.person') : t('sheets.add_expense.people')}
                        </div>
                        {splitDetails.isCurrentUserParticipant ? (
                          <div className="text-red-600 font-black mt-2 text-sm">
                            {t('sheets.add_expense.you_owe', { amount: formatAmount(splitDetails.toGive), name: paidByName })}
                          </div>
                        ) : (
                          <div className="text-gray-500 font-bold mt-2 text-sm">
                            You are not a participant
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Add Details - iPhone Style */}`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content, 'utf8');
