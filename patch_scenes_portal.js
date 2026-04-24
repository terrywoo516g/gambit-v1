const fs = require('fs');

// ComposeScene.tsx
let compose = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');
compose = compose.replace(
  /<div className="flex flex-col h-full bg-gray-50\/30 w-full">/,
  '<div className="absolute inset-0 z-50 flex flex-col h-full bg-white w-full">'
);
fs.writeFileSync('src/components/scenes/ComposeScene.tsx', compose);

// ReviewScene.tsx
let review = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');
review = review.replace(
  /<div className="w-full flex flex-col h-full bg-gray-50\/30">/,
  '<div className="absolute inset-0 z-50 w-full flex flex-col h-full bg-white">'
);
fs.writeFileSync('src/components/scenes/ReviewScene.tsx', review);
