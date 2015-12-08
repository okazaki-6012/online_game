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
	// クライアントからの受信イベントを設定
	socket.on("MessageToServer", function (data) {
		io.emit("MessageToClient", {value:data.value});
		console.log("data:" + data.value);
	});

	// 接続切れイベントを設定
	socket.on("disconnect", function () {
		if (user_list[socket.id]) {
			var id = user_list[socket.id];
			delete object_list[id];
			delete user_list[socket.id];
		}
	});

	// クライアントからの接続受信
	socket.on("c2s_start", function ( id ) {
		// サーバに保持しているデータを返す
		io.emit("s2c_start", {object_list: object_list});
		console.log("connect:" + id);
		object_list[id] = {type: "user", x: 0, y: 0, health: 1, owner_id: id};
		user_list[socket.id] = id;
		console.log("connect_list");
		for(key in user_list) {
			var u_id = user_list[key];
			console.log("> " + key + " : " + object_list[u_id]["owner_id"]);
		}
	});

	// アップデート処理
	socket.on("c2s_update", function ( player ) {
		var id = user_list[socket.id];
		object_list[id].x = player.position.x;
		object_list[id].y = player.position.y;
		object_list[id].health = player.health;
		io.emit("s2c_update", {object_list: object_list});
	});
	
});

// このファイルがある部分をカレントディレクトリとして
// publicフォルダに入ってるものを参照する
app.use(express.static('public'));
