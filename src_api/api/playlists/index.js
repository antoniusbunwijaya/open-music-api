const PlaylistsHandler = require("./handler");

const routes = require("./routes");

module.exports = {
  name: "playlists",
  version: "1.0.0",
  async register(
    server,
    {
      playlistsService,
      playlistSongActivitiesService,
      validator,
    },
  ) {
    const playlistsHandler = new PlaylistsHandler(
      playlistsService,
      playlistSongActivitiesService,
      validator,
    );
    server.route(routes(playlistsHandler));
  },
};