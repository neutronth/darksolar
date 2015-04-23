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
          'views/*.jade'
        ],
        tasks: [ 'jadeUsemin', 'develop' ],
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
          { src: 'views/password.jade', dest: 'views-min/password.jade' }
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

  grunt.registerTask ('default', [ 'jshint', 'watch:app' ]);
  grunt.registerTask ('build', [ 'jshint', 'jadeUsemin' ]);
};
