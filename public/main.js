window.onload = function() {
// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	// var url = "http://192.168.8.89:8080";
	var url = "http://" + window.location.hostname + ":8080";
	// 接続
	var socket = io.connect(url);
	var player_id = Math.floor(Math.random()*10000);
	var object_list;
	
	function InitializeSocket(){
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

	var puts = function(){ console.log.apply(console, arguments); };

	function CreateClass(superClass, cls){
		var constructor = function(){
			cls.constructor.apply(this, arguments);
		};
		constructor.prototype = Object.create(superClass.prototype);
		constructor.prototype.super = superClass.prototype;
		for( var key in cls ){
			if( cls.hasOwnProperty(key) ){
				constructor.prototype[key] = cls[key];
			}
		}
		return constructor;
	}
	

	/**
	 * プレイヤー/敵のロケット.
	 */
	var Rocket = CreateClass(Phaser.Sprite, {
		constructor: function(game, x, y, name){
			this.super.constructor.call(this, game, x, y, 'player');

			this.energy = 100;
			this.maxEnergy = 100;
			this.health = 100;
			this.maxHealth = 100;
			this.vx = 0;
			this.vy = 0;
			this.reloadTime = 0;

			this.rotation = 0;
			this.scale.setTo(0.3, 0.3);
			this.anchor.setTo(0.5, 0.5);
			// this.body.setRectangle(20, 80);
		
			// タイマー処理の登録
			this.recovertyTimer = game.time.events.loop(0.2 * Phaser.Timer.SECOND, this.recovery, this);
			
			game.add.existing(this);
		},
		update: function(){
			this.x += this.vx * game.time.physicsElapsed;
			this.y += this.vy * game.time.physicsElapsed;
		},
		recovery: function(){
			// Energyの回復
			if(this.energy < this.maxEnergy){
				this.energy++;
			}
			if(this.health < player.maxHealth){
				player.health += 0.2;
			}
		},
		makeBullet: function(){
			var x = this.x + Math.sin(this.rotation) * 40;
			var y = this.y - Math.cos(this.rotation) * 40;
			var bullet = new Bullet(game, x, y, this.rotation);
			return bullet;
		}

	});

	/**
	 * 弾
	 */ 
	var Bullet = CreateClass(Phaser.Sprite, {
		constructor: function(game, x, y, rotation){
			this.super.constructor.call(this, game, x, y, 'bullet');

			this.rotation = rotation;
			this.speed = 200;
			this.vx = Math.sin(this.rotation) * this.speed;
			this.vy = -Math.cos(this.rotation) * this.speed;
			
			// 画像の指定
			this.scale.setTo(0.25, 0.25);
			this.anchor.setTo(0.5, 0.5);
			
			// 物理演算
			//game.physics.p2.enable(bullet);
			// あたり判定
			//bullet.body.setRectangle(10, 20);
			// 向き
			//bullet.body.rotation = rotate;
			// 発射
			//bullet.body.thrust(15000);
			
			game.add.existing(this);
		},
		update: function(){
			this.x += this.vx * game.time.physicsElapsed;
			this.y += this.vy * game.time.physicsElapsed;
		}
	});

	/**
	 * プレイヤーの入力を処理するクラス.
	 */
	var PlayerController = CreateClass(Phaser.Sprite, {
		constructor: function(game, player){
			this.super.constructor.call(this, game, 0, 0, null);
			this.player = player;
			this.keys = game.input.keyboard.addKeys({
				'a': Phaser.KeyCode.Z,
				'b': Phaser.KeyCode.X,
				'up': Phaser.KeyCode.UP,
				'down': Phaser.KeyCode.DOWN,
				'left': Phaser.KeyCode.LEFT,
				'right': Phaser.KeyCode.RIGHT
			});

			game.add.existing(this);
		},
		update: function(){
			var p = this.player;
			if (this.keys.left.isDown){
				p.rotation -= 3 * game.time.physicsElapsed;
			}else if (this.keys.right.isDown){
				p.rotation += 3 * game.time.physicsElapsed;
			}
			if (this.keys.up.isDown){
				if( p.energy >= 1 ){
					p.vx += 100 * Math.sin(p.rotation) * game.time.physicsElapsed;
					p.vy -= 100 * Math.cos(p.rotation) * game.time.physicsElapsed;
					p.energy -= 10.0 * game.time.physicsElapsed;
				}
			}
			if (this.keys.a.isDown){
				if( p.reloadTime <= 0 && p.energy >= 1 ){
					p.makeBullet();
					p.reloadTime = 0.06;
					p.energy -= 1; 
				}
			}
			this.player.reloadTime -= game.time.physicsElapsed;
		}
	});

	/**
	 * 画面上部のHPやエナジーの表示.
	 */
	var PlayerHud = CreateClass(Phaser.Sprite, {
		constructor: function(game, player){
			this.super.constructor.call(this, game, 0, 0, null);
			
			this.player = player;
			
			// HPゲージ
			this.hpBarBg = game.add.graphics(50, 30)
					.lineStyle(16, 0xff0000, 0.8)
					.lineTo(player.maxHealth, 0);
			
			this.hpBar = game.add.graphics(50, 30);

			// powerゲージ
			this.energyBarBg = game.add.graphics(80, 52.5)
					.lineStyle(16, 0xff0000, 0.8)
					.lineTo(player.maxEnergy, 0);
			
			this.energyBar = game.add.graphics(80, 52.5);

			game.add.existing(this);
		},
		update: function(){
			this.energyBar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(this.player.energy, 0);
			this.hpBar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(this.player.health, 0);
		}
	});

	var player, objects = {}, energy_bar, hp_bar;
	var controller;
	var ANGLE = 200;
	var BOOST_POWER = 5000;	
	var USE_ENERGY = 20;

    function Create () {
		game.stage.disableVisibilityChange = true;
		// 物理計算方式
		game.physics.startSystem(Phaser.Physics.P2JS);
		
		// キーボードのインプットを登録
		// playerの設定
		player = new Rocket(game, Math.floor(Math.random()*800+20), Math.floor(Math.random()*600+20), 'player');
		controller = new PlayerController(game, player);
		hud = new PlayerHud(game, player);
		// player.body.setCircle(25);
		
		// ユーザID
		player.id = player_id;
		player.type = "user";

		// テキスト
		text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });
		// SocketInit();
	}

	function Update() {
		return;
		
		player.body.angularVelocity = 0;

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

