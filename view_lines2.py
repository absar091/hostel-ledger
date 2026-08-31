with open("src/components/CreateGroupSheet.tsx", "r") as f:
    lines = f.readlines()
    for i, line in enumerate(lines[530:600]):
        print(f"{i + 531}: {line.rstrip()}")
