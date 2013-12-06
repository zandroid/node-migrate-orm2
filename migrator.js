exports.run = function(connection){

//this file has been copied from https://github.com/visionmedia/node-migrate/blob/master/bin/migrate
  /**
   * Module dependencies.
   */

  var migrate = require('../').migratePatch
    , join = require('path').join
    , fs = require('fs');

  /**
   * Arguments.
   */

  var args = process.argv.slice(2);

  /**
   * Option defaults.
   */

  var options = { args: [] };

  /**
   * Current working directory.
   */

  var cwd;

  /**
   * Usage information.
   */

  var usage = [
    ''
    , '  Usage: orm2-migrate [options] [command]'
    , ''
    , '  Options:'
    , ''
    , '     -c, --chdir <path>   change the working directory'
    , ''
    , '  Commands:'
    , ''
    , '     down   [name]    migrate down till given migration'
    , '     up     [name]    migrate up till given migration (the default command)'
    , '     create [title]   create a new migration file with optional [title]'
    , ''
  ].join('\n');

  /**
   * Migration template.
   */

  var template = [
    ''
    , 'exports.up = function(next){'
    , '  next();'
    , '};'
    , ''
    , 'exports.down = function(next){'
    , '  next();'
    , '};'
    , ''
  ].join('\n');

// require an argument

  function required() {
    if (args.length) return args.shift();
    abort(arg + ' requires an argument');
  }

// abort with a message

  function abort(msg) {
    console.error('  %s', msg);
    process.exit(1);
  }

// parse arguments

  var arg;
  while (args.length) {
    arg = args.shift();
    switch (arg) {
      case '-h':
      case '--help':
      case 'help':
        console.log(usage);
        process.exit();
        break;
      case '-c':
      case '--chdir':
        process.chdir(cwd = required());
        break;
      default:
        if (options.command) {
          options.args.push(arg);
        } else {
          options.command = arg;
        }
    }
  }

  /**
   * Load migrations.
   */

  function migrations() {
    return fs.readdirSync('migrations').filter(function(file){
      return file.match(/^\d+.*\.js$/);
    }).sort().map(function(file){
        return 'migrations/' + file;
      });
  }

  /**
   * Log a keyed message.
   */

  function log(key, msg) {
    console.log('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, msg);
  }

  /**
   * Slugify the given `str`.
   */

  function slugify(str) {
    return str.replace(/\s+/g, '-');
  }

// create ./migrations

  try {
    fs.mkdirSync('migrations', 0774);
  } catch (err) {
    // ignore
  }

// commands

  var commands = {

    /**
     * up [name]
     */

    up: function(migrationName){
      performMigration('up', migrationName);
    },

    /**
     * down [name]
     */

    down: function(migrationName){
      performMigration('down', migrationName);
    },

    /**
     * create [title]
     */

    create: function(){
      var migrations = fs.readdirSync('migrations').filter(function(file){
        return file.match(/^\d+/);
      }).map(function(file){
          return parseInt(file.match(/^(\d+)/)[1], 10);
        }).sort(function(a, b){
          return a - b;
        });

      var curr = pad((migrations.pop() || 0) + 1)
        , title = slugify([].slice.call(arguments).join(' '));
      title = title ? curr + '-' + title : curr;
      create(title);
    }
  };

  /**
   * Pad the given number.
   *
   * @param {Number} n
   * @return {String}
   */

  function pad(n) {
    return Array(4 - n.toString().length).join('0') + n;
  }

  /**
   * Create a migration with the given `name`.
   *
   * @param {String} name
   */

  function create(name) {
    var path = 'migrations/' + name + '.js';
    log('create', join(cwd, path));
    fs.writeFileSync(path, template);
  }

  /**
   * Perform a migration in the given `direction`.
   *
   * @param {Number} direction
   */

  function performMigration(direction, migrationName) {
    migrate('migrations/.migrate');
    migrations().forEach(function(path){
      var mod = require(process.cwd() + '/' + path);
      migrate(path, mod.up, mod.down);
    });

    var set = migrate();

    set.on('migration', function(migration, direction){
      log(direction, migration.title);
    });

    set.on('save', function(){
      log('migration', 'complete');
      process.exit();
    });

    var migrationPath = migrationName
      ? join('migrations', migrationName)
      : migrationName;

    set[direction](null, migrationPath);
  }

// invoke command

  var command = options.command || 'up';
  if (!(command in commands)) abort('unknown command "' + command + '"');
  command = commands[command];
  command.apply(this, options.args);


}
