const fs = require('fs');

const path = 'src/components/AddExpenseSheet.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `                      {splitDetails.isCurrentUserPayer ? (
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
                      )}`,
  `                      {splitDetails.isCurrentUserPayer ? (
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
                      )}`
);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed');
