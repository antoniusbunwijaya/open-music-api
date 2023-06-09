const ClientError = require('../../exceptions/ClientError');
const autoBind = require('auto-bind');
class SongsHandler {
	constructor(service, validator) {
		this._service = service;
		this._validator = validator;
		autoBind(this); // Mem-bind nilai this untuk seluruh method sekaligus
	}

	async postSongHandler(request, h) {
		this._validator.validateSongPayload(request.payload);
		const songId = await this._service.addSong(request.payload);
		const response = h.response({
			status: 'success',
			message: 'Song Berhasil ditambahkan',
			data: {
				songId,
			},
		});
		response.code(201);
		return response;
	}

	async getSongsHandler(request, h) {
		const {title = null, performer = null} = request.query;
		const songs = await this._service.getSongs({title, performer});
		return {
			status: 'success',
			data: {
				songs,
			},
		};
	}

	async getSongByIdHandler(request, h) {
		const {id} = request.params;
		const song = await this._service.getSongById(id);
		return {
			status: 'success',
			data: {
				song,
			},
		};
	}

	async putSongByIdHandler(request, h) {
		this._validator.validateSongPayload(request.payload);
		const {id} = request.params;
		const {
			title,
			year,
			genre,
			performer,
			duration = null,
			albumId = null,
		} = request.payload;
		await this._service.editSongById(id,
			{
				title,
				year,
				genre,
				performer,
				duration,
				albumId,
			});
		return {
			status: 'success',
			message: 'Song berhasil diperbarui',
		};
	}

	async deleteSongByIdHandler(request, h) {
		const {id} = request.params;
		await this._service.deleteSongById(id);
		return {
			status: 'success',
			message: 'Song berhasil dihapus',
		};
	}
}

module.exports = SongsHandler;
