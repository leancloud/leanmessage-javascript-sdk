if [ $# != 1 ] ; then
	echo "USAGE: $0 VERSION"
	echo " e.g.: $0 0.2.1"
	exit 1;
fi

echo "mkdir dist"
rm -rf dist/
mkdir dist
echo "compress lib/chat.js ..."
#curl -X POST -s --data-urlencode 'input@lib/av-chat.js' http://javascript-minifier.com/raw > dist/av-chat-mini.js
cp lib/av-*.js dist/
cd dist/
tar zcvf avos-javascript-chat-sdk-$1.tar.gz av-*.js
cd ..
echo "compress samples .."
mkdir -p dist/js-chat-sdk-samples
cp -rp lib dist/js-chat-sdk-samples && cp -rp demo dist/js-chat-sdk-samples
tar zcvf dist/js-chat-sdk-samples.tar.gz dist/js-chat-sdk-samples
echo 'done'

