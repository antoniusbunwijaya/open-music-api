require("dotenv").config();

const Hapi = require("@hapi/hapi");
const Jwt = require("@hapi/jwt");

const Inert = require("@hapi/inert");

const path = require("path");

const albums = require("./api/albums");
const songs = require("./api/songs");
const users = require("./api/users");
const authentications = require("./api/authentications");
const playlists = require("./api/playlists");
const collaborations = require("./api/collaborations");
const playlistSongActivities = require("./api/playlistSongActivities");
const albumLikes = require("./api/albumLikes");

const AlbumsService = require("./services/postgres/AlbumsService");
const SongsService = require("./services/postgres/SongsService");
const UsersService = require("./services/postgres/UsersService");
const AuthenticationsService = require("./services/postgres/AuthenticationService");
const PlaylistsService = require("./services/postgres/PlaylistsService");
const CollaborationsService = require("./services/postgres/CollaborationsService");
const PlaylistSongActivitiesService = require("./services/postgres/PlaylistSongActivitiesService");
const ProducerService = require("./services/rabbitmq/ProducerService");
const StorageService = require("./services/storage/StorageService");
const AlbumLikesService = require("./services/postgres/AlbumLikeService");
// cache
const CacheService = require("./services/redis/CacheService");

const SongsValidator = require("./validator/songs");
const AlbumsValidator = require("./validator/albums");
const UsersValidator = require("./validator/users");
const AuthenticationsValidator = require("./validator/authentications");
const PlaylistsValidator = require("./validator/playlists");
const CollaborationsValidator = require("./validator/collaborations");
const ExportsValidator = require("./validator/exports");

const ClientError = require("./exceptions/ClientError");
const TokenManager = require("./tokenize/TokenManager");

const _exports = require("./api/exports");

const init = async () => {
  const cacheService = new CacheService();
  const songsService = new SongsService();
  const albumsService = new AlbumsService(songsService);
  const usersService = new UsersService();
  const authenticationsService = new AuthenticationsService();
  const collaborationsService = new CollaborationsService();
  const playlistsService = new PlaylistsService(collaborationsService);
  const playlistSongActivitiesService = new PlaylistSongActivitiesService();
  const storageService = new StorageService(path.resolve(__dirname, "api/albums/file/images"));
  const albumLikesService = new AlbumLikesService(cacheService);

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ["*"],
      },
    },
  });

  // registrasi plugin eksternal
  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    },
  ]);

  // mendefinisikan strategy autentikasi jwt
  server.auth.strategy("open_music_jwt", "jwt", {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: albums,
      options: {
        service: albumsService,
        storageService,
        validator: AlbumsValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: usersService,
        validator: UsersValidator,
      },
    },
    {
      plugin: songs,
      options: {
        service: songsService,
        validator: SongsValidator,
      },
    },
    {
      plugin: playlists,
      options: {
        playlistsService,
        playlistSongActivitiesService,
        validator: PlaylistsValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationsService,
        usersService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        playlistsService,
        usersService,
        validator: CollaborationsValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        service: ProducerService,
        playlistsService,
        validator: ExportsValidator,
      },
    },
    {
      plugin: playlistSongActivities,
      options: {
        playlistSongActivitiesService,
        playlistsService,
      },
    },
    {
      plugin: albumLikes,
      options: {
        service: albumLikesService,
        albumsService,
      },
    },
  ]);

  server.ext("onPreResponse", (request, h) => {
    // Mendapatkan konteks response dari request
    const { response } = request;
    if (response instanceof Error) {
      // Penanganan client error secara internal.
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: "fail",
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }

      // Mempertahankan penanganan client error oleh hapi secara native, seperti 404, etc.
      if (!response.isServer) {
        return h.continue;
      }

      // Penanganan server error sesuai kebutuhan
      const newResponse = h.response({
        status: "error",
        message: response.message,
      });
      newResponse.code(500);
      return newResponse;
    }

    // Jika bukan error, lanjutkan dengan response sebelumnya (tanpa terintervensi)
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();