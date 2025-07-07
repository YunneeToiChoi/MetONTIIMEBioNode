#!/bin/bash
cd /home/vannang/Documents/BioB/my-metontiime-app
export NVM_DIR="$HOME/.var/app/com.visualstudio.code/config/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node server.js
