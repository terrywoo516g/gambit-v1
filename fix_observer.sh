#!/bin/bash
cd /home/ubuntu/gambit-v1

# Fix observer route - remove the unused chatMessages line
sed -i '43d' src/app/api/workspaces/\[id\]/observer/route.ts

echo "Done"