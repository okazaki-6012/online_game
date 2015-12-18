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
	var user_num = Object.keys(user_list).length+1;
	console.log("接続数：" + user_num);
	// サーバに保持しているデータを返す
	io.emit("s2c_Update", {object_list: object_list});

	// クライアントからの接続受信
	socket.on("c2s_Start", function ( id ) {
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
	socket.on("c2s_Update", function ( objects ) {
		var id = user_list[socket.id];
		for(key in objects){
			if(!object_list[key]){
				console.log(key);
				object_list[key] = {type: objects[key].type, owner_id: id};
			}else{
				object_list[key].x = objects[key].x;
				object_list[key].y = objects[key].y;
				object_list[key].rotation = objects[key].rotation;
				object_list[key].health = objects[key].health || 1;
			}
		}
		socket.broadcast.emit("s2c_Update", {object_list: object_list});
	});

	// 接続切れイベントを設定
	socket.on("disconnect", function () {
		if (user_list[socket.id]) {
			var id = user_list[socket.id];
			delete object_list[id];
			for(key in object_list){
				if(object_list[key].owner_id == id) delete object_list[key];
			}
			console.log("Delete：" + user_list[socket.id]);
			delete user_list[socket.id];
		}
		console.log("disconnect");
	});
});

// このファイルがある部分をカレントディレクトリとして
// publicフォルダに入ってるものを参照する
app.use(express.static('public'));
