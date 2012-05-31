module.exports = {
  appName: 'DarkSolar Control Panel',
  cookie_secret: '3b87c523e6b8f22f477add85096d64bb',
  DSDb: 'mongodb://127.0.0.1/darksolar',
  RadiusDb: 'tcp://radiusadmin:3CEAD82gxD0d@localhost/radius',
  StoreDb: {
    url: 'mongodb://127.0.0.1:27017/store/sessions',
    auto_reconnect: true,
    clear_interval: 60,
  },
};
