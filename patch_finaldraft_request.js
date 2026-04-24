const fs = require('fs');
let code = fs.readFileSync('src/components/workspace/FinalDraftPanel.tsx', 'utf8');

const eventHandler = `
  useEffect(() => {
    const handleRequestDraft = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { callback } = customEvent.detail;
      if (callback && typeof callback === 'function') {
        callback(editor?.getText() || '');
      }
    };
    window.addEventListener('gambit:request-draft-text', handleRequestDraft);
    return () => window.removeEventListener('gambit:request-draft-text', handleRequestDraft);
  }, [editor]);
`;

const insertIndex = code.indexOf('// Handle Open Review Mode Event');
if (insertIndex !== -1) {
  code = code.substring(0, insertIndex) + eventHandler + '\n  ' + code.substring(insertIndex);
  fs.writeFileSync('src/components/workspace/FinalDraftPanel.tsx', code);
}
