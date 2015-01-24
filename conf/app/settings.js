module.exports = {
  appName: 'DarkSolar Control Panel',
  cookie_secret: '3b87c523e6b8f22f477add85096d64bb',
  DSDb: 'mongodb://127.0.0.1/darksolar',
  RadiusDb: 'tcp://radiusadmin:rq0klUUsMHUk@localhost/radius',

  Ldap: {
    url: 'ldap://192.168.12.2:389',
    bindDN: 'cn=admin,dc=rahunas,dc=org',
    bindCredentials: 'P@ssw0rd',
    base: 'dc=rahunas,dc=org',
    profiles: 'ou=profiles',
    users: 'ou=users',
    macauth: 'ou=macauth'
  },

  accesscodeKey: '9b81c523e7b8f32f477addbeef6d64ff',

  RahuNASMap: {
    '192.168.122.66': {
      host: '127.0.0.1',
      port: '8123',
    }
  },

  ssl: {
    privatekey: 'conf/cert/rahunas.org.key',
    certificate: 'conf/cert/rahunas.org.crt',
    ca: 'conf/cert/ca-bundle.pem',
  }
};
