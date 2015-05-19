module.exports = function (grunt) {
  grunt.initConfig ({
    pkg: grunt.file.readJSON ('package.json'),

    jshint: {
      files: [
        '*.js',
        'api/*.js',
        'api/**/*.js',
        'public/js/*.js',
        'public/js/**/*.js',
      ],
      options: {
        jquery: true,
        multistr: true
      }
    },

    watch: {
      app: {
        files: [
          'app.js',
          'api/*.js',
          'api/**/*.js',
          'views/*.jade',
          'public/js/*.js',
          'public/js/**/*.js',
          'public/help/*.js',
          'public/help/**/*.js',
        ],
        tasks: [ 'jshint', 'jadeUsemin', 'develop' ],
        options: {
          nospawn: true,
          atBegin: true
        }
      }
    },

    develop: {
      server: {
        file: 'app.js',
        env: { NODE_ENV: 'development' }
      }
    },

    jadeUsemin: {
      scripts: {
        options: {
          tasks: {
            js: [ 'concat', 'uglify' ]
          }
        },
        files: [
          { src: 'views/layout.jade', dest: 'views-min/layout.jade' },
          { src: 'views/password.jade', dest: 'views-min/password.jade' },
          { src: 'views/help.jade', dest: 'views-min/help.jade' },
          { src: 'views/help_layout.jade', dest: 'views-min/help_layout.jade' },
          { src: 'views/index.jade', dest: 'views-min/index.jade' },
          { src: 'views/login.jade', dest: 'views-min/login.jade' },
          { src: 'views/register.jade', dest: 'views-min/register.jade' },
          { src: 'views/register_layout.jade',
            dest: 'views-min/register_layout.jade' }
        ]
      }
    }
  });

  grunt.loadNpmTasks ('grunt-contrib-concat');
  grunt.loadNpmTasks ('grunt-contrib-uglify');
  grunt.loadNpmTasks ('grunt-contrib-jshint');
  grunt.loadNpmTasks ('grunt-contrib-watch');
  grunt.loadNpmTasks ('grunt-jade-usemin');
  grunt.loadNpmTasks ('grunt-develop');

  grunt.registerTask ('default', [ 'watch:app' ]);
  grunt.registerTask ('build', [ 'jshint', 'jadeUsemin' ]);
};
