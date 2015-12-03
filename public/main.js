window.onload = function() {
// === サーバに関する処理 ===
	// 接続先の指定(192.168.8.89)
	var url = "http://192.168.8.89:8080";
	// 接続
	var socket = io.connect(url);
	
	// サーバから受け取るイベントを作成
	socket.on("s2c_start", function (data) {
		for(key in data){
			console.log(data[key]); // 値が取れない
		}
	});

	// ボタンクリック時に、メッセージ送信
	$("input#send").click(function(){
	  var msg = $("#message").val();
	  $("#message").val("");
	  // サーバへ送信
	  socket.emit("MessageToServer", {value:msg});
	});

	function start(id) {
		socket.emit("connected", id);
		socket.emit("c2s_start");
	}

	var id = "User" + Math.floor(Math.random()*10000);
	start(id)
	

// === ゲームに関する処理 ===
    var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

	function preload () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
	}

	var player, enemy, energy_bar, hp_bar;
	var ANGLE = 200;
	var BOOST_POWER = 5000;	
	var USE_ENERGY = 20;	
    function create () {
		// 物理計算方式
		game.physics.startSystem(Phaser.Physics.P2JS);
		
		// キーボードのインプットを登録
		keys = game.input.keyboard.createCursorKeys();

		// スプライトを生成
		enemy = game.add.sprite(200, 300, 'enemy');
		enemy.scale.setTo(0.3, 0.3);
		// enemyにphyisicsを付与
		game.physics.p2.enable(enemy);
		// あたり判定 ( 四角形 )
		enemy.body.setRectangle(20, 80);
		
		// playerの設定
		player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
		game.physics.p2.enable(player);
		player.scale.setTo(0.3, 0.3);
		player.anchor.setTo(0.5, 0.5);
		player.body.setRectangle(20, 80);
		// プレイヤーの移動処理
		keys.up.onDown.add(player_move, this);
		// プレイヤーの回復処理
		game.time.events.loop(Phaser.Timer.QUARTER, player_recovery, this);
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
		player.id = id;
		console.log(player.id);

		// テキスト
		text = game.add.text(20, 20, "HP: \n" + "Energy: ", { font: "16px Arial", fill: "#EEE" });
		// ゲーム内時間
		game.time.events.loop(Phaser.Timer.SECOND, game_time, this);
	}

	// プレイヤーメソッド
	function player_move(){
		if (player.energy - USE_ENERGY >= 0 ){
			player.energy -= USE_ENERGY;
			player.body.thrust(BOOST_POWER);
		}
	}

	function player_recovery(){
	    // Energyの回復
		if(player.energy < player.maxEnergy){
			player.energy++;
		}
		if(player.health < player.maxHealth){
			player.health += 0.2;
		}
    }
	
	function update() {
		player.body.angularVelocity = 0;
		energy_bar.clear().moveTo(0,0).lineStyle(16, 0x00ced1, 0.9).lineTo(player.energy, 0);
		hp_bar.clear().moveTo(0,0).lineStyle(16, 0x00ff00, 0.9).lineTo(player.health, 0);

		if (keys.left.isDown){
			player.body.rotateLeft(100);
		}else if (keys.right.isDown){
			player.body.rotateRight(100);
		}
		player.body.angularAcceleration = 0;
	}

	// 一秒ごとの処理
	function game_time() {
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};

