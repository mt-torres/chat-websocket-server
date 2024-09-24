const express = require("express");
const app = express();
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const cors = require("cors");

app.use(
	cors({
		origin: "https://chat-kappa-one-60.vercel.app/", // Permitir solicitações deste domínio
		methods: ["GET", "POST"],
		allowedHeaders: ["Content-Type"],
	})
);

const server = createServer(app);
const io = new Server(server, {
	cors: {
		origin: "https://chat-kappa-one-60.vercel.app/", // Permitir solicitações deste domínio
		methods: ["GET", "POST"],
		allowedHeaders: ["Content-Type"],
		credentials: true,
	},
	transports: ["websocket", "polling"], // Certifique-se de que websocket está incluído
});

const users = {};
io.on("connection", (socket) => {
	socket.on("joinRoom", (data) => {
		const { userName, room } = data;

		console.log("msg from socket server.js | user: ", userName);
		console.log("msg from socket server.js | room: ", room);

		//Armazena o usuário com base no ID do socket
		users[socket.id] = { userName, room };

		socket.join(room);
		socket.emit(
			"joinRoom",
			`Olá ${userName}, bem vindo a sala ${room}`
		);

		//msg enviada a todos da sala, menos p user q entrou na sala
		socket.broadcast
			.to(room)
			.emit("joinRoom", userName + " entrou na sala!");

		//envia a informação dos usuarios disponiveis
		const usersInRoom = getUsersInRoom(room);
		io.to(room).emit("roomUsers", usersInRoom);
	});

	function getUsersInRoom(room) {
		return Object.values(users).filter((i) => i.room == room);
	}

	socket.on("chatMessage", (msg) => {
		const msgToBeSend = msg.msgToBeSend;
		const userName = msg.userData.userName;
		const room = msg.userData.room;
		io.to(room).emit("message", { userName, msgToBeSend });
	});

	socket.on("disconnect", () => {
		const user = users[socket.id];

		console.log(user);
		if (user) {
			const room = user.room;
			delete users[socket.id];

			// Envia uma mensagem de saída para outros usuários na sala
			socket.to(room).emit(
				"leftRoom",
				`${user.userName} saiu da sala.`
			);

			// Atualiza a lista de usuários na sala
			const usersInRoom = getUsersInRoom(room);
			io.to(room).emit("roomUsers", usersInRoom);
		}
	});
});

function getUsersInRoom(room) {
	return Object.values(users).filter((i) => i.room == room);
}

server.listen(4000, function () {
	console.log("Running on port 4000");
});

module.exports = app;
