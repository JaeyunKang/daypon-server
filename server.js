var minifyHTML = require('express-minify-html');
var minify = require('express-minify');
var express = require('express'); 
var compression = require('compression');
var app = express();
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session');

app.use(bodyParser({limit:'50mb'}))
app.use(bodyParser.urlencoded({
	extended : true
}));
app.use(bodyParser.json());

const session = cookieSession({
    name: 'session',
    keys: ['hello', 'world'],
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours,
    autoSave: true
})
app.use(session)

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/public'));

app.use(compression());
app.use(minify({
	cache: false,
	uglifyJsModule: null,
	errorHandler: null,
	jsMatch: /\.js$/,
	cssMatch: /\.css$/,
	jsonMatch: /json/,
	sassMatch: /scss/,
	lessMatch: /less/,
	stylusMatch: /stylus/,
	coffeeScriptMatch: /coffeescript/,
}));

app.use(minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true
    }
}));

var router = require('./router/main')(app);

var server = app.listen(3000, function() {
    console.log("Express server")
});
