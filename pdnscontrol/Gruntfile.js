module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    sass: {
      options: {
        includePaths: ['static/bower_components/foundation/scss', 'static/bower_components/bourbon/app/assets/stylesheets'],
        sourceComments: 'map'
      },
      dist: {
        options: {
          outputStyle: 'expanded'
        },
        files: {
          'static/stylesheets/app.css': 'static/scss/app.scss'
        }
      }
    },

    watch: {
      grunt: { files: ['Gruntfile.js'] },

      sass: {
        files: 'static/scss/**/*.scss',
        tasks: ['sass']
      }
    }
  });

  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('build', ['sass']);
  grunt.registerTask('default', ['build','watch']);
}
