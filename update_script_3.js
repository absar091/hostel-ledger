import fs from 'fs';

const path = './src/components/AddExpenseSheet.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex = /<div className="text-sm text-white\/90 font-bold">\s*\{formatAmount\(splitDetails\.perPerson\)\} \{t\('sheets\.add_expense\.per_person'\)\}\s*<\/div>\s*\{splitDetails\.toReceive > 0 && \(\s*<div className="text-emerald-200 font-black mt-3 text-lg">\s*You will receive \{formatAmount\(splitDetails\.toReceive\)\}\s*<\/div>\s*\)\}\s*\{splitDetails\.toGive > 0 && \(\s*<div className="text-orange-200 font-black mt-3 text-lg">\s*You owe \{formatAmount\(splitDetails\.toGive\)\}\s*<\/div>\s*\)\}/;

const replacement = `<div className="text-sm text-white/90 font-bold">
                        {formatAmount(splitDetails.perPerson)} {t('sheets.add_expense.per_person')}
                      </div>

                      {splitDetails.isCurrentUserPayer ? (
                        <>
                          {splitDetails.toReceive > 0 && (
                            <div className="text-emerald-200 font-black mt-3 text-lg">
                              You will receive {formatAmount(splitDetails.toReceive)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-emerald-200 font-black mt-3 text-lg">
                            {paidByName} will receive {formatAmount(splitDetails.toReceive > 0 ? splitDetails.toReceive : splitDetails.perPerson * splitDetails.othersCount)}
                          </div>
                          {splitDetails.isCurrentUserParticipant ? (
                            <div className="text-orange-200 font-black mt-1 text-lg">
                              You owe {formatAmount(splitDetails.toGive)}
                            </div>
                          ) : (
                            <div className="text-white/70 font-bold mt-1 text-sm">
                              You are not a participant
                            </div>
                          )}
                        </>
                      )}`;

content = content.replace(regex, replacement);

fs.writeFileSync(path, content, 'utf8');
