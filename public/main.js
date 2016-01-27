window.addEventListener("DOMContentLoaded",function() {
	// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	// var url = "http://192.168.8.89:8080";
	var url = "http://" + window.location.hostname + ":4649";
	// 接続
	var socket = io.connect(url);
	var player_id = "User" + Math.floor(Math.random()*10000);
	var local_objects = {}, update_objects = {};

	function socketInit(){
		// 定期的、弾の座標送信
		var push_timer = window.setInterval(function (){
			for(key in update_objects){
				if(key != player_id && local_objects[key]){
					update_objects[key]["x"] = local_objects[key].x;
					update_objects[key]["y"] = local_objects[key].y;
				}
			}
		} , 500);

		// サーバからデータを受け取り更新
		socket.on("s2c_Update", function (data) {
			var server_objects = data.object_list || {};
			// サーバ内のオブジェクトを確認
			for(key in server_objects){
				if(key != player_id){
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
							var date = Date.now();
						    local_objects[key] = new Bullet( game,
															 server_objects[key].x,
															 server_objects[key].y,
															 server_objects[key].rotation,
															 server_objects[key].id,
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
		});

		socket.on("s2c_RemoveObject", function (data) {
			local_objects[data.id].destroy();
			delete local_objects[data.id];
			if(update_objects[data.id]) delete update_objects[data.id];
		});

		function Start(id) {
			socket.emit("c2s_Start", id);	
		}
		Start(player_id);
	}

// === ゲームに関する処理 ===
	var game = new Phaser.Game(1024, 480, Phaser.AUTO, '', { preload: preload, create: create, update: update });

	// 素材読み込み
	function preload () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
		game.load.image('bullet', 'asset/bullet.png');
	}

	// ロケット
	var Rocket = function ( game, x, y, image, id, type ){
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, image);
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		// 中心
		this.anchor.setTo(0.5, 0.5);
		// ユーザID
		this.id = id
		// 所有者ID
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
		this.USE_ENERGY = 1;
		this.DAMEGE = 30;
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
			if(this.health > 0){
				// Energyの回復
				if(this.energy < this.maxEnergy){
					this.energy += 2;
				}
				// Healthの回復
				if(this.health < this.maxHealth){
					this.health += 0.5;
				}
			}
		}
		// ループ処理( 250ミリ秒毎 )
		game.time.events.loop(Phaser.Timer.QUARTER, playerRecovery, this);

		// 弾の発射
		function fireBullet(){
			if (this.energy - (this.USE_ENERGY*20) >= 0 && this.health > 0 ){
				this.energy -= (this.USE_ENERGY*20);
				var x = this.x + Math.sin(this.rotation) * 60;
				var y = this.y - Math.cos(this.rotation) * 60;
				var id = "bullet" + Math.floor(Math.random()*10000);
				update_objects[id] = {id: id, type: "bullet", date: Date.now(), x: x, y: y, rotation: this.rotation, owner_id: this.owner_id};
				socket.emit("c2s_AddObject", update_objects[id]);
			}
		}
		// 弾を撃つキーの設定
		keys.space.onDown.add(fireBullet, this);
		update_objects[player_id] = {id: this.id, type: "user", date: Date.now(), x: this.x, y: this.y, rotation: this.rotation, owner_id: id};
		socket.emit("c2s_AddObject", update_objects[player_id]);
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
			this.x += this.speed_x * this.friction || 0;
			this.y += this.speed_y * this.friction || 0;
		}

		for(key in local_objects){
			if(local_objects[key].owner_id != this.owner_id && local_objects[key].type == "bullet"){
				if (checkOverlap(this, local_objects[key])){
					if(this.health - this.DAMEGE > 0)
						this.health -= this.DAMEGE;
					else
						this.health = 0;
					socket.emit("c2s_RemoveObject", {id: local_objects[key].id});
				}
			}
		}

		// 更新処理
		update_objects[this.id] = { x: this.x, y: this.y,
									rotation: this.rotation };
	}

	// 弾
	var Bullet = function ( game, x, y, rotate, id, owner_id ){
		this.ROTATION_OFF_SET = -1.57;
		this.ACCELERATION = 5;
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, 'bullet');
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		this.type = "bullet";
		// ID
		this.id = id
		this.owner_id = owner_id;
		// 中心
		this.anchor.setTo(0.5, 0.5);
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
		if ( (this.x < 0 || this.x > this.game.width) || (this.y < 0 || this.y > this.game.height) ){
			if(this.owner_id == player_id) socket.emit("c2s_RemoveObject", update_objects[this.id]);
		}
		
	};

	function setupKeys (game){
		// UP, DOWN, LEFT, RIGHT
		this.keys = game.input.keyboard.createCursorKeys();
		// SPACE
		this.keys["space"] = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		return this.keys;
	}

	function checkOverlap(objA, objB) {
		var bodyA = { x: objA.x, y: objA.y, width: objA.width, height: objA.height };
		var bodyB = { x: objB.x, y: objB.y, width: objB.width, height: objB.height };
		var area = 25;
		if( (bodyA.x <= (bodyB.x + area) && bodyA.x >= (bodyB.x - area))
			&& (bodyA.y <= (bodyB.y + area) && bodyA.y >= (bodyB.y - area)) ){
			return true;
		}else{ return false; }
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
		local_objects[player_id] = new PlayerRocket(game, Math.floor(Math.random()* game.width), Math.floor(Math.random()* game.height), "player", player_id, "user");
		
		// HPゲージ
		game.add.graphics(50, 30).lineStyle(16, 0xff0000, 0.8).lineTo(local_objects[player_id].maxHealth, 0);
		hp_bar = game.add.graphics(50, 30);

		// powerゲージ
		game.add.graphics(80, 53).lineStyle(16, 0xff0000, 0.8).lineTo(local_objects[player_id].maxEnergy, 0);
		energy_bar = game.add.graphics(80, 53);

		// テキスト
		game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });

		socketInit();
	}
	
	function update() {
		// ゲージの表示を更新
		if(local_objects[player_id]){
			energy_bar.clear().moveTo(0,0)
				.lineStyle(16, 0x00ced1, 0.9).lineTo(local_objects[player_id].energy, 0);
			hp_bar.clear().moveTo(0,0)
				.lineStyle(16, 0x00ff00, 0.9).lineTo(local_objects[player_id].health, 0);
			if(local_objects[player_id].health == 0){
				socket.emit("c2s_RemoveObject", {id: local_objects[player_id].id});
				var pop_up = confirm("もう一度プレイ致しますか？");
				if (pop_up == true){
					local_objects[player_id] = new PlayerRocket(game, Math.floor(Math.random()* game.width), Math.floor(Math.random()* game.height), "player", player_id, "user");
				}
			}
		}
		socket.emit("c2s_Update", update_objects);
	}
}, false)
