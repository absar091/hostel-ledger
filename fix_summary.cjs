const fs = require('fs');

const path = 'src/components/AddExpenseSheet.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `                      {splitDetails.isCurrentUserPayer ? (
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

const replacement = `                      {splitDetails.isCurrentUserPayer ? (
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
                          {splitDetails.toGive > 0 && (
                            <div className="text-orange-200 font-black mt-1 text-lg">
                              You owe {formatAmount(splitDetails.toGive)}
                            </div>
                          )}
                          {!splitDetails.isCurrentUserParticipant && (
                            <div className="text-white/70 font-bold mt-1 text-sm">
                              You are not a participant
                            </div>
                          )}
                        </>
                      )}`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed Summary Section');
