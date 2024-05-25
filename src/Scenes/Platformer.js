class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.DRAG = 1100;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 3;

        this.collected = 0;
        this.isUpDown = false;
    }

    preload() {
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
    }


    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 100 tiles wide and 20 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 100, 40);
        this.physics.world.setBounds(0, 0, 100 * 18, 41 * 18);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Find coins in the "Objects" layer in Phaser
        // Look for them by finding objects with the name "coin"
        // Assign the coin texture from the tilemap_sheet sprite sheet
        // Phaser docs:
        // https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Tilemaps.Tilemap-createFromObjects

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 190
        });


        // Since createFromObjects returns an array of regular Sprites, we need to convert
        // them into Arcade Physics sprites (STATIC_BODY, so they don't move)
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);


        // set up player avatar
        my.sprite.player = this.physics.add.sprite(30, 630, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // Handle collision detection with coins
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.sound.play('partCollect');
            this.collected++;
            // Update the text to reflect the new count
            this.partCountText.setText(`Parts Collected: ${this.collected} / 10`);
        });


        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();


        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        //default debug to off
        this.physics.world.drawDebug = false;

        // flip gravity key listener (assigned to G key)
        this.input.keyboard.on('keydown-G', () => {
            this.physics.world.gravity.y = this.physics.world.gravity.y > 0 ? -1500 : 1500;
            // flip player sprite
            my.sprite.player.flipY = !my.sprite.player.flipY;
            this.isUpDown = !this.isUpDown;
        }, this);


        //movement vfx
        my.vfx.walking = this.add.particles(0, 0, "kenny-particles", {
            frame: ['dirt_01.png'],

            random: true,
            scale: {start: 0.03, end: 0.02},
            maxAliveParticles: 8,
            lifespan: 350,
            alpha: {start: 1, end: 0.1},
        });

        my.vfx.jump = this.add.particles(0, 0, "kenny-particles", {
            frame: ['dirt_02.png'],

            random: true,
            scale: {start: 0.03, end: .5},
            maxAliveParticles: 20,
            lifespan: 350,
            alpha: {start: 1, end: 0.1},
        });

        my.vfx.walking.stop();
        my.vfx.jump.stop();


        //camera code
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);

        this.animatedTiles.init(this.map)

        //play some music
        if (this.sound.get('bgm') == null || this.sound.get('bgm').isPlaying == false) {
            this.sound.play('bgm', {loop: true, volume: 0.3});
        }

        //create the background
        this.background = this.add.tileSprite(0, 0, this.map.widthInPixels, this.map.heightInPixels, 'background').setOrigin(0, 0).setScrollFactor(0).setDepth(-90).setScale(5);
        this.midground = this.add.tileSprite(0, 0, this.map.widthInPixels, this.map.heightInPixels, 'buildings').setOrigin(0, 0).setScrollFactor(0).setDepth(-89).setScale(5);

        this.partCountText = this.add.text(0, 0, 'Parts Collected: 0 / 10', {fontSize: '20px'})
            .setDepth(99)
            .setScrollFactor(1);

        //place some text on the screen
        this.add.text(20, 600, 'Press \'G\' to\n flip gravity', {fontSize: '12px'})
            .setDepth(99)

    }

    update() {

        this.doPlayerMovement();

        //Kill the player if they fall off the map
        if (my.sprite.player.y > this.map.heightInPixels || my.sprite.player.y < 20) {
            this.scene.start("GameOver", {died: true});

        }

        //check the win condition
        if (this.collected == 10) {
            this.scene.start("GameOver", {died: false});
        }


        // Play audio if the player lands on something
        if (my.sprite.player.body.blocked.down && my.sprite.player.isFalling) {
            // Play sound when player touches the ground for the first time after falling
            this.sound.play('landAudio');
            my.sprite.player.isFalling = false; // Reset isJumping to false when the player lands
        }

        //Move the paraallax background
        this.background.tilePositionX = this.cameras.main.scrollX * 0.01;
        this.midground.tilePositionX = this.cameras.main.scrollX * 0.05;

        // Update text position on camera update (scroll or zoom)
        this.cameras.main.on('cameraupdate', this.updateTextPosition, this);

        // Initial update to position the text correctly
        this.updateTextPosition();

    }

    updateTextPosition() {
        const camera = this.cameras.main;
        // Adjust the text position to stay in the top-left corner of the screen
        this.partCountText.setPosition(camera.worldView.x + 10, camera.worldView.y);
    }


    doPlayerMovement() {
        if (cursors.left.isDown) {
            if (my.sprite.player.body.velocity.x > 5) {

                my.sprite.player.setAccelerationX(-this.ACCELERATION * 5);
            } else {
                my.sprite.player.setAccelerationX(-this.ACCELERATION);
            }

            my.sprite.player.setFlip(false, this.isUpDown);
            my.sprite.player.anims.play('walk', true);
            //particle following code
            my.vfx.walking.startFollow(my.sprite.player, this.getPlayerFootPos(my.sprite.player).x, this.getPlayerFootPos(my.sprite.player).y, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down || my.sprite.player.body.blocked.up) {

                my.vfx.walking.start();

            }

        } else if (cursors.right.isDown) {

            if (my.sprite.player.body.velocity.x < 5) {
                my.sprite.player.setAccelerationX(this.ACCELERATION * 5);
            } else {
                my.sprite.player.setAccelerationX(this.ACCELERATION);
            }
            my.sprite.player.setFlip(true, this.isUpDown);
            my.sprite.player.anims.play('walk', true);

            my.vfx.walking.startFollow(my.sprite.player, this.getPlayerFootPos(my.sprite.player).x, this.getPlayerFootPos(my.sprite.player).y, false);

            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            // Only play smoke effect if touching the ground

            if (my.sprite.player.body.blocked.down || my.sprite.player.body.blocked.up) {

                my.vfx.walking.start();

            }

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            //have the vfx stop playing
            my.vfx.walking.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if (!my.sprite.player.body.blocked.down && !my.sprite.player.body.blocked.up) {
            my.sprite.player.anims.play('jump');
            my.sprite.player.isFalling = true;
        }
        if (my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
            this.sound.play('jumpAudio');
            my.vfx.jump.startFollow(my.sprite.player, my.sprite.player.displayWidth / 2, my.sprite.player.displayHeight / 2, false);
            my.vfx.jump.emitParticle(10);
        }else if(my.sprite.player.body.blocked.up && Phaser.Input.Keyboard.JustDown(cursors.up)){
            my.sprite.player.body.setVelocityY(-this.JUMP_VELOCITY);
            this.sound.play('jumpAudio');
            my.vfx.jump.startFollow(my.sprite.player, this.getPlayerFootPos(my.sprite.player).x, this.getPlayerFootPos(my.sprite.player).y, false);
            my.vfx.jump.emitParticle(10);
        }
    }

    getPlayerFootPos(player) {
        let footX = player.displayWidth / 2 -15;
        let footY;

        if (player.flipY) {
            // If the player is flipped, the feet are at the top of the sprite
            footY = player.displayHeight / 2 -25;
        } else {
            // Otherwise, the feet are at the bottom of the sprite
            footY = player.displayHeight / 2 - 5;
        }

        return {x: footX, y: footY};
    }
}