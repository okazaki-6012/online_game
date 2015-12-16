window.onload = function() {
	var networking;
	var player_id;
	var object_list;
	var player, objects = {}, energy_bar, hp_bar;
	var controller, hud;
	var ANGLE = 200;
	var BOOST_POWER = 5000;	
	var USE_ENERGY = 20;

	var puts = function(){ console.log.apply(console, arguments); };
	
	function CreateClass(className, superClass, cls){
		var constructor = function(){
			cls.constructor.apply(this, arguments);
		};
		constructor.prototype = Object.create(superClass.prototype, {});
		constructor.prototype.className = className;
		constructor.prototype.super = superClass.prototype;
		for( var key in cls ){
			if( cls.hasOwnProperty(key) ){
				constructor.prototype[key] = cls[key];
			}
		}
		return constructor;
	}
	
	// === ゲームに関する処理 ===
	var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preloadGame, create: createGame, update: updateGame });
	
	// 素材読み込み
	function preloadGame () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
		game.load.image('bullet', 'asset/bullet.png');
	}

	// Gameの初期化
    function createGame () {
		game.time.desiredFps = 15; // 15FPSに指定
		game.stage.disableVisibilityChange = true;
		// game.physics.startSystem(Phaser.Physics.P2JS);
		
		// ネットワークの初期化
		var url = "http://" + window.location.hostname + ":8080";
		var playerId = Math.floor(Math.random()*10000);
		networking = new Networking(game, url, playerId);
		networking.onInitialize = function(){
			// playerの設定
			player = new Rocket(game, {x: Math.floor(Math.random()*800+20), y: Math.floor(Math.random()*600+20), rotation: 0});
			controller = new PlayerController(game, player);
			hud = new PlayerHud(game, player);
		};
	}

	// Gameの更新処理
	function updateGame() {
	}

	/*******************************************************
	 * 通信処理を行うオブジェクト
	 *******************************************************/
	var Networking = CreateClass('Networking', Phaser.Sprite, {
		constructor: function(game, url, playerId){
			var _this = this;
			Phaser.Sprite.call(this, game, 0, 0, null);

			this.playerId = playerId;
			this.socket = io.connect(url);
			this.objects = {};
			
			// サーバからデータを受け取る
			this.socket.on("S2C_Start", function (data){
				for( var i = 0; i< data.objectList.length; i++){
					_this.updateObject(data.objectList[i]);
				}
				_this.socket.emit("C2S_Start", playerId);
				_this.onInitialize();
			});

			// サーバからデータを受け取り更新
			this.socket.on("S2C_Update", function (data) {
				_this.updateObject(data);
			});

			// サーバからデータを受け取り更新
			this.socket.on("S2C_Delete", function (id) {
				_this.deleteObject(id);
			});

			this.socket.on("disconnect", function (data){
				console.log('disconnected');
			});
		},
		update: function(){
		},
		updateObject: function(data){
			if( this.objects[data.id] ){
				this.objects[data.id].receiveData(data);
			}else{
				this.objects[data.id] = this.createObject(data);
			}
		},
		createObject: function(data){
			// console.log('create object: '+data.id);
			var cls = networkingClasses[data.className];
			var newObject = new cls(game, data);
			return newObject;
		},
		deleteObject: function(id){
			// console.log('delete object: '+id);
			if( this.objects[id] ){
				this.objects[id].onDelete();
				delete this.objects[id];
			}
		},
		onInitialize: function(){}
	});
	

	/*******************************************************
	 * ネットワークで同期されるオブジェクト
	 *******************************************************/
	var SyncObject = CreateClass('SyncObject', Phaser.Sprite, {
		constructor: function(game, data){
			Phaser.Sprite.call(this, game, 0, 0, null);
			if( data.id ){
				this.id = ''+data.id;
			}else{
				this.id = ''+Math.floor(Math.random()*1000000);
				this.ownerId = networking.playerId;
			}
			this.initializeData(data);
			game.add.existing(this);
		},
		initializeData: function(data){
			this.receiveData(data);
		},
		emit: function(data){
			data.className = this.className;
			data.id = this.id;
			networking.socket.emit('C2S_Update', data);
		},
		sendData: function(data){
		},
		receiveData: function(data){
			for( var key in data ){
				if( data.hasOwnProperty(key) ){
					this[key] = data[key];
				}
			}
		},
		onDelete: function(data){
			this.destroy();
		},
		onReceiveData: function(data){
			// DO NOTHING
		},
		isOwn: function(){
			return (this.ownerId == networking.playerId);
		}
	});

	/*******************************************************
	 * プレイヤー/敵のロケット.
	 *******************************************************/
	var Rocket = CreateClass('Rocket', SyncObject, {
		constructor: function(game, data){
			SyncObject.call(this, game, data);

			this.energy = 100;
			this.maxEnergy = 100;
			this.health = 100;
			this.maxHealth = 100;
			this.vx = 0;
			this.vy = 0;
			this.reloadTime = 0;

			this.setTexture(game.cache.getPixiTexture('player'));
			this.scale.setTo(0.3, 0.3);
			this.anchor.setTo(0.5, 0.5);
			// this.body.setRectangle(20, 80);
		
			// タイマー処理の登録
			this.recovertyTimer = game.time.events.loop(0.2 * Phaser.Timer.SECOND, this.onRecovery, this);
			this.networkTimer = game.time.events.loop(0.2 * Phaser.Timer.SECOND, this.onNetwork, this);
		},
		update: function(){
			this.x += this.vx * game.time.physicsElapsed;
			this.y += this.vy * game.time.physicsElapsed;
		},
		onRecovery: function(){
			// Energyの回復
			if(this.energy < this.maxEnergy){
				this.energy++;
			}
			if(this.health < player.maxHealth){
				player.health += 0.2;
			}
		},
		onNetwork: function(){
			if( this.isOwn() ){
				this.emit({x: this.x, y: this.y, vx: this.vx, vy: this.vy, rotation: this.rotation, energy: this.energy, health: this.health});
			}
		},
		receiveData: function(data){
			SyncObject.prototype.receiveData.call(this, data);
		},
		makeBullet: function(){
			var x = this.x + Math.sin(this.rotation) * 40;
			var y = this.y - Math.cos(this.rotation) * 40;
			var bullet = new Bullet(game, {x: x, y: y, rotation: this.rotation});
			bullet.sendData();
			return bullet;
		}

	});

	/*******************************************************
	 * 弾
	 *******************************************************/ 
	var Bullet = CreateClass('Bullet', SyncObject, {
		constructor: function(game, data){
			SyncObject.call(this, game, data);

			// 画像の指定
			this.setTexture(game.cache.getPixiTexture('bullet'));
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
		},
		update: function(){
			// this.rotation = rotation;
			this.speed = 200;
			this.vx = Math.sin(this.rotation) * this.speed;
			this.vy = -Math.cos(this.rotation) * this.speed;
			
			this.x += this.vx * game.time.physicsElapsed;
			this.y += this.vy * game.time.physicsElapsed;
		},
		sendData: function(){
			this.emit({x: this.x, y: this.y, rotation: this.rotation});
		}
	});

	/*******************************************************
	 * プレイヤーの入力を処理するクラス.
	 *******************************************************/
	var PlayerController = CreateClass('PlayerController', Phaser.Sprite, {
		constructor: function(game, player){
			Phaser.Sprite.call(this, game, 0, 0, null);
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

	/*******************************************************
	 * 画面上部のHPやエナジーの表示.
	 *******************************************************/
	var PlayerHud = CreateClass('PlayerHud', Phaser.Sprite, {
		constructor: function(game, player){
			Phaser.Sprite.call(this, game, 0, 0, null);
			
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
			
			// テキスト
			this.text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });


			game.add.existing(this);
		},
		update: function(){
			this.energyBar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(this.player.energy, 0);
			this.hpBar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(this.player.health, 0);
		}
	});

	var networkingClasses = {
		Rocket: Rocket,
		Bullet: Bullet
	};

};

