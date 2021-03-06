var express = require('express'),
    wrap = require('../index'),
    should = require('should'),
    request = require('supertest');

function asyncText(err, text, cb) {
  setImmediate(function() {
    cb(err, text);
  });
}

function thunk(err, text) {
  return function(cb) {
    asyncText(err, text, cb);
  };
}

describe('co-express', function() {
  it('supports a single generator route', function(done) {
    var app = express();

    app.get('/', wrap(function* (req, res, next) {
      res.send('it works!');
    }));

    request(app)
      .get('/')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.equal('it works!');
        done();
      });
  });

  it('supports multiple generator routes', function(done) {
    var app = express();

    app.get('/', wrap(function* (req, res, next) {
      req.val = yield thunk(null, 'thunk');
      next();
    }), wrap(function* (req, res, next) {
      req.val += yield thunk(null, 'thunk');
      next();
    }), wrap(function* (req, res) {
      res.send(req.val + 'func');
    }));

    request(app)
      .get('/')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.equal('thunkthunkfunc');
        done();
      });
  });

  it('doesn\'t alter application object', function(done) {
    var app = express();

    app.get('/', wrap(function* (req, res, next) {
      res.send('it works!');
    }));

    app.set('it', 'works!');

    request(app)
      .get('/')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.equal('it works!');
        app.get('it').should.equal('works!');
        done();
      });
  });

  it('passes uncaught exceptions', function(done) {
    var app = express();

    app.get('/', wrap(function* (req, res, next) {
      var val = yield thunk(new Error('thunk error'));
      res.send(val);
    }));

    app.use(function(err, req, res, next) {
      if (err && err.message === 'thunk error') {
        res.send('caught');
      } else {
        next(err);
      }
    });

    request(app)
      .get('/')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.equal('caught');
        done();
      });
  });

  it('supports error routes', function(done) {
    var app = express();

    app.get('/', wrap(function* (req, res, next) {
      var val = yield thunk(new Error('thunk error'));
      res.send(val);
    }));

    app.use(wrap(function* (err, req, res, next) {
      if (err && err.message === 'thunk error') {
        res.send('caught');
      } else {
        next(err);
      }
    }));

    request(app)
      .get('/')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.equal('caught');
        done();
      });
  });

  it('supports app.route()', function(done) {
    var app = express();

    var books = app.route('/books');

    books.get(wrap(function* (req, res, next) {
      req.val = yield thunk(null, 'thunk');
      next();
    }), wrap(function* (req, res, next) {
      req.val += yield thunk(null, 'thunk');
      next();
    }), wrap(function* (req, res) {
      res.send(req.val + 'func');
    }));


    request(app)
      .get('/books')
      .end(function(err, res) {
        should.not.exist(err);
        res.text.should.equal('thunkthunkfunc');
        done();
      });
  });
});
