// サーバ作成
var express = require('express'), http = require('http');
var app = express(), server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(8080);
console.log("starting server");

// ユーザ管理ハッシュ
var objectList = {};
var userList = {};

// クライアント接続があると、以下の処理をさせる。
io.on('connection', function (socket) {
	var user_num = Object.keys(userList).length+1;
	console.log("接続数：" + user_num);
	
	// サーバに保持しているデータを返す
	socket.emit("S2C_Start", {objectList: objectList});

	// クライアントからの接続受信
	socket.on("C2S_Start", function ( id ) {
		console.log("connect:" + id);
		userList[socket.id] = id;
	});

	// アップデート処理
	socket.on("C2S_Update", function ( data ) {
		var id = userList[socket.id];
		data.ownerId = id;
		objectList[data.id] = data;
		console.log(data);
		socket.broadcast.emit("S2C_Update", data);
	});

	// アップデート処理
	socket.on("C2S_Delete", function ( id ) {
		if( objectList[id] ){
			socket.broadcast.emit("S2C_Delete", id);
		}
		delete objectList[id];
	});
	
	// 接続切れイベントを設定
	socket.on("disconnect", function () {
		if (userList[socket.id]) {
			var id = userList[socket.id];
			delete objectList[id];
			for(key in objectList){
				if(objectList[key].ownerId == id){
					console.log("delete object: " + key);
					socket.broadcast.emit("S2C_Delete", key);
					delete objectList[key];
				}
			}
			delete userList[socket.id];
		}
		console.log("disconnect: " + socket.id);
	});
});

// このファイルがある部分をカレントディレクトリとして
// publicフォルダに入ってるものを参照する
app.use(express.static('public'));
