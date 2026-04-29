#!/bin/bash
cd /home/ubuntu/gambit-v1

# Fix generate route - remove starred line
sed -i '/const starred = selections.starred/d' src/app/api/scenes/\[sceneId\]/generate/route.ts

# Fix chat/stream route - use _ prefix for err
sed -i 's/catch (_err)/catch(e)/g' src/app/api/workspaces/\[id\]/chat/stream/route.ts

# Fix observer route - remove chatMessages line
sed -i '/const chatMessages/d' src/app/api/workspaces/\[id\]/observer/route.ts

# Fix stream/[runId] route - use _ prefix for err
sed -i 's/catch (_err)/catch(e)/g' src/app/api/workspaces/\[id\]/stream/\[runId\]/route.ts

echo "Done"