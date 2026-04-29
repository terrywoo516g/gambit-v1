#!/bin/bash
cd /home/ubuntu/gambit-v1

# Fix scenes/[sceneId]/generate/route.ts - remove the starred line at line 85
sed -i '85d' src/app/api/scenes/\[sceneId\]/generate/route.ts

# Fix chat/stream - remove unused catch variable e
sed -i 's/catch(e) {/catch {/g' src/app/api/workspaces/\[id\]/chat/stream/route.ts

# Fix observer - remove chatMessages line
sed -i '/const chatMessages/d' src/app/api/workspaces/\[id\]/observer/route.ts

# Fix stream/[runId] - remove unused catch variable e
sed -i 's/catch(e) {/catch {/g' src/app/api/workspaces/\[id\]/stream/\[runId\]/route.ts

echo "Done"