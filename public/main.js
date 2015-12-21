window.onload = function() {
// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	// var url = "http://192.168.8.89:8080";
	var url = "http://" + window.location.hostname + ":8080";
	// 接続
	var socket = io.connect(url);
	var player_id = "User" + Math.floor(Math.random()*10000);
	var local_objects = {}, update_objects = {};

	function socketInit(){
		// サーバからデータを受け取り更新
		socket.on("s2c_Update", function (data) {
			var server_objects = data.object_list || {};
			// サーバ内のオブジェクトを確認
			for(key in server_objects){
				if(server_objects[key].owner_id != player_id){
					// ローカルに存在するか、確認
					if(!local_objects[key]){
						// 存在しない場合、生成
						switch (server_objects[key].type){
						case "user": 
				  			// スプライトを生成
							local_objects[key] = new Rocket( game,
															 server_objects[key].x,
															 server_objects[key].y,
															 "enemy",
															 server_objects[key].owner_id,
															 "user" );
							break;
						case "bullet":
							local_objects[key] = new Bullet( game,
															 server_objects[key].x,
															 server_objects[key].y,
															 server_objects[key].rotation,
															 server_objects[key].owner_id );
							break;
						default:
							break;
						}
					}else{
						// 存在する場合、更新
						if(server_objects[key].type == "user"){
							local_objects[key].x = server_objects[key].x;
							local_objects[key].y = server_objects[key].y;
							local_objects[key].rotation = server_objects[key].rotation;
						}
					}
				}
			}
			
			// サーバに無いローカル上のものを削除
			if(Object.keys(server_objects).length != 0){
				for(key in local_objects){
					if(local_objects[key].owner_id != player_id && !(server_objects[key])){
						local_objects[key].destroy();
						delete local_objects[key];
					}
				}
			}
		});

		function Start(id) {
			socket.emit("c2s_Start", id);	
		}
		Start(player_id);
	}

// === ゲームに関する処理 ===
	var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
	
	// 素材読み込み
	function preload () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
		game.load.image('bullet', 'asset/bullet.png');
	}

	var player, energy_bar, hp_bar;
	// ロケット
	var Rocket = function ( game, x, y, image, id, type ){
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, image);
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		// 中心
		this.anchor.setTo(0.5, 0.5);
		// 物理演算
		this.game.physics.enable(this, Phaser.Physics.ARCADE);
				// ユーザID
		this.owner_id = id;
		this.type = type;
		game.add.existing(this);
	};
	Rocket.prototype = Object.create(Phaser.Sprite.prototype);
	Rocket.prototype.constructor = Rocket;

	// プレイヤー用のロケット
	var PlayerRocket = function (game, x, y, image, id, type){
		Rocket.call(this, game, x, y, image, id, type);
		// 定数
		this.ACCELERATION = 8;
		this.MAX_SPEED_X = 250;
		this.MAX_SPEED_Y = 250;
		this.ROTATION_SPEED = 0.05;
		this.ROTATION_OFF_SET = -1.57;
		this.USE_ENERGY = 0;
		// 速度
		this.speed_x = 0;
		this.speed_y = 0;
		// 摩擦
		this.friction = 1;
		// HPとか
		this.maxHealth = 100;
		this.health = 80;
		// エネルギー
		this.maxEnergy = 200;
		this.energy = 200;
		
		function playerRecovery() {
			// Energyの回復
			if(this.energy < this.maxEnergy){
				this.energy++;
			}
			// Healthの回復
			if(this.health < this.maxHealth){
				this.health += 0.2;
			}
		}
		// ループ処理( 250ミリ秒毎 )
		game.time.events.loop(Phaser.Timer.QUARTER, playerRecovery, this);

		// 弾の発射
		function fireBullet(){
			if (this.energy - (this.USE_ENERGY*10) >= 0 ){
				this.energy -= (this.USE_ENERGY*10);
				var x = this.x + Math.sin(this.rotation) * 60;
				var y = this.y - Math.cos(this.rotation) * 60;
				var bullet = new Bullet(game, x, y, this.rotation, this.owner_id);
				update_objects[bullet.id] = {type: bullet.type, x: bullet.x, y: bullet.y, rotation: bullet.rotation, owner_id: this.owner_id};
			}
		}
		// 弾を撃つキーの設定
		keys.space.onDown.add(fireBullet, this);
		console.log(this);
	};
	PlayerRocket.prototype = Object.create(Rocket.prototype);
	PlayerRocket.prototype.constructor = PlayerRocket;
	PlayerRocket.prototype.update = function() {
		if (this.x > this.game.width) this.x = 0;
		if (this.x < 0) this.x = this.game.width;
		if (this.y > this.game.height) this.y = 0;
		if (this.y < 0) this.y = this.game.height;
		// 左右の回転
		if (keys.left.isDown){
			this.rotation -= this.ROTATION_SPEED;
		}else if (keys.right.isDown){
			this.rotation += this.ROTATION_SPEED;
		}

		// 加速
		if(keys.up.isDown){
			if (this.energy - this.USE_ENERGY >= 0 ){
				this.energy -= this.USE_ENERGY;
				if(this.speed_x <= this.MAX_SPEED_X){
					this.speed_x = Math.cos(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
				}
				if(this.speed_y <= this.MAX_SPEED_Y){
					this.speed_y = Math.sin(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
				}
			}
			this.friction = 1;
		}else if(this.friction > 0){
			this.friction -= 0.03;
		}

		// 移動
		if(this.friction >= 0){
			this.x += this.speed_x * this.friction;
			this.y += this.speed_y * this.friction;
		}

		/*
		for(key in local_objects){
			if(local_objects[key].owner_id != this.owner_id){
				if (local_objects[key].type != "user" && checkOverlap(this, local_objects[key])){
					this.health--;
					console.log(this.health);
				}
			}
		}
		*/
	}

	// 弾
	var Bullet = function ( game, x, y, rotate, id ){
		this.ROTATION_OFF_SET = -1.57;
		this.ACCELERATION = 5;
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, 'bullet');
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		// ID
		this.id = "bullet" + Math.floor(Math.random()*10000);
		this.type = "bullet";
		this.owner_id = id;
		// 中心
		this.anchor.setTo(0.5, 0.5);
		// 物理演算
		this.game.physics.enable(this, Phaser.Physics.ARCADE);
		// 向き
		this.rotation = rotate;
		// 発射
		game.add.existing(this);
		this.game.add.group();
		this.enableBody = true;
	}
	Bullet.prototype = Object.create(Phaser.Sprite.prototype);
	Bullet.prototype.constructor = Bullet;
	Bullet.prototype.update = function() {
		this.x += Math.cos(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
		this.y += Math.sin(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
		if (this.x < 0 || this.x > this.game.width){
			delete local_objects[this.id];
			this.destroy();
		}else if (this.y < 0 || this.y > this.game.height){
			delete local_objects[this.id];
			this.destroy();
		}
		/*
		for(key in local_objects){
			if(local_objects[key].owner_id != player_id){
				console.log(local_objects[key]);
				if (checkOverlap(this, local_objects[key])){
					delete local_objects[this.id];
					this.destroy();
				}
			}
		}*/
	};

	function setupKeys (game){
		// UP, DOWN, LEFT, RIGHT
		this.keys = game.input.keyboard.createCursorKeys();
		// SPACE
		this.keys["space"] = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		return this.keys;
	}

	function checkOverlap(spriteA, spriteB) {
		var boundsA = spriteA.getBounds();
		var boundsB = spriteB.getBounds();
		return Phaser.Rectangle.intersects(boundsA, boundsB);
	}

    function create () {
		game.time.desiredFps = 30;
		game.stage.disableVisibilityChange = true;
		// 背景色
		game.stage.backgroundColor = 0x333333;
		// キーボードのインプットを登録
		keys = setupKeys(game);
		console.log(keys);
		// playerの設定
		// スプライト設定
		player = new PlayerRocket(game, Math.floor(Math.random()*800+20), Math.floor(Math.random()*600+20), "player", player_id, "user");
		// game.add.sprite( Math.floor(Math.random()*800+20), Math.floor(Math.random()*600+20), 'player' );
		
		// HPゲージ
		var hp_bar_bg = game.add.graphics(50, 30);
		hp_bar_bg.lineStyle(16, 0xff0000, 0.8);
		hp_bar_bg.lineTo(player.maxHealth, 0);
		hp_bar = game.add.graphics(50, 30);

		// powerゲージ
		var energy_bar_bg = game.add.graphics(80, 53);
		energy_bar_bg.lineStyle(16, 0xff0000, 0.8);
		energy_bar_bg.lineTo(player.maxEnergy, 0);
		energy_bar = game.add.graphics(80, 53);
		
		// テキスト
		text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });
		socketInit();
	}

	function update() {
		// ゲージの表示
		energy_bar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(player.energy, 0);
		hp_bar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(player.health, 0);

		// 更新処理
		update_objects[player_id] = {type: player.type, x: player.x, y: player.y, rotation: player.rotation, health: player.health, owner_id: player_id};
		/*
		for(key in local_objects){
			if(local_objects[key].owner_id == player_id){
				update_objects[key] = local_objects[key];
			}
		}
		*/
		socket.emit("c2s_Update", update_objects);
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};
