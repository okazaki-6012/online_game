window.onload = function() {
// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	// var url = "http://192.168.8.89:8080";
	var url = "http://" + window.location.hostname + ":8080";
	// 接続
	var socket = io.connect(url);
	var player_id = "User" + Math.floor(Math.random()*10000);;
	var object_list, local_objects = {};
	
	function SocketInit(){
		// サーバからデータを受け取る
		socket.on("S2C_Start", function (data){
			object_list = data.object_list;
			for(key in object_list){
				// 情報を受けて生成
				local_objects[key] = CreateObject(object_list[key]);
			}
			console.log(local_objects);
		});

		// サーバからデータを受け取り更新
		socket.on("S2C_Update", function (data) {
			object_list = data.object_list;
			// サーバのデータを元に更新と生成
			for(key in object_list){
				if(key != player_id){
					// 既存にあるものは弾く
					if(jQuery.isEmptyObject(local_objects[key])){
						CreateObject(object_list[key]);
					}else{
						local_objects[key].body.x = object_list[key].x;
						local_objects[key].body.y = object_list[key].y;
						local_objects[key].body.rotation = object_list[key].rotation;
					}
				}
			}
			// サーバに存在しないものを削除
			console.log("ローカル：");
			console.log(local_objects);
			console.log("サーバ：");
			console.log(object_list);
			// ローカルとサーバを比較しサーバに無いものをローカルから削除
			for(key in local_objects){
				//if(!(object_list[key])) local_objects[key].kill();
			}
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

	var player, energy_bar, hp_bar;
	var ANGLE = 200;
	var BOOST_POWER = 5000;	
	var USE_ENERGY = 2;

	// ロケット
	var Rocket = function ( game, x, y, image ){
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, image);
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		// 中心
		this.anchor.setTo(0.5, 0.5);
		// あたり判定
		game.physics.enable(this, Phaser.Physics.ARCADE);
		
		game.add.existing(this);
	};
	Rocket.prototype = Object.create(Phaser.Sprite.prototype);
	Rocket.prototype.constructor = Rocket;

	var PlayerRocket = function (game, x, y){
		Rocket.call(this, game, x, y, 'player');
		// HPとか
		this.maxHealth = 100;
		this.health = 80;
		// エネルギー
		this.energy = 100;
		this.maxEnergy = 100;
		// プレイヤーのループ処理
		game.time.events.loop(Phaser.Timer.QUARTER, PlayerRecovery, this);
		function PlayerRecovery(){
			// Energyの回復
			if(player.energy < player.maxEnergy){
				player.energy++;
			}
			if(player.health < player.maxHealth){
				player.health += 0.2;
			}
		}
	};
	PlayerRocket.prototype = Object.create(Rocket.prototype);
	PlayerRocket.prototype.constructor = PlayerRocket;
	PlayerRocket.prototype.update = function(){
		// 左右の回転
		if (keys.left.isDown){
			this.angle -= 3;
		}else if (keys.right.isDown){
			this.angle += 3;
		}
		// 進む
		if(keys.up.isDown){
			if (this.energy - USE_ENERGY >= 0 ){
				this.energy -= USE_ENERGY;
			}
		}
	};

	// プレイヤーメソッド
	/*
	  function(){
		  if (this.ship.x > this.game.width) this.ship.x = 0;
	 game.add.sprite	  if (this.ship.x < 0) this.ship.x = this.game.width;
		  if (this.ship.y > this.game.height) this.ship.y = 0;
		  if (this.ship.y < 0) this.ship.y = this.game.height;
	}
	*/

	// 弾
	Bullet = function ( game, x, y, rotate ){
		// スプライト設定
		bullet = game.add.sprite(x, y - 70, 'bullet');
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
	}

	// 分岐して作成
	function CreateObject( data ){
		var object = {};
		switch (data.type){
		case "user": 
			// スプライトを生成
			object = new EnemyRocket(game, data.x, data.y);
			object.owner_id = data.owner_id;;
			break;
		default:
			break;
		}
		return object;
	}
	
    function Create () {
		game.stage.disableVisibilityChange = true;
		// 物理計算方式
		game.physics.startSystem(Phaser.Physics.P2JS);
		// キーボードのインプットを登録
		keys = game.input.keyboard.createCursorKeys();
		console.log(keys);
		// playerの設定
		// スプライト設定
		player = new PlayerRocket(game, Math.floor(Math.random()*800+20), Math.floor(Math.random()*600+20));
		//	game.add.sprite( Math.floor(Math.random()*800+20), Math.floor(Math.random()*600+20), 'player' );
		
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

		// スペースキー
		space_button = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(BulletFire, this);
		
		// テキスト
		text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });
		// SocketInit();
	}
	
	function BulletFire(){
		console.log("BulletFire");
		CreateBullet(player.position.x, player.position.y, player.rotation);
	}

	function Update() {
		// ゲージの表示
		energy_bar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(player.energy, 0);
		hp_bar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(player.health, 0);

		// 更新処理
		//local_objects[player_id] = {type: player.type, position: player.position, rotation: player.rotation, health: player.health, owner_id: player_id};
		//socket.emit("C2S_Update", local_objects);
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};

