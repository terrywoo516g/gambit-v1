const fs = require('fs');

// page.tsx
let page = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');
page = page.replace(/import \{.*?\} from 'lucide-react'/, match => match.replace(/'lucide-react'/, ", X } from 'lucide-react'"));
page = page.replace(/const \[recommendation, setRecommendation\] = useState<\{scene: string, reason: string\} \| null>\(null\)/, '');
page = page.replace(/setRecommendation\(data\)/, '');
page = page.replace(/recommendation\.reason/, 'data.reason');
page = page.replace(/recommendation\.scene/g, 'data.scene');
page = page.replace(/!recommendation/, '!showRecommendation');
page = page.replace(/recommendation\]\)/, 'showRecommendation])');
page = page.replace(/&& recommendation /, '');
fs.writeFileSync('src/app/workspace/[id]/page.tsx', page);

// ReviewScene.tsx
let review = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');
review = review.replace(/, referencedRunIds = \[\]/, '');
fs.writeFileSync('src/components/scenes/ReviewScene.tsx', review);

