window.onload = function() {
// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	// var url = "http://192.168.8.89:8080";
	var url = "http://" + window.location.hostname + ":8080";
	// 接続
	var socket = io.connect(url);
	var player_id = "User" + Math.floor(Math.random()*10000);;
	var object_list;
	
	function SocketInit(){
		// サーバからデータを受け取る
		socket.on("S2C_Start", function (data){
			object_list = data.object_list;
			// 
			for(key in objects){
				if(object_list[key]) console.log(objects[key]);
			}
		});

		// サーバからデータを受け取り更新
		socket.on("S2C_Update", function (data) {
			object_list = data.object_list;
		});

		function Start(id) {
			socket.emit("C2S_Start", id);
		}
		Start(player_id);
	}

// === ゲームに関する処理 ===
	var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: Preload, create: Create, update: Update });
	
// 素材読み込み
	function Preload () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
		game.load.image('bullet', 'asset/bullet.png');
	}

	var player, objects = {}, energy_bar, hp_bar;
	var ANGLE = 200;
	var BOOST_POWER = 5000;	
	var USE_ENERGY = 20;

	function CreateRocket ( x, y, image_name ){
		var rocket = {};
		// スプライト設定
		rocket = game.add.sprite(x, y, image_name);
		// 物理演算
		game.physics.p2.enable(rocket);
		// 画像サイズ
		rocket.scale.setTo(0.3, 0.3);
		// 中心
		rocket.anchor.setTo(0.5, 0.5);
		// あたり判定
		rocket.body.setRectangle(20, 80);
		return rocket;
	}

	function CreateBullet ( x, y, rotate ){
		var bullet = {};
		// スプライト設定
		bullet = game.add.sprite(x, y - 70, 'bullet');
		// 物理演算
		game.physics.p2.enable(bullet);
		// 画像サイズ
		bullet.scale.setTo(0.25, 0.25);
		// 中心
		bullet.anchor.setTo(0.5, 0.5);
		// あたり判定
		bullet.body.setRectangle(10, 20);
		// 向き
		bullet.body.rotation = rotate;
		// 発射
		bullet.body.thrust(15000);
		return bullet;
	}
	
    function Create () {
		game.stage.disableVisibilityChange = true;
		// 物理計算方式
		game.physics.startSystem(Phaser.Physics.P2JS);
		
		// キーボードのインプットを登録
		keys = game.input.keyboard.createCursorKeys();
		// playerの設定
		player = CreateRocket( Math.floor(Math.random()*800+20), Math.floor(Math.random()*600+20), 'player' );
		// プレイヤーの移動処理
		keys.up.onDown.add(PlayerMove, this);
		// プレイヤーの回復処理
		game.time.events.loop(Phaser.Timer.QUARTER, PlayerRecovery, this);
		// あたり判定 ( 円 )
		// player.body.setCircle(25);
		
		// 最大HP
		console.log(player.maxHealth);
		// HPの回復
		player.heal(50);
		// 現在のHP
		console.log(player.health);
		
		// HPゲージ
		var hp_bar_bg = game.add.graphics(50, 30);
		hp_bar_bg.lineStyle(16, 0xff0000, 0.8);
		hp_bar_bg.lineTo(player.maxHealth, 0);
		hp_bar = game.add.graphics(50, 30);

		// power 最大値
		player.maxEnergy = 100;
		// power 初期値
		player.energy = 100;
		
		// powerゲージ
		var energy_bar_bg = game.add.graphics(80, 52.5);
		energy_bar_bg.lineStyle(16, 0xff0000, 0.8);
		energy_bar_bg.lineTo(player.maxEnergy, 0);
		energy_bar = game.add.graphics(80, 52.5);
		
		// ユーザID
		player.id = player_id;
		player.type = "user";
		console.log(player.id);
		console.log(Object.keys(player));

		// スペースキー
		space_button = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(BulletFire, this);
		console.log(space_button);
		
		// テキスト
		text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });
		SocketInit();
	}

	// ほかのユーザなどを作成
	function CreateObject( data ){
		var id = data.owner_id;
		switch (data.type){
		case "user": 
			// スプライトを生成
			objects[id] = CreateRocket(data.x, data.y, 'enemy');
			objects[id].id = id;
			console.log(objects[id]);
			break;
		default:
			break;
		}
	}

	// プレイヤーメソッド
	function PlayerMove(){
		if (player.energy - USE_ENERGY >= 0 ){
			player.energy -= USE_ENERGY;
			player.body.thrust(BOOST_POWER);
		}
	}

	function PlayerRecovery(){
	    // Energyの回復
		if(player.energy < player.maxEnergy){
			player.energy++;
		}
		if(player.health < player.maxHealth){
			player.health += 0.2;
		}
    }

	function BulletFire(){
		console.log("BulletFire");
		CreateBullet(player.position.x, player.position.y, player.rotation);
	}
	
	function Update() {
		
		player.body.angularVelocity = 0;
		energy_bar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(player.energy, 0);
		hp_bar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(player.health, 0);

		if (keys.left.isDown){
			player.body.rotateLeft(100);
		}else if (keys.right.isDown){
			player.body.rotateRight(100);
		}
		player.body.angularAcceleration = 0;

		// 更新処理
		var local_objects = {};
		local_objects[player_id] = {type: player.type, position: player.position, rotation: player.rotation, health: player.health, owner_id: player_id};
		socket.emit("C2S_Update", local_objects);
		for(key in object_list){
			// 無かったら作成、あったら更新
			if(key != player_id){
				// 既存にあるものは弾く
				if(jQuery.isEmptyObject(objects[key])){
					CreateObject(object_list[key]);
				}else{
					objects[key].body.x = object_list[key].x;
					objects[key].body.y = object_list[key].y;
					objects[key].body.rotation = object_list[key].rotation;
				}
			}
		}
		// サーバに存在しないものを削除
		for(key in objects){
			if(!(object_list[key])) objects[key].kill();
		}
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};

