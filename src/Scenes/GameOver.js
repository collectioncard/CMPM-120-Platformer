class GameOver extends Phaser.Scene {

    constructor() {
        super("GameOver");
        this.died = false;
    }


    init(data) {
        this.died = data.died;
    }

    preload() {

    }

    create() {
        this.sound.stopAll();

        this.sound.play('gameOver', {loop: true, volume: 0.3});

        let gameOverText;
        if (this.died) {
            gameOverText = 'You Died! \nPress the enter key to try again!';
        } else {
            gameOverText = 'You Win! \nGravity has been restored to the world! \nPress enter to play again!';
        }

        this.add.text(0, 0, gameOverText, {fontSize: '50px', align: 'center'})
            .setOrigin(0.5, 0.5)
            .setPosition(this.cameras.main.centerX, this.cameras.main.centerY);

        this.input.keyboard.on('keydown-ENTER', () => {
            this.sound.stopAll();
            this.scene.start('platformerScene');
        });

    }

    update() {

    }

}