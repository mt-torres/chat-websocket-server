const express = require("express");
const app = express();
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const cors = require("cors");

const server = createServer(app);

const io = new Server(server, {
	cors: {
		origin: "https://chat-kappa-one-60.vercel.app/", // Permitir solicitações deste domínio
		methods: ["GET", "POST"],
		allowedHeaders: ["Content-Type"],
		credentials: true,
	},
	transports: ["websocket", "polling"], 
});


const users = {};

io.on("connection", async (socket) => {
	const userId = socket.id;

	socket.on("joinRoom", (data) => {
		const { username, room } = data;

		//Armazena o usuário com base no ID do socket
		users[socket.id] = { username, room };

		//msg enviada somente para o usuario q acessou a sala
		socket.join(room);
		socket.emit(
			"joinRoom",
			`Olá ${username}, bem vindo a sala ${room}`
		);

		//msg enviada a todos da sala, menos p user q entrou na sala
		socket.broadcast
			.to(room)
			.emit("joinRoom", username + " entrou na sala!");

		//envia a informação dos usuarios disponiveis
		const usersInRoom = getUsersInRoom(room);
		io.to(room).emit("roomUsers", usersInRoom);
	});

	function getUsersInRoom(room) {
		return Object.values(users).filter((i) => i.room == room);
	}

	socket.on("chatMessage", (msg) => {
		const msgToBeSend = msg.msgToBeSend;
		const username = msg.userData.username;
		const room = msg.userData.room;
		io.to(room).emit("message", { username, msgToBeSend, userId });
	});

	socket.on("disconnect", () => {
		const user = users[socket.id];
		if (user) {
			const room = user.room;
			delete users[socket.id];

			// Envia uma mensagem de saída para outros usuários na sala
			socket.to(room).emit(
				"leftRoom",
				`${user.username} saiu da sala.`
			);

			// Atualiza a lista de usuários na sala
			const usersInRoom = getUsersInRoom(room);
			io.to(room).emit("roomUsers", usersInRoom);
		}
	});
});

server.listen(4000, function () {
	console.log("Running on port 4000");
});

module.exports = app;
