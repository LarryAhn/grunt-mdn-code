'use strict';

var fs = require('fs');
var _ = require('lodash');
var async = require('async');


// 스트링 확장 기능 추가
if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str) {
		return this.indexOf(str) == 0;
	}
}

String.prototype.capitalize = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * 그런트 모듈
 * @param grunt
 */
module.exports = function (grunt) {
	grunt.registerTask('mdn_code', 'Let\'s make all about exception codes :)', function () {
		var done = this.async();
		var options = this.options({});

		var sources = [];
		var datas = {};

		/**
		 * src 값 설정
		 */
		if (typeof options.src === 'string') options.src = [options.src];
		else if (Object.prototype.toString.call(options.src) !== '[object Array]') {
			options.src = [];
		}

		/**
		 * dest 값 설정
		 */
		if (!options.dest) options.dest = './';
		else if (!options.dest.endsWith('/')) options.dest = options.dest + '/';

		/**
		 * ignores 값 설정
		 */
		if (typeof options.ignores === 'string') options.ignores = [options.ignores];
		else if (Object.prototype.toString.call(options.ignores) !== '[object Array]') {
			options.ignores = [];
		}

		/**
		 * types 값 설정
		 */
		if (typeof options.types === 'string') options.types = [options.types];
		else if (Object.prototype.toString.call(options.types) !== '[object Array]') {
			options.types = [];
		}

		/**
		 * root 값 설정
		 */
		if (!options.root) options.root = __dirname;

		/**
		 * 익셉션 파일을 읽기위한 재귀 함수
		 * @param parent
		 * @param callback
		 */
		var pathLoop = function (parent, callback) {
			// 디렉토리 하위 파일목록 리딩
			fs.readdir(parent, function (err, files) {
				if (err) return callback(err);
				// 파일별 루프
				async.each(files, function (file, done2) {
					// 읽을 파일 경로 설정
					var filePath = parent + '/' + file;
					// 무시파일별 루프
					async.each(options.ignores, function (ignore, done3) {
						// 무시 파일이 아니면 진행
						if (filePath != options.root + '/' + ignore) {
							// 파일 타입 구분
							fs.stat(filePath, function (err, stats) {
								if (err) return done3(err);
								// 파일이면
								if (stats.isFile()) {
									// 소스 경로 루프
									async.each(options.src, function (src, done4) {
										// 소스 경로와 일치한다면 소스 목록에 추가
										if (src.test(filePath)) sources.push(filePath);
										done4();
									}, done3);
								}
								// 디렉토리라면
								else if (stats.isDirectory()) {
									// 재귀 루프 동작
									pathLoop(filePath, function (err) {
										if (err) return done3(err);
										done3();
									});
								}
								// 그 밖엔 리턴
								else done3();
							});
						}
						// 무시파일이면 리턴
						else done3();
					}, function (err) {
						if (err) return done2(err);
						done2();
					});
				}, function (err) {
					if (err) return callback(err);
					callback();
				});
			});
		};

		/**
		 * 익셉션 파일 데이터 읽기 함수
		 * @param callback
		 */
		var readFiles = function (callback) {
			// 소스 파일 목록 루프
			async.each(sources, function (source, done2) {
				// 파일 읽기
				var data = require(source);
				// 타입별 저장
				var type = source
						.substring(source.lastIndexOf('/') + 1, source.indexOf('.exception.js'))
						.replace('.', '_');
				datas[type] = data;
				done2();
			}, function (err) {
				if (err) return callback(err);
				callback();
			});
		};

		/**
		 * CSV 파일 생성 함수
		 * @param callback
		 */
		var writeCSV = function (callback) {
			// CSV 테이블 헤더
			var csv = '코드번호,스테이터스,출력 메세지,섦명\n';
			async.waterfall([
				// csv 데이터 입력
				function (next) {
					// 타입별 순서대로 루프
					async.eachSeries(options.types, function (type, done2) {
						// 타입 정리
						var splitedType = type.split(':');
						var typeName = (splitedType[1] || splitedType[0]).replace('_', ' ');
						var typeKey = splitedType[0];
						// 타입명 추가
						csv += typeName.capitalize() + '\n';
						// 로우 추가
						_.forEach(datas[typeKey], function (v, k) {
							csv += v.number + ','
									+ (v.status || '') + ','
									+ (v.msg ? '"' + v.msg + '"' : '') + ','
									+ (v.desc ? '"' + v.desc + '"' : '') + '\n';
						});
						done2();
					}, next);
				},
				// CSV 파일 생성
				function (next) {
					fs.writeFile(options.root + '/../' + options.dest + 'code.csv', csv, 'utf8', function (err) {
						if (err) return next(err);
						next();
					});
				}
			], function (err) {
				if (err) return callback(err);
				callback();
			});
		};

		/**
		 * Confluence용 wiki 파일 생성 함수
		 * @param callback
		 */
		var writeWiki = function (callback) {
			// Wiki 테이블 헤더
			var wiki = '||코드번호||스테이터스||출력 메세지||섦명||\n';
			async.waterfall([
				// wiki 데이터 입력
				function (next) {
					// 타입별 순서대로 루프
					async.eachSeries(options.types, function (type, done2) {
						// 타입 정리
						var splitedType = type.split(':');
						var typeName = (splitedType[1] || splitedType[0]).replace('_', ' ');
						var typeKey = splitedType[0];
						// 타입명 추가
						wiki += '|' + typeName.capitalize() + '| | | |\n';
						// 로우 추가
						_.forEach(datas[typeKey], function (v, k) {
							wiki += '|' + v.number
									+ '|' + (v.status || ' ')
									+ '|' + (v.msg || ' ')
									+ '|' + (v.desc || ' ') + '|\n';
						});
						done2();
					}, next);
				},
				// Wiki 파일 생성
				function (next) {
					fs.writeFile(options.root + '/../' + options.dest + 'code.wiki', wiki, 'utf8', function (err) {
						if (err) return next(err);
						next();
					});
				}
			], function (err) {
				if (err) return callback(err);
				callback();
			});
		};

		/**
		 * 실행
		 */
		pathLoop(options.root, function (err) {
			if (err) return done(err);
			readFiles(function (err) {
				if (err) return done(err);
				async.parallel([
					function (callback) {
						writeCSV(function (err) {
							if (err) return callback(err);
							callback();
						});
					},
					function (callback) {
						writeWiki(function (err) {
							if (err) return callback(err);
							callback();
						});
					}
				], function (err) {
					if (err) return done(err);
					done();
				});
			});
		});
	});
};
'use strict';

