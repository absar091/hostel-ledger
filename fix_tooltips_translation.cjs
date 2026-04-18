const fs = require('fs');
const file = 'src/components/GroupChat.tsx';
let content = fs.readFileSync(file, 'utf8');

// The code review mentioned a missing `t` function or translation import.
// However, looking at lines 134, `const { t } = useTranslation();` is already present inside `GroupChat`.
// BUT, the `TooltipContent` is using `t()` directly. Wait, the `GroupChat` component has `const { t } = useTranslation();`.
// Let me verify if there's any usage of `t` outside of the component or if the issue was from my previous script.
