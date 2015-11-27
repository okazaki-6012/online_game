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

	var myName = "User" + Math.floor(Math.random()*10000);
	start(myName)

// === ここまでサーバに向けた処理 ===
	
    var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

	function preload () {
		game.load.image('enemy', 'asset/enemy.png');
		game.load.image('player', 'asset/player.png');
	}

	var player;
	var enemy;
	var SPEED = 100;
	var ANGLE = 200;
    function create () {
		// 物理計算方式
		game.physics.startSystem(Phaser.Physics.P2JS);
		
		// キーボードのインプットを登録
		cursors = game.input.keyboard.createCursorKeys();
		
		// スプライトを生成
		enemy = game.add.sprite(200, 300, 'enemy');
		// enemyにphyisicsを付与
		game.physics.p2.enable(enemy);
		// あたり判定 ( 四角形 )
		enemy.body.setRectangle(40, 40);
		
		// playerの設定
		player = game.add.sprite(game.world.centerX, game.world.centerY, 'player');
		game.physics.p2.enable(player);
		player.anchor.setTo(0.5, 0.5);
		// あたり判定 ( 円 )
		player.body.setCircle(28);
		// 最大HP
		console.log(player.maxHealth);
		// HPの回復
		player.heal(10);
		// 現在のHP
		console.log(player.health);
		// 名前1
		player.name = myName;
		console.log(player.name);
    }

	function update() {

		player.body.velocity.x = 0;
		player.body.velocity.y = 0;
		player.body.angularVelocity = 0;
		
		if (cursors.up.isDown){
			// 角度を-90することで上に向かって移動する
			player.body.thrust(10000);
		}

		player.body.angularAcceleration = 0;
		if (cursors.left.isDown){
			player.body.rotateLeft(100);
		}else if (cursors.right.isDown){
			player.body.rotateRight(100);
		}

		game.physics.arcade.collide(enemy, player, collisionHandler, null, this);
	}
	
	// イベントハンドラ（コールバック関数）
	function collisionHandler (obj1, obj2) {
		console.log("hey");
	}
};

