window.onload = function() {
// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	// var url = "http://192.168.8.89:8080";
	var url = "http://" + window.location.hostname + ":8080";
	// 接続
	var socket = io.connect(url);
	var player_id = "User" + Math.floor(Math.random()*10000);;
	var object_list, local_objects = {};
	
	function socketInit(){
		// サーバからデータを受け取る
		socket.on("s2c_Start", function (data){
			object_list = data.object_list;
			for(key in object_list){
				// 情報を受けて生成
				local_objects[key] = createObject(object_list[key]);
			}
			console.log(local_objects);
		});

		// サーバからデータを受け取り更新
		socket.on("s2c_Update", function (data) {
			object_list = data.object_list;
			// サーバのデータを元に更新と生成
			for(key in object_list){
				if(key != player_id){
					// 既存にあるものは弾く
					if(jQuery.isEmptyObject(local_objects[key])){
						createObject(object_list[key]);
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
	var ANGLE = 200;
	var BOOST_POWER = 5000;	
	var USE_ENERGY = 1;

	// ロケット
	var Rocket = function ( game, x, y, image ){
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, image);
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		// 中心
		this.anchor.setTo(0.5, 0.5);
		// あたり判定
		this.game.physics.enable(this, Phaser.Physics.ARCADE);

		game.add.existing(this);
	};
	Rocket.prototype = Object.create(Phaser.Sprite.prototype);
	Rocket.prototype.constructor = Rocket;

	var PlayerRocket = function (game, x, y){
		Rocket.call(this, game, x, y, 'player');
		// 加速
		this.ACCELERATION = 200;
		this.MAX_SPEED = 250;
		this.ROTATION_SPEED = 180;
		this.ROTATION_OFF_SET = -1.6;
		// HPとか
		this.maxHealth = 100;
		this.health = 80;
		// エネルギー
		this.maxEnergy = 1000;
		this.energy = 1000;
		function playerRecovery() {
			// Energyの回復
			if(player.energy < player.maxEnergy){
				player.energy++;
			}
			if(player.health < player.maxHealth){
				player.health += 0.2;
			}
		}
		// プレイヤーのループ処理
		game.time.events.loop(Phaser.Timer.QUARTER, playerRecovery, this);
		this.body.maxVelocity.setTo(this.MAX_SPEED, this.MAX_SPEED);

		// 弾の発射
		space_button = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(fireBullet, this);
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
			this.body.angularVelocity = -this.ROTATION_SPEED;
		}else if (keys.right.isDown){
			this.body.angularVelocity = this.ROTATION_SPEED;
		}else{
			this.body.angularVelocity = 0;
		}
		// 進む
		if(keys.up.isDown){
			if (this.energy - USE_ENERGY >= 0 ){
				this.energy -= USE_ENERGY;
				this.body.acceleration.x =
					Math.cos(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
				this.body.acceleration.y =
					Math.sin(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
				console.log(this);
				console.log(this.ACCELERATION);
			}
		}else{
			this.body.acceleration.setTo(0, 0);
		}
	}

	// 弾
	var Bullet = function ( game, x, y, rotate ){
		this.ROTATION_OFF_SET = -1.6;
		this.ACCELERATION = 50;
		// スプライト設定
		Phaser.Sprite.call(this, game, x, y, 'bullet');
		// 画像サイズ
		this.scale.setTo(0.3, 0.3);
		// 中心
		this.anchor.setTo(0.5, 0.5);
		// あたり判定
		this.game.physics.enable(this, Phaser.Physics.ARCADE);
		// 向き
		this.rotation = rotate;
		// 発射
		game.add.existing(this);
	}
	Bullet.prototype = Object.create(Phaser.Sprite.prototype);
	Bullet.prototype.constructor = Bullet;
	Bullet.prototype.update = function() {
		this.body.acceleration.x = Math.cos(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
		this.body.acceleration.y = Math.sin(this.rotation + this.ROTATION_OFF_SET) * this.ACCELERATION;
	}

	// 分岐して作成
	function createObject( data ){
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
	
    function create () {
		game.stage.disableVisibilityChange = true;
		// 背景色
		game.stage.backgroundColor = 0x333333;
		// 物理計算方式
		//game.physics.startSystem(Phaser.Physics.P2JS);
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
		
		// テキスト
		text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });
		//socketInit();
	}
	
	function fireBullet(){
		console.log("BulletFire");
		bullet = new Bullet(game, player.position.x, player.position.y, player.rotation); 
	}

	function update() {
		// ゲージの表示
		energy_bar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(player.energy, 0);
		hp_bar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(player.health, 0);

		// 更新処理
		//local_objects[player_id] = {type: player.type, position: player.position, rotation: player.rotation, health: player.health, owner_id: player_id};
		//socket.emit("c2s_Update", local_objects);
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};

