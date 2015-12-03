// サーバ作成
var express = require('express'), http = require('http');
var app = express(), server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(8080)
console.log("starting server");

// ユーザ管理ハッシュ
var object_list = {};
var user_list = {};

// クライアント接続があると、以下の処理をさせる。
io.on('connection', function (socket) {
	// 接続通知をクライアントに送信
	socket.on("connected", function (id) {
		console.log("connect:" + id);
		object_list[id] = {type: "user", x: 0, y: 0, hp: 1, owner_id: id};
		user_list[socket.id] = id;
		console.log("connect_list")
		for(key in user_list) {
			var u_id = user_list[key];
			console.log("> " + key + " : " + object_list[u_id]["owner_id"]);
		}
		var msg = id + "が入室しました";
	    io.sockets.emit("MessageToClient", {value: msg});
	});

	// クライアントからの受信イベントを設定
	socket.on("MessageToServer", function (data) {
		io.emit("MessageToClient", {value:data.value});
		console.log("data:" + data.value);
	});

	// 接続切れイベントを設定
	socket.on("disconnect", function () {
		if (user_list[socket.id]) {
			var id = user_list[socket.id];
			var msg = object_list[id]["owner_id"] + "が退出しました";
			delete object_list[id];
			delete user_list[socket.id];
			io.emit("MessageToClient", {value: msg});
		}
	});

	// クライアントからの接続受信
	socket.on("c2s_start", function () {
		// サーバに保持しているデータを返す
		io.emit("s2c_start", {value: object_list});
	});

	// アップデート処理
	socket.on("c2s_update", function () {
		// 
		io.emit("s2c_update", {value: object_list});
	});
	
});

// このファイルがある部分をカレントディレクトリとして
// publicフォルダに入ってるものを参照する
app.use(express.static('public'));
