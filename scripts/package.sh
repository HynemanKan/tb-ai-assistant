VERSION=$(node -p "require('./package.json').version")

npm run build

cd dist
zip -r "../tb-ai-assistant-${VERSION}.zip" .
mv "../tb-ai-assistant-${VERSION}.zip" "../tb-ai-assistant-${VERSION}.xpi"
