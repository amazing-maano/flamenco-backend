# Pull code
cd /home/flamenco/flamenco-backend
git checkout nightly
git stash
git pull origin nightly
git stash apply
# Build and deploy
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm install 16
npm install
npm install -g pm2
pm2 stop all 
pm2 start index.js