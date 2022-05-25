#!/bin/bash

DEPLOY_SERVER=$DEPLOY_SERVER

echo "Deploying to ${DEPLOY_SERVER}"
ssh flamenco@${DEPLOY_SERVER} 'bash' < ./deploy/server.sh