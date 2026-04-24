const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

// 1. Change State Type
code = code.replace(/const \[observerObservations, setObserverObservations\] = useState<Observation\[\]>\(\[\]\)/, "const [observerObservations, setObserverObservations] = useState<string[]>([])");

// 2. Change API Parsing
code = code.replace(/setObserverObservations\(data\.observations\)/, "setObserverObservations(data.text ? data.text.split('\\n').filter((p: string) => p.trim()) : [])");

// 3. Change Rendering
const oldRender = `{observerObservations.map(obs => {
                        let colorClass = 'bg-gray-100 text-gray-700 border-gray-200'
                        if (obs.type === '盲点') colorClass = 'bg-purple-50 text-purple-700 border-purple-200'
                        else if (obs.type === '偏差') colorClass = 'bg-orange-50 text-orange-700 border-orange-200'
                        else if (obs.type === '矛盾') colorClass = 'bg-red-50 text-red-700 border-red-200'
                        else if (obs.type === '提醒') colorClass = 'bg-blue-50 text-blue-700 border-blue-200'

                        return (
                          <div key={obs.id} className="border rounded-xl p-3 text-sm flex flex-col gap-2">
                            <div className="flex items-center">
                              <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 \${colorClass}\`}>
                                <Target className="w-3 h-3" /> {obs.type}
                              </span>
                            </div>
                            <div className="text-ink/80 leading-relaxed">
                              {obs.content}
                            </div>
                          </div>
                        )
                      })}`;

const newRender = `{observerObservations.map((obs, i) => (
                        <div key={i}>
                          <div className="text-sm text-ink/80 leading-relaxed py-1">
                            {obs}
                          </div>
                          {i < observerObservations.length - 1 && <div className="h-px bg-gray-100 my-2" />}
                        </div>
                      ))}`;

code = code.replace(oldRender, newRender);

// 4. Change Copy Logic
code = code.replace(/const text = observerObservations.map\(o => \`\[\$\{o\.type\}\] \$\{o\.content\}\`\)\.join\('\\n\\n'\)/, "const text = observerObservations.join('\\n\\n')");

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
