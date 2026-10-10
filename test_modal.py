import re

with open("src/components/TransactionDetailModal.tsx", "r") as f:
    content = f.read()

# Make sure Tooltip is correct
if 'import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";' in content:
    print("Tooltip imported correctly.")
else:
    print("Tooltip NOT imported correctly.")
