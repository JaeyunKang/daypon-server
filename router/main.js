var mysql = require('mysql');
var request = require('request');

var hashMap = {}

var client = mysql.createConnection({
    host: 'ec2-13-125-55-125.ap-northeast-2.compute.amazonaws.com',
    user : 'root',
    password : 'hansol64',
    database : 'daypon',
    multipleStatements: true,
});

setInterval(function () {
    client.query('SELECT 1');
}, 5000);

const accountSid = 'AC2fe0ec035be3a1ba40a317a05d374d8e';
const authToken = 'fa3efa3e5b69256ed5e8cfae53e767e2';
const twilioClient = require('twilio')(accountSid, authToken);

module.exports = function(app)
{
    app.get('/', function (req,res) {
        res.render('index', {
            title: "프로그라피",
			url: req.protocol + '://' + req.headers.host + req.url
        })
    });
    app.get('/about', function (req,res) {
        res.render('about', {
            title: "프로그라피 소개",
			url: req.protocol + '://' + req.headers.host + req.url
        })
    });
    app.get('/activity', function (req, res) {
      res.render('activity', {
            title: "공식활동",
			url: req.protocol + '://' + req.headers.host + req.url
        })
    });
    app.get('/product', function (req, res) {
        res.render('product', {
            title: "포트폴리오",
			url: req.protocol + '://' + req.headers.host + req.url
        })
    });
    app.get('/history', function (req, res) {
        res.render('history', {
            title: "히스토리",
			url: req.protocol + '://' + req.headers.host + req.url
        })
    });

    app.post('/shop', function (req, res) {
        var sql = `SELECT id, name, visit_num, location, description, notice, naver_url, address, opening1, opening2, opening3, opening4, opening5, opening6, opening7, opening_notice, sub_img_num, lat, lng FROM shops`;
        client.query(sql, function (error, results) {
            if (error){
                console.log(error);
            } else {
                c_results = []
                for (var i = 0; i < results.length; i++) {
                    var sql = `SELECT id, name, img_url FROM coupons WHERE shop_id = ? and active = 1`
                    client.query(sql, [results[i].id], function (error, coupons) {
                        if (error){
                            console.log(error);
                        } else {
                            c_results.push(coupons);
                            if (c_results.length == results.length) {
                                res.send({'results': results, 'c_results': c_results});
                            }
                        }
                    });
                }
            }
        });
    });

    app.post('/coupon-check', function (req, res) {
        var userId = req.body.user_id;
        var shopId = req.body.shop_id;

        require('date-utils');
        var date = new Date();
        date.setHours(date.getHours() + 9); 
        var time = date.toFormat('YYYY-MM-DD');
        var startTime = time + ' 00:00:00';
        var endTime = time + ' 23:59:59';

        var sql = `SELECT * FROM coupon_use, coupons WHERE coupons.id = coupon_use.coupon_id and user_id = ? and shop_id = ? and used_at > ? and used_at < ?`;
        client.query(sql, [userId, shopId, startTime, endTime], function (error, results) {
            if (error){
                console.log(error);
            } else {
                if (results.length == 0) {
                    res.send("0");
                } else {
                    res.send("1");
                }
            }
        });
    });

    app.post('/coupon-use', function (req, res) {
        var userId = req.body.user_id;
        var couponId = req.body.coupon_id;

        require('date-utils');
        var date = new Date();
        date.setHours(date.getHours() + 9); 
        var time = date.toFormat('YYYY-MM-DD HH:MI:SS');

        var sql = `INSERT INTO coupon_use (user_id, coupon_id, used_at) values (?, ?, ?)`;
        client.query(sql, [userId, couponId, time], function (error, results) {
            if (error){
                console.log(error);
            } else {
                res.send(200);
            }
        });
    });

    app.post('/membership-check', function (req, res) {

        var userId = req.body.user_id

        var sql = `SELECT created_at, price, pay_method FROM memberships WHERE user_id = ? ORDER BY created_at DESC`;
        client.query(sql, [userId], function (error, results) {
            if (error){
                console.log(error);
            } else {
                if (results.length != 0) {
                    res.send({"results": results, "exist": 1});
                } else {
                    res.send({"results": null, "exist": 0});
                }
            }
        });
    });

    app.post('/past-coupon-check', function (req, res) {

        var userId = req.body.user_id

        var sql = `SELECT coupons.name AS cname, img_url, shops.name AS sname, used_at FROM shops, coupons, coupon_use WHERE user_id = ? AND shop_id = shops.id AND coupon_id = coupons.id ORDER BY used_at DESC`;
        client.query(sql, [userId], function (error, results) {
            if (error){
                console.log(error);
            } else {
                if (results.length != 0) {
                    res.send({"results": results, "exist": 1});
                } else {
                    res.send({"results": null, "exist": 0});
                }
            }
        });
    });

    app.post('/active-membership-check', function (req, res) {
        
        var userId = req.body.user_id
        var sql = `SELECT created_at, price FROM memberships WHERE user_id = ? ORDER BY created_at DESC`;
        client.query(sql, [userId], function (error, results) {
            if (error){
                console.log(error);
            } else {
                if (results.length != 0) {
                    
                    require('date-utils');
                    var date = new Date();
                    date.setHours(date.getHours() + 9);
                    var membershipStartTime = results[0].created_at;
                    var membershipEndTime = results[0].created_at;
                    membershipEndTime.setMonth(membershipEndTime.getMonth() + 1);
                    membershipEndTime.setHours(23);
                    membershipEndTime.setMinutes(59);
                    membershipEndTime.setSeconds(59);
                    if (membershipEndTime >= date){
                        res.send({"active": 1});
                    } else {
                        res.send({"active": 0});
                    }

                } else {
                    res.send({"active": 0});
                }
            }
        });
    });

    app.post('/login', function (req, res) {
        var userId = req.body.user_id
        var userPassword = req.body.user_password

        var sql = `SELECT encrypted_password, salt FROM users WHERE id = ?`;
        client.query(sql, [userId], function (error, results) {
            if (error){
                console.log(error);
            } else {
                if (results.length == 0) {
                    res.send({"error": 1});
                } else {
                    result = results[0];
                    passwordHash = sha256(userPassword, result.salt).passwordHash
                    if (result.encrypted_password == passwordHash) {
                        res.send({"error": 0});
                    } else {
                        res.send({"error": 1});
                    }
                }
            }
        });
    });

    var crypto = require('crypto');
    var sha256 = function(password, salt){
        var hash = crypto.createHmac('sha256', salt)
        hash.update(password);
        var value = hash.digest('hex');
        return {
            salt:salt,
            passwordHash:value
        };
    };
    
    app.post('/version-check', function (req, res) {
        res.send({"version": 4});
    });

    app.post('/version-check-ios', function (req, res) {
        res.send({"version": 1.0});
    });

    app.post('/email-check', function (req, res) {
        var userId = req.body.user_id;
        var sql = `SELECT * FROM users WHERE id = ?`;
        client.query(sql, [userId], function (error, results) {
            if (error){
                console.log(error);
            } else {
                if (results.length == 0){
                    res.send({'msg': '사용가능한 이메일입니다!', 'success': 1});
                } else {
                    res.send({'msg': '이미 등록된 이메일입니다!', 'success': 0});
                }
            }
        });
    });

    phoneNumberCheckMap = {}
    phoneNumberConfirmMap = {}
    app.post('/phone-number-check', function (req, res) {
        var phoneNumber = req.body.phone_number;

        var sql = `SELECT * FROM users WHERE phone = ?`; 
        client.query(sql, [phoneNumber], function (error, results) {
            if (error) {
                console.log(error);
            } else {
                if (results.length != 0) {
                    res.send({'msg': '이미 회원가입에 사용된 번호입니다!'});
                } else {
                    var code = Math.floor(Math.random() * (899999)) + 100000;
                    twilioClient.messages
                        .create({
                            body: '인증번호: ' + String(code),
                            from: '+15405795853',
                            to: '+82' + phoneNumber.substring(1)
                        })
                        .then(function(message) {
                            phoneNumberCheckMap[phoneNumber] = code;
                            setTimeout(function() {
                                delete phoneNumberCheckMap[phoneNumber];
                            }, 600000);
                            console.log(phoneNumberCheckMap);
                            res.send({'msg': '인증번호가 발송되었습니다! 인증번호는 10분간 유효합니다.'});

                        }, function(error) {
                            res.send({'msg': '올바른 번호를 입력해주세요'});
                        })
                        .done()
                }
            }
        });
    });
    
    app.post('/confirm-number-check', function (req, res) {
        var phoneNumber = req.body.phone_number;
        var confirmNumber = req.body.confirm_number;
        
        if (phoneNumberCheckMap[phoneNumber] == confirmNumber) {
            phoneNumberConfirmMap[phoneNumber] = 1
            setTimeout(function () {
                delete phoneNumberConfirmMap[phoneNumber];
            }, 600000);
            console.log(phoneNumberConfirmMap);
            res.send({'msg': '인증에 성공하였습니다!', 'success': 1});
        } else {
            res.send({'msg': '인증에 실패하였습니다!', 'success': 0});
        }
    });

    app.post('/register', function (req, res) {
        var userId = req.body.user_id;
        var userPassword = req.body.user_password;
        var salt = crypto.randomBytes(5).toString('hex');
        var passwordHash = sha256(userPassword, salt).passwordHash;
        var phoneNumber = req.body.phone_number;
        var alertAgree = req.body.alert_agree;
        if (alertAgree) {
            alertAgree = 1;
        } else {
            alertAgree = 0;
        }
        var sql = `INSERT INTO users (id, encrypted_password, salt, phone, alert_agree, gender, birth) VALUES (?, ?, ?, ?, ?, ?, ?);`
        client.query(sql, [userId, passwordHash, salt, phoneNumber, alertAgree, 2, 19991111], function (error, results) {
            if (error) {
                console.log(error);
            } else {
                res.send({'msg': 'hello', 'success': 1});
            }
        });
    });

    app.post('/gender-update', function (req, res) {
        var gender = req.body.gender;
        var userId = req.body.user_id;

        var sql = `UPDATE users SET gender = ? WHERE id = ?;`;
        client.query(sql, [gender, userId], function (error, results) {
            if (error) {
                console.log(error);
            } else {
                res.send({'msg': 'gender updated'});
            }
        });
    });

    app.post('/birth-update', function (req, res) {
        var birth = req.body.birth;
        var userId = req.body.user_id;

        var sql = `UPDATE users SET birth = ? WHERE id = ?;`;
        client.query(sql, [birth, userId], function (error, results) {
            if (error) {
                console.log(error);
            } else {
                res.send({'msg': 'birth updated'});
            }
        });
    });

    app.post('/membership-apply', function (req, res) {
        var userId = req.body.user_id;
        var price = req.body.price;
        var pay_method = req.body.pay_method;
        var token = req.body.token;
        var sql = `INSERT INTO memberships (user_id, price, pay_method, token) VALUES (?, ?, ?, ?);`
        client.query(sql, [userId, price, pay_method, token], function (error, results) {
            if (error) {
                console.log(error);
            } else {
                res.send({'success': 1});
            }
        });
    });

    app.post('/phone-number-check-findid', function (req, res) {
        var phoneNumber = req.body.phone_number;
        var code = Math.floor(Math.random() * (899999)) + 100000;
        twilioClient.messages
            .create({
                body: '인증번호: ' + String(code),
                from: '+15405795853',
                to: '+82' + phoneNumber.substring(1)
            })
            .then(function(message) {
                phoneNumberCheckMap[phoneNumber] = code;
                setTimeout(function() {
                    delete phoneNumberCheckMap[phoneNumber];
                }, 600000);
                console.log(phoneNumberCheckMap);
                res.send({'msg': '인증번호가 발송되었습니다! 인증번호는 10분간 유효합니다.'});

            }, function(error) {
                res.send({'msg': '올바른 번호를 입력해주세요'});
            })
            .done()

    });
 

    app.post('/find-id', function (req, res) {
        var phoneNumber = req.body.phone_number;
        var sql = `SELECT id FROM users WHERE phone = ?`;
        client.query(sql, [phoneNumber], function (error, results) {
            if (error) {
                console.log(error);
            } else if (results.length == 0) {
                res.send({'exists': 0});
            } else {
                res.send({'exists': 1, 'user_id': results[0].id});
            }
        });
    });
 
    app.post('/set-password', function (req, res) {
        var userId = req.body.user_id;
        var userPassword = req.body.user_password;
        var salt = crypto.randomBytes(5).toString('hex');
        var passwordHash = sha256(userPassword, salt).passwordHash;
        var sql = `UPDATE users set encrypted_password = ?, salt = ? WHERE id = ?;`
        client.query(sql, [passwordHash, salt, userId], function (error, results) {
            if (error) {
                console.log(error);
            } else {
                res.send({'success': 1});
            }
        });
    });
    
    app.get('/auth', function (req, res) {
        var code = req.query.code;
        res.send(code);
    });

    app.post('/kakaopay', function(req, res) {
        
        var user_id = req.body.user_id;
        var date = new Date();
        var salt = crypto.randomBytes(5).toString('hex');
        var hash = sha256(date.getTime().toString(), salt).passwordHash;
        var order_id = hash.substring(0,100); 

        var options = {
            url: "https://kapi.kakao.com/v1/payment/ready",
            method: 'POST',
            headers: {Authorization: 'KakaoAK 293029a2b62b6139c3026fd6795067f9'},
            form: {
                cid: 'TC0ONETIME',
                partner_order_id: order_id,
                partner_user_id: user_id,
                item_name: 'Daypon 멤버십',
                quantity: '1',
                total_amount: '2200',
                vat_amount: '200',
                tax_free_amount: '0',
                approval_url: 'http://13.125.229.56/kakaopay/success?order_id='+order_id,
                fail_url: 'http://13.125.229.56/kakaopay/fail',
                cancel_url: 'http://13.125.229.56/kakaopay/cancel'
            }
        }


        request(options, function (error, response, body) {
            console.log(body);
            if (!error && response.statusCode == 200) {

                var info = JSON.parse(body);
                var tid = info.tid;
                var timestamp = info.created_at;

                var sql = `INSERT INTO payment (order_id, tid, user_id, timestamp) values (?, ?, ?, ?)`;
                client.query(sql, [order_id, tid, user_id, timestamp], function (error, results) {
                    if (error){
                        console.log(error);
                    } else {
                        res.send({"direct_url": info.next_redirect_app_url});
                    }
                });
            } else {
                console.log(error);
            }
        })
    });

    app.get('/kakaopay/success', function (req, res) {

        var pg_token = req.query.pg_token;
        var order_id = req.query.order_id;

        var sql = `SELECT tid, user_id FROM payment WHERE order_id = ?`;
        client.query(sql, [order_id], function (error, results) {
            if (error){
                console.log(error);
            } else {
                var tid = results[0].tid;
                var user_id = results[0].user_id;

                var options = {
                    url: "https://kapi.kakao.com/v1/payment/approve",
                    method: 'POST',
                    headers: {Authorization: 'KakaoAK 293029a2b62b6139c3026fd6795067f9'},
                    form: {
                        cid: 'TC0ONETIME',
                        tid: tid,
                        partner_order_id: order_id,
                        partner_user_id: user_id,
                        pg_token: pg_token
                    }
                }

                request(options, function (error, response, body) {
                    console.log(body);
                    var info = JSON.parse(body);
                    var aid = info.aid;
                    var amount = info.amount;
                    var price = amount.total;

                    if (!error && response.statusCode == 200) {
                        var sql = `UPDATE payment SET pg_token = ?, aid = ? WHERE order_id = ?`;
                        client.query(sql, [pg_token, aid, order_id],  function (error, results) {
                            if (error){
                                console.log(error);
                            } else {
                                var sql = `INSERT INTO memberships (user_id, price, pay_method) values (?, ?, ?)`;
                                client.query(sql, [user_id, price, "kakaopay"], function (error, results) {
                                    if (error){
                                        console.log(error);
                                    } else {
                                        res.send('<script>window.close()</script>');
                                    }
                                });
                            }
                        });

                    } else {
                        console.log(error);
                    }
                })
            }
        });
    });

    app.get('/kakaopay/fail', function (req, res) {
    });

    app.get('/kakaopay/cancel', function (req, res) {
    });


const getUserProfileAndMatchings = async (userId) => {
  const user = await getUser(userId)
  const userInfo = {
    name: user.name,
    phone: user.phone,
    profileImg: user.profileImg
  }
  let teams = await getTeamsByUserId(userId)
  const matchings = []
  for (const team of teams) {
    const matchingOfTeam = await getMatchingByTeamId(team.id)
    matchings = matchings.concat(matchingOfTeam)
  }
  return { userInfo, matchings }
}


} 

