import re

with open("src/components/GroupSettingsSheet.tsx", "r") as f:
    content = f.read()

# Fix search button
search_block = """                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSearch}
                        disabled={isSearching || !newMemberName.trim()}
                        className="absolute right-1 top-1 h-9 w-9 text-[#4a6850] hover:bg-[#4a6850]/10 rounded-lg"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </Button>"""

replace_block = """                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSearch}
                        disabled={isSearching || !newMemberName.trim()}
                        className="absolute right-1 top-1 h-9 w-9 text-[#4a6850] hover:bg-[#4a6850]/10 rounded-lg"
                        aria-label="Search for member"
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Search className="w-4 h-4" aria-hidden="true" />
                        )}
                      </Button>"""

content = content.replace(search_block, replace_block)


# Fix close add member button
search_block2 = """                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowAddMember(false);
                        setNewMemberName("");
                        setSearchResult(null);
                        setSearchError(false);
                      }}
                      className="w-11 h-11 text-[#4a6850]/60 hover:bg-[#4a6850]/10 rounded-xl bg-white border border-[#4a6850]/10 shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </Button>"""

replace_block2 = """                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setShowAddMember(false);
                        setNewMemberName("");
                        setSearchResult(null);
                        setSearchError(false);
                      }}
                      className="w-11 h-11 text-[#4a6850]/60 hover:bg-[#4a6850]/10 rounded-xl bg-white border border-[#4a6850]/10 shadow-sm"
                      aria-label="Cancel adding member"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </Button>"""

content = content.replace(search_block2, replace_block2)


with open("src/components/GroupSettingsSheet.tsx", "w") as f:
    f.write(content)

print("Updated GroupSettingsSheet.tsx")
