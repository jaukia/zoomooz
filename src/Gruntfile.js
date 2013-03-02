module.exports = function(grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['js/sylvester.src.stripped.js','js/purecssmatrix.js','js/jquery.zoomooz-helpers.js','js/jquery.zoomooz-anim.js','js/jquery.zoomooz-core.js', 'js/jquery.zoomooz-zoomTarget.js','js/jquery.zoomooz-zoomContainer.js','js/jquery.zoomooz-zoomButton.js'],
        dest: '../jquery.<%= pkg.name %>.js'
      }
    },

    uglify: {
      options: {

      },
      dist: {
        files: {
          '../jquery.<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },

    jshint: {
      files: ['js/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          module: true,
          document: true
        }
      }
    },

    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint']
    }

  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('test', ['jshint']);

  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};