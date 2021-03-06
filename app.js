// サーバ作成
var express = require('express'), http = require('http');
var app = express(), server = http.createServer(app);
var io = require('socket.io').listen(server);

server.listen(4649)
console.log("starting server");

// ユーザ管理ハッシュ
var object_list = {};
var user_list = {};

// クライアント接続があると、以下の処理をさせる。
io.sockets.on('connection', function (socket) {
	var user_num = Object.keys(user_list).length+1;
	console.log("接続数：" + user_num);

	// クライアントからの接続受信
	socket.on("c2s_Start", function ( id ) {
		console.log("connect:" + id);
		user_list[socket.id] = id;
		console.log("connect_list");
		for(key in user_list) {
			var u_id = user_list[key];
			console.log("> " + key + " : " + object_list[u_id]["owner_id"]);
		}
		// サーバに保持しているデータを返す
		socket.emit("s2c_Update", {object_list: object_list});
	});

	// 受信した情報でオブジェクトをサーバへ追加
	socket.on("c2s_AddObject", function ( object ) {
		var id = user_list[socket.id];
		console.log("Add: ");
		console.log(object);
		object_list[object.id] = { id: object.id, type: object.type,
								   date: object.date, owner_id: object.owner_id,
								   x: object.x, y: object.y,
								   rotation: object.rotation,
								   health: object.health || 1
								 };
		io.sockets.emit("s2c_Update", {object_list: object_list});
	});

	// 受信した情報でオブジェクトをサーバから削除
	socket.on("c2s_RemoveObject", function ( object ) {
		if( object && object_list[object.id] ){
			console.log("Delete: ");
			console.log(object);
			delete object_list[object.id];
			io.sockets.emit("s2c_RemoveObject", object);
		}
	});

	// 更新処理 ... 座標, 向きを更新
	socket.on("c2s_Update", function ( objects ) {
		for(key in objects){
			if(object_list[key]){
				object_list[key].x = objects[key].x;
				object_list[key].y = objects[key].y;
				object_list[key].rotation = objects[key].rotation;
			}
		}
		socket.broadcast.emit("s2c_Update", {object_list: object_list});
	});
	
	// 接続切れイベントを設定
	socket.on("disconnect", function () {
		if (user_list[socket.id]) {
			var id = user_list[socket.id];
			console.log("Disconnect: ");
			console.log(object_list[id]); 
			socket.broadcast.emit("s2c_RemoveObject", object_list[id]);
			delete object_list[id];
			for(key in object_list){
				if(object_list[key].owner_id == id){
					socket.broadcast.emit("s2c_RemoveObject", object_list[key]);
					delete object_list[key];
				}
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
