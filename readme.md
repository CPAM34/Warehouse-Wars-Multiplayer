# Warehouse Wars

Hello, everyone. This is a project that I contributed to in my final year of university and this would be the project I am most proud of. It is essentially a game of Pac-Man flipped on its head, where the goal is to trap all of the monsters by surround them with boxes!

### Prerequisites

You will need to have the following installed before proceeding:

- [Node.JS](https://github.com/nodejs), as this is the essential framework this game was founded on
- Node Package Module, or [npm](https://github.com/npm/cli), to install further dependencies
- [MongoDB](https://github.com/mongodb/mongo) for the database to store user info and scores. We highly recommend you use version 4.2.0.

### Installing

A step by step series of examples that tell you how to get a development environment running running

1. Run the `installscript` bash script provided after cloning the repo. Alternatively, you can simply run it with the following bash commands:

```
npm init 
npm install --save body-parser
npm install --save bcrypt
npm install --save mongodb
npm install --save express
npm install --save ws
npm install --save JSON
```

## Gameplay

The gameplay of this game is fairly straightforward - you must push boxes around with your player character to box in all of the monsters. But be mindful of the time limit - you must be quick to react and quick on your feet! You have three hit points. If you get hit by a monster three times, it is game over!

### Controls

To move the player around, either use the directional arrows on your keyboard or press the directional arrows you see on screen. If you are on mobile, swipe in the direction you would like to go on the included mobile canvas!

## Built With

- [Node.JS](https://github.com/nodejs)
- [Express.JS](https://github.com/expressjs/express)
- [MongoDB](https://github.com/mongodb/mongo)

## Acknowledgments

* Rabia Asif - You were my partner for this project in my class and I could never in a million years have implemented the more reactive AI for the monsters, as well as the implementation of mobile canvases, without your help!
* Arnold Rosenbloom - You were my professor for this class and always eager to help!


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.