var fs = require('fs');
var _ = require('lodash');
var async = require('async');


// 스트링 확장 기능 추가
if (typeof String.prototype.startsWith != 'function') {
	String.prototype.startsWith = function (str) {
		return this.indexOf(str) == 0;
	}
}

String.prototype.capitalize = function () {
	return this.charAt(0).toUpperCase() + this.slice(1);
};

/**
 * 그런트 모듈
 * @param grunt
 */
module.exports = function (grunt) {
	grunt.registerTask('mdn_code', 'Let\'s make all about exception codes :)', function () {
		var done = this.async();
		var options = this.options({});

		var sources = [];
		var datas = {};

		/**
		 * src 값 설정
		 */
		if (typeof options.src === 'string') options.src = [options.src];
		else if (Object.prototype.toString.call(options.src) !== '[object Array]') {
			options.src = [];
		}

		/**
		 * dest 값 설정
		 */
		if (!options.dest) options.dest = './';
		else if (!options.dest.endsWith('/')) options.dest = options.dest + '/';

		/**
		 * ignores 값 설정
		 */
		if (typeof options.ignores === 'string') options.ignores = [options.ignores];
		else if (Object.prototype.toString.call(options.ignores) !== '[object Array]') {
			options.ignores = [];
		}

		/**
		 * types 값 설정
		 */
		if (typeof options.types === 'string') options.types = [options.types];
		else if (Object.prototype.toString.call(options.types) !== '[object Array]') {
			options.types = [];
		}

		/**
		 * root 값 설정
		 */
		if (!options.root) options.root = __dirname;

		/**
		 * 익셉션 파일을 읽기위한 재귀 함수
		 * @param parent
		 * @param callback
		 */
		var pathLoop = function (parent, callback) {
			// 디렉토리 하위 파일목록 리딩
			fs.readdir(parent, function (err, files) {
				if (err) return callback(err);
				// 파일별 루프
				async.each(files, function (file, done2) {
					// 읽을 파일 경로 설정
					var filePath = parent + '/' + file;
					// 무시파일별 루프
					async.each(options.ignores, function (ignore, done3) {
						// 무시 파일이 아니면 진행
						if (filePath != options.root + '/' + ignore) {
							// 파일 타입 구분
							fs.stat(filePath, function (err, stats) {
								if (err) return done3(err);
								// 파일이면
								if (stats.isFile()) {
									// 소스 경로 루프
									async.each(options.src, function (src, done4) {
										// 소스 경로와 일치한다면 소스 목록에 추가
										if (src.test(filePath)) sources.push(filePath);
										done4();
									}, done3);
								}
								// 디렉토리라면
								else if (stats.isDirectory()) {
									// 재귀 루프 동작
									pathLoop(filePath, function (err) {
										if (err) return done3(err);
										done3();
									});
								}
								// 그 밖엔 리턴
								else done3();
							});
						}
						// 무시파일이면 리턴
						else done3();
					}, function (err) {
						if (err) return done2(err);
						done2();
					});
				}, function (err) {
					if (err) return callback(err);
					callback();
				});
			});
		};

		/**
		 * 익셉션 파일 데이터 읽기 함수
		 * @param callback
		 */
		var readFiles = function (callback) {
			// 소스 파일 목록 루프
			async.each(sources, function (source, done2) {
				// 파일 읽기
				var data = require(source);
				// 타입별 저장
				var type = source
						.substring(source.lastIndexOf('/') + 1, source.indexOf('.exception.js'))
						.replace('.', '_');
				datas[type] = data;
				done2();
			}, function (err) {
				if (err) return callback(err);
				callback();
			});
		};

		/**
		 * CSV 파일 생성 함수
		 * @param callback
		 */
		var writeCSV = function (callback) {
			// CSV 테이블 헤더
			var csv = '코드번호,스테이터스,출력 메세지,섦명\n';
			async.waterfall([
				// csv 데이터 입력
				function (next) {
					// 타입별 순서대로 루프
					async.eachSeries(options.types, function (type, done2) {
						// 타입 정리
						var splitedType = type.split(':');
						var typeName = (splitedType[1] || splitedType[0]).replace('_', ' ');
						var typeKey = splitedType[0];
						// 타입명 추가
						csv += typeName.capitalize() + '\n';
						// 로우 추가
						_.forEach(datas[typeKey], function (v, k) {
							csv += v.number + ','
									+ (v.status || '') + ','
									+ (v.msg ? '"' + v.msg + '"' : '') + ','
									+ (v.desc ? '"' + v.desc + '"' : '') + '\n';
						});
						done2();
					}, next);
				},
				// CSV 파일 생성
				function (next) {
					fs.writeFile(options.root + '/../' + options.dest + 'code.csv', csv, 'utf8', function (err) {
						if (err) return next(err);
						next();
					});
				}
			], function (err) {
				if (err) return callback(err);
				callback();
			});
		};

		/**
		 * Confluence용 wiki 파일 생성 함수
		 * @param callback
		 */
		var writeWiki = function (callback) {
			// Wiki 테이블 헤더
			var wiki = '||코드번호||스테이터스||출력 메세지||섦명||\n';
			async.waterfall([
				// wiki 데이터 입력
				function (next) {
					// 타입별 순서대로 루프
					async.eachSeries(options.types, function (type, done2) {
						// 타입 정리
						var splitedType = type.split(':');
						var typeName = (splitedType[1] || splitedType[0]).replace('_', ' ');
						var typeKey = splitedType[0];
						// 타입명 추가
						wiki += '|' + typeName.capitalize() + '| | | |\n';
						// 로우 추가
						_.forEach(datas[typeKey], function (v, k) {
							wiki += '|' + v.number
									+ '|' + (v.status || ' ')
									+ '|' + (v.msg || ' ')
									+ '|' + (v.desc || ' ') + '|\n';
						});
						done2();
					}, next);
				},
				// Wiki 파일 생성
				function (next) {
					fs.writeFile(options.root + '/../' + options.dest + 'code.wiki', wiki, 'utf8', function (err) {
						if (err) return next(err);
						next();
					});
				}
			], function (err) {
				if (err) return callback(err);
				callback();
			});
		};

		/**
		 * 실행
		 */
		pathLoop(options.root, function (err) {
			if (err) return done(err);
			readFiles(function (err) {
				if (err) return done(err);
				async.parallel([
					function (callback) {
						writeCSV(function (err) {
							if (err) return callback(err);
							callback();
						});
					},
					function (callback) {
						writeWiki(function (err) {
							if (err) return callback(err);
							callback();
						});
					}
				], function (err) {
					if (err) return done(err);
					done();
				});
			});
		});
	});
};
