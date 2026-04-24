const fs = require('fs');
let code = fs.readFileSync('src/components/workspace/FinalDraftPanel.tsx', 'utf8');

const eventHandler = `
  useEffect(() => {
    const handleStreamToDraft = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { promptText } = customEvent.detail;
      if (!promptText) return;

      if (!editor) return;
      setDraftMode('result');
      setComposing(true);
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(\`/api/workspaces/\${workspaceId}/final-draft/generate-stream\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText }),
          signal: abortControllerRef.current.signal
        });

        if (!res.ok) throw new Error('Stream failed');
        if (!res.body) throw new Error('No body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        editor.commands.clearContent();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6);
            if (!dataStr.trim()) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'delta') {
                fullText += data.text;
                editor.commands.clearContent();
                editor.commands.insertContent(fullText.replace(/\\n/g, '<br/>'));
              } else if (data.type === 'done') {
                setDraftContent(fullText.replace(/\\n/g, '<br/>'));
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          alert('生成失败');
        }
      } finally {
        setComposing(false);
        abortControllerRef.current = null;
      }
    };
    window.addEventListener('gambit:stream-to-draft', handleStreamToDraft);
    return () => window.removeEventListener('gambit:stream-to-draft', handleStreamToDraft);
  }, [workspaceId, editor]);
`;

const insertIndex = code.indexOf('// Handle Pin Event');
if (insertIndex !== -1) {
  code = code.substring(0, insertIndex) + eventHandler + '\n  ' + code.substring(insertIndex);
  fs.writeFileSync('src/components/workspace/FinalDraftPanel.tsx', code);
}
