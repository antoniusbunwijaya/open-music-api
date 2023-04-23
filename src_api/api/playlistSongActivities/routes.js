const routes = (handler) => [
  {
    method: "GET",
    path: "/playlists/{id}/activities",
    handler: handler.getPlaylistSongActivitiesHandler,
    options: {
      auth: "open_music_jwt",
    },
  },
];

module.exports = routes;