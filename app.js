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

	// サーバに保持しているデータを返す
	io.emit("s2c_start", {object_list: object_list});

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
			for(key in object_list){
				if(object_list[key].owner_id == id) delete object_list[key];
			}
			delete user_list[socket.id];
		}
	});

	// クライアントからの接続受信
	socket.on("c2s_start", function ( id ) {
		console.log("connect:" + id);
		object_list[id] = {type: "user", owner_id: id};
		user_list[socket.id] = id;
		console.log("connect_list");
		for(key in user_list) {
			var u_id = user_list[key];
			console.log("> " + key + " : " + object_list[u_id]["owner_id"]);
		}
	});

	// アップデート処理
	socket.on("c2s_update", function ( objects ) {
		var id = user_list[socket.id];
		for(key in objects){
			var object_id = objects[key].owner_id;
			console.log(objects[key]);
			if(object_list[object_id]){
				console.log("true");
				object_list[object_id].x = objects[key].position.x;
				object_list[object_id].y = objects[key].position.y;
				object_list[object_id].health = objects[key].health;
			}else{
				object_list[object_id].type = objects[key].type;
				object_list[object_id].owner_id = id;
			}
		}
		socket.broadcast.emit("s2c_update", {object_list: object_list});
	});
});

// このファイルがある部分をカレントディレクトリとして
// publicフォルダに入ってるものを参照する
app.use(express.static('public'));
