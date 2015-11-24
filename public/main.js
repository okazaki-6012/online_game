window.onload = function() {
	// 接続先の指定(192.168.8.89)
	var url = "http://192.168.8.89:8080";
	// 接続
	var socket = io.connect(url);
	
	// サーバから受け取るイベントを作成
	socket.on("MessageToClient", function (data) {
		addMessage(data.value)
	});

	// ボタンクリック時に、メッセージ送信
	$("input#send").click(function(){
	  var msg = $("#message").val();
	  $("#message").val("");
	  // サーバへ送信
	  socket.emit("MessageToServer", {value:msg});
	});

	function start(name) {
		socket.emit("connected", name);
	}

	function addMessage (msg) {
		$("#msg_list").prepend("<li>" + msg + "</li>");
	}

	var myName = Math.floor(Math.random()*10000);
	start(myName)

// === ここまでサーバに向けた処理 ===
	
    var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });
	
	function preload () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
	}

	var player;
	var enemy;
	var SPEED = 50;
	var ANGLE = 200;
    function create () {

		// キーボードのインプットを登録
		upKey = game.input.keyboard.addKey(Phaser.Keyboard.UP);
		downKey = game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
		leftKey = game.input.keyboard.addKey(Phaser.Keyboard.LEFT);
		rightKey = game.input.keyboard.addKey(Phaser.Keyboard.RIGHT);
		
		// スプライトを生成
		enemy = game.add.sprite(200, 300, 'enemy');
		// enemyにphyisicsを付与
		game.physics.enable(enemy, Phaser.Physics.ARCADE);

		// playerの設定
		player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
		game.physics.enable(player, Phaser.Physics.ARCADE);
		player.anchor.setTo(0.5, 0.5);
    }

	function update() {

		player.body.velocity.x = 0;
		player.body.velocity.y = 0;
		player.body.angularVelocity = 0;
		
		if (upKey.isDown){
			game.physics.arcade.velocityFromAngle(player.angle, SPEED, player.body.velocity);
		}

		player.body.angularAcceleration = 0;
		if (leftKey.isDown){
			player.body.angularVelocity = -ANGLE;
		}else if (rightKey.isDown){
			player.body.angularVelocity = ANGLE;
		}

		game.physics.arcade.collide(enemy, player, collisionHandler, null, this);
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};

