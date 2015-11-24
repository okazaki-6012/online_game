// サーバ作成
var express = require('express'), http = require('http');
var app = express(), server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(8080)
console.log("starting server");

// ユーザ管理ハッシュ
var userHash = {};

// クライアント接続があると、以下の処理をさせる。
io.on('connection', function (socket) {
	// 接続通知をクライアントに送信	
	socket.on("connected", function (name) {
		console.log("connect:" + name);
		console.log("connect_list")
		for(key in userHash) {
			console.log( key + " : " + userHash[key]);
		}
		userHash[socket.id] = name;
		var msg = name + "が入室しました";
	    io.sockets.emit("MessageToClient", {value: msg});
	});

	// クライアントからの受信イベントを設定
	socket.on("MessageToServer", function (data) {
		io.emit("MessageToClient", {value:data.value});
		console.log("data:" + data.value);
	});

	// 接続切れイベントを設定
	socket.on("disconnect", function () {
		if (userHash[socket.id]) {
			var msg = userHash[socket.id] + "が退出しました";
			delete userHash[socket.id];
			io.emit("MessageToClient", {value: msg});
		}
	});
});

// このファイルがある部分をカレントディレクトリとして
// publicフォルダに入ってるものを参照する
app.use(express.static('public'));
