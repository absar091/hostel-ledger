with open("src/components/CreateGroupSheet.tsx", "r") as f:
    lines = f.readlines()
    for i, line in enumerate(lines[428:492]):
        print(f"{i + 429}: {line.rstrip()}")
