const fs = require('fs');

let page = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');
page = page.replace(/const \[showRecommendation, setShowRecommendation\] = useState\(false\)/, `const [recommendation, setRecommendation] = useState<{scene: string, reason: string} | null>(null)\n  const [showRecommendation, setShowRecommendation] = useState(false)`);
page = page.replace(/data\.reason/g, 'recommendation.reason');
page = page.replace(/data\.scene/g, 'recommendation.scene');
page = page.replace(/!showRecommendation/, '!recommendation');
page = page.replace(/showRecommendation\]\)/, 'recommendation])');
page = page.replace(/\{showRecommendation && \(/, '{showRecommendation && recommendation && (');
page = page.replace(/setRecommendation\(data\)/, '');
page = page.replace(/setShowRecommendation\(true\)/, 'setRecommendation(data); setShowRecommendation(true)');
fs.writeFileSync('src/app/workspace/[id]/page.tsx', page);
