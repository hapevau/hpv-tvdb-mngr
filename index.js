var tv = require('hpv-tvdb'),
	sqlite = require('sqlite3'), 
	xml2js = require('xml2js'),  
	filewalk = require('file'),
	parser = new xml2js.Parser({explicitArray: false}),
	EventEmitter = require('events').EventEmitter,
	util = require('util'), 
	getfactory = function(who) {
		return function(name) {
			return function(err) {
				if(err) {
					who.emit('error', err);
				} else {
					who.emit('insert', {eventname: name, changes: this.changes, lastid: this.lastID});
				}
			};
		}; // end return
	}, // end factory
	tagMap = { 
			'©alb': 'album',  
			'©nam': 'title',
		    '©ART': 'artist',
		    aART:   'albumArtist',
		    '©grp': 'grouping',
		    trkn:   'tracknum',
		    tvsh:   'TVShowName',
		    tven:   'TVEpisode',
		    tvsn:   'TVSeasonNum',
		    tves:   'TVEpisodeNum',
		    desc:   'description', 
		    ldes:   'longdesc',
		    sonm:   'sortOrder name',
		    soar:   'sortOrder artist',
		    soaa:   'sortOrder albumartist',
		    soal:   'sortOrder album',
		    sosn:   'sortOrder show',
		    disk:   'disk',
		    stik:   'stik',
		    tvnn:   'TVNetwork',
		    '©day': 'year',
		    '©gen': 'genre'
	}; // end tagMap end var     

// ====================== viewer ======================

function Viewer(tvdb) {
	this.db = tvdb; 
	this.getMapping = function(row) {
		var result = {}; 
		for (var prop in row) {
			if(row.hasOwnProperty(prop)){  
				if(tagMap[prop]) result[tagMap[prop]]=row[prop];
			}
		}
		return result;
	};
}  

Viewer.prototype.dbInfos = function(cb) {
	var self = this;
	self.db.all('SELECT * FROM sqlite_master', cb);
};

Viewer.prototype.all = function(cb) {
	var self = this;
	self.db.all('SELECT * FROM series_overview', cb);
};   

Viewer.prototype.series = function(id, cb) {
	var self = this;
	self.db.all('SELECT * FROM series_overview WHERE id=?', id, cb);
};

Viewer.prototype.actors = function(cb) {
	var self = this;
	self.db.all('select distinct name from series_actors', cb);
};     

Viewer.prototype.genres = function(cb) {
	var self = this;
	self.db.all('select distinct genre from series_genres', cb);
};  

Viewer.prototype.allLetters = function(cb) {
	var self = this;
	self.db.all('select substr(name,1,1) as letter, count(*) as series from series group by substr(name,1,1)', cb);
}; 

Viewer.prototype.byLetter = function(letter, cb) {
	var self = this;
	self.db.all('select * from series where substr(name,1,1) =? ORDER BY name',letter, cb);
};

Viewer.prototype.allByGenre = function(genre,cb) {
	var self = this;
	self.db.all('SELECT * FROM series_details WHERE genres like "%'+genre+'%" ORDER BY name', cb);
}; 

Viewer.prototype.allByActor = function(actor,cb) {
	var self = this;
	self.db.all('SELECT * FROM series_details WHERE actors like "%'+actor+'%" ORDER BY name', cb);
};

Viewer.prototype.seriesDetail = function(id, cb) {
	var self = this;
	self.db.all("SELECT * FROM series_details WHERE id=?", id, cb);
};  

Viewer.prototype.imagesSeries = function(id, cb) {
	var self = this;
	self.db.all("SELECT * FROM all_images WHERE seriesid=? ORDER BY imagetype", id, cb);
};  

Viewer.prototype.seasonsDetailSeries = function(id, cb) {
	var self = this;
	self.db.all("SELECT * FROM seasons_overview WHERE seriesid=? ORDER BY cast(seasonnbr as integer)", id, 
	cb);
};

Viewer.prototype.episodesDetailSeries = function(id, cb) {
	var self = this;
	self.db.all("SELECT * FROM episode_details WHERE seriesid=? ORDER BY cast(seasonnbr as integer), cast(episodenbr as integer)", id, 
	cb);
};    

Viewer.prototype.episodesDetailSeason = function(id, cb) {
	var self = this;
	self.db.all("SELECT * FROM episode_details WHERE seasonid=? ORDER BY cast(episodenbr as integer)", id, cb);
};  

Viewer.prototype.episodesTagsBySeriesTitle = function(title, cb, raw) {
	var self = this;       
	if(raw) {
		self.db.all("select * from taglist where tvsh=? ORDER BY tven", title, cb);                                       
	} 
	else {
		self.db.all("select * from taglist where tvsh=? ORDER BY tven", title, function(err, res){
			var result=[];
			if(err && cb) cb(err,null);
			if(!err && cb) {  
				for(var i=0, len=res.length; i<len; i+=1) {
                	result.push(self.getMapping(res[i]));
				}  
				cb(null, result);
			}			
		});
	}	
}; 

Viewer.prototype.episodesTagsBySeriesTitleAndTvEpisodeId = function(title, id, cb, raw) {
	var self = this;
	
	if(raw) {
		self.db.all("select * from taglist where tvsh=? and tven=? ORDER BY tven", title, id, cb);
	} 
	else {
		self.db.all("select * from taglist where tvsh=? and tven=? ORDER BY tven", title, id, function(err, res){
			var result=[];
			if(err && cb) cb(err,null);
			if(!err && cb) {  
				for(var i=0, len=res.length; i<len; i+=1) {
                	result.push(self.getMapping(res[i]));
				}  
				cb(null, result);
			}			
		});
	}
};  

Viewer.prototype.episodePlistByEpisodeId = function(id, cb) {
	var self = this,
		result = {},
		makeDict = function(arr) {
			var s='<dict>\n\t\t\t<key>name</key>\n\t\t\t<string>%s</string>\n\t\t</dict>',
				result='';
			for(var i=0, len=arr.length;i<len;i+=1) {
				result+='\n\t\t' + util.format(s, arr[i]) +((i<len-1) ? '' : '\n');
			} 
			return result;
		};  
	
	self.db.all('select directors, screenwriters, "cast" from plistdata where episodeid=?', id, function(err, res){
		var template ='<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>cast</key>\n\t<array>\t\t%s\t</array>\n\t<key>codirectors</key>\n\t<array/>\n\t<key>directors</key>\n\t<array>\t\t%s\t</array>\n\t<key>producers</key>\n\t<array/>\n\t<key>screenwriters</key>\n\t<array>\t\t%s\t</array>\n\t<key>studio</key>\n\t<string></string>\n</dict>\n</plist>';
		if(res && res.length>0) {
			result['cast'] = makeDict(res[0].cast.split(',')); 
			result['directors'] = makeDict(res[0].directors.split(',')); 
			result['screenwriters'] = makeDict(res[0].screenwriters.split(',')); 
		} 
		if(err) cb(err, null);
		if(!err) cb(null, util.format(template,result.cast, result.directors, result.screenwriters));
	});
};    

Viewer.prototype.getEpisodeIdByTitleAndEpisode = function(title, episode, cb) {
	var self = this;   
	self.db.all('SELECT episodeid FROM taglist where tven=? and tvsh=?', episode, title, function(err, res){
		if(err) cb(err, null);
		if(!err) cb(null, (res.length) ? res[0] : {});
	});
};  

Viewer.prototype.getImagesBySeriesName = function(title, cb) {
	var self = this;   
	self.db.all('select * from all_images where seriesid in (select id from series where name=?)', title, cb);
};

Viewer.prototype.getImagesBySeriesIdAndImageType = function(seriesid, type, cb) {
	var self = this;   
	self.db.all('select * from series_images where seriesid=? AND imagetype=?', [seriesid, type], cb);
}

//================= serializer ===========================
	
function Serializer(tvdb, apiclient){
	this.db = tvdb;   
	this.client = apiclient || new tv.TvDbClient('');
}   

util.inherits(Serializer, EventEmitter);  

Serializer.prototype.deleteSeries = function(id) {
	var self=this;
	
	self.db.run("DELETE FROM series WHERE id=?", id, function(err){
		if(err) self.emit('error', err);  
		if(!err) self.emit('delete', {part: this.changes +' deleted'});
	});
};

Serializer.prototype.saveImageUrls = function(id, bannertypes) {
	var self = this,
		factory = getfactory(self), 
		b,
		stmt; 
	
	self.client.getBannersBySeriesId(id, function(err, res) {
		if(res && bannertypes && bannertypes.length>0) {
			stmt = self.db.prepare("INSERT INTO series_images (seriesid, imagetype, imageurl, language) VALUES(?,?,?,?)"); 
			for(var i=0, len=bannertypes.length; i<len; i+=1) {
				b = res[bannertypes[i]];
				if(b && b.length>0) {
					for(var j=0, len2=b.length;j<len2;j+=1) {
						stmt.run(id, bannertypes[i], b[j].url, b[j].language, factory('image insert'));
					}
				}
			} 
			stmt.finalize(function() {
				if(!err) self.emit('finnished', {part: 'images'});                    
			});
		}
	});
};

Serializer.prototype.saveActors = function(id) {
	var self = this,
		factory = getfactory(self),
		stmt; 
	
	self.client.getActorsBySeriesId(id, function(err, res) {
		if(res && res.length>0) {   
			stmt = self.db.prepare("INSERT INTO series_actors (seriesid, name, role, actorid, imageurl) VALUES(?,?,?,?,?)"); 
			for(var i=0, len=res.length;i<len;i+=1) {
				stmt.run(id, res[i].name,res[i].role, res[i].id, res[i].imageurl, factory('actor insert'));
			} 
			stmt.finalize(function() {
				if(!err) self.emit('finnished', {part: 'actors'});                    
			});
		} // end if
	});
};

Serializer.prototype.saveSeriesInfos = function(id) { 
	var self = this, 
		factory = getfactory(self), 
		doEpisodeArrays=function(episode, stmt, type, callback) {
			for(var a=0, len=episode[type].length; a<len;a+=1) {
				stmt.run(episode.id, episode[type][a], callback);
			}
		};
	
	self.client.getSeasonsBySeriesId(id, function(err, res) {  
		if(res && res.series) {
			self.db.serialize(function() { 
				var stmtSeasons = self.db.prepare("INSERT INTO series_seasons (seriesid, seasonid, seasonnbr) VALUES(?,?,?)"), 
					stmtEpisodes = self.db.prepare("INSERT INTO season_episodes (seasonid, episodeid, episodenbr, name, overview, imageurl, language) VALUES(?,?,?,?,?,?,?)"),
					stmtDirectors = self.db.prepare("INSERT INTO episode_directors (episodeid, name) VALUES(?,?)"),
					stmtGenres = self.db.prepare("INSERT INTO series_genres (seriesid, genre) VALUES(?, ?)"),
					stmtWriters = self.db.prepare("INSERT INTO episode_writers (episodeid, name) VALUES(?,?)"),
					stmtGueststars = self.db.prepare("INSERT INTO episode_gueststars (episodeid, name) VALUES(?,?)"),
					season,
					episode,  
					i=0;         
					
				self.db.run("INSERT INTO series (name, id, overview, network, language, firstaired, rating) VALUES (?,?,?,?,?,?,?)",
					res.series.name,
					res.series.id,
					res.series.overview,
					res.series.network,
					res.series.language,
					res.series.firstaired,
					res.series.rating, function(err) {
						if(err) self.emit('error', err);  
						if(!err) {
							self.emit('finnished', {part: 'series'});   
						}
				 }); // end run   
			   
				for(var x=0, len=res.series.genre.length; x<len; x+=1) {
					stmtGenres.run(res.series.id, res.series.genre[x], factory('genre insert'));
				}  
				stmtGenres.finalize(function() {
					self.emit('finnished', {part: 'genres'});
				});
				i =  (res.seasons['0']) ? 0: 1;
				while(res.seasons[i.toString()]) {      		
					season = res.seasons[i.toString()]; 					
					stmtSeasons.run(res.series.id, season.seasonid, season.seasonnumber,factory('season insert'));
					for(var j=0, len=season.episodes.length; j<len; j+=1) {
						episode=season.episodes[j];
						stmtEpisodes.run(season.seasonid, episode.id, episode.number, episode.name, episode.overview, episode.imageurl, episode.language, factory('episode insert')); 						
						doEpisodeArrays(episode, stmtDirectors, 'directors', factory('director insert')); 
						doEpisodeArrays(episode, stmtWriters, 'writers', factory('writer insert'));  
						doEpisodeArrays(episode, stmtGueststars, 'gueststars', factory('gueststar insert')); 
					}
					i+=1;  
					 				
				} // end while   
				stmtDirectors.finalize(function() {
					self.emit('finnished', {part: 'directors'});
				});
				stmtWriters.finalize(function() {
					self.emit('finnished', {part: 'writers'});
				});
				stmtGueststars.finalize(function() {
					self.emit('finnished', {part: 'gueststars'});
				});
				stmtEpisodes.finalize(function() {
					self.emit('finnished', {part: 'episodes'});
				});
			}); // end serialize
		} // end if   	
	}); // end getSeasonsBySeriesId
}; 

Serializer.prototype.saveSeries = function(id, banners) { 
	var self=this;
	self.saveSeriesInfos(id);
	self.saveActors(id);
	self.saveImageUrls(id, banners);
};    

Serializer.prototype.setOwnGenre = function(seriesid, genre) {
	var self=this; 
	self.db.run("DELETE FROM series_genres WHERE seriesid=?", seriesid, function(err){
		if(err) self.emit('error', err);
		if(!err) {
			self.db.run("INSERT INTO series_genres (seriesid, genre) VALUES(?,?)",[
				seriesid,
				genre,
			], function(err2) { 
				if(err2) self.emit('error', err2); 
				if(!err2) self.emit('genreupdate', {part: 'series_genres'});
			} );
		}
	});
}

// =============== Decorator ==========================

function SerializerDecorator(s) {
	this.serializer = s;   
	this.deleteSeries = function(id, callback) {
		this.serializer.on('delete', function(d) {
			if(callback) callback(null, d);
		});    
		this.serializer.on('error', function(e) {
			callback(e, null);
		 });
		this.serializer.deleteSeries(id);
	};
	this.setOwnGenre = function(seriesid, genre, callback) {
		this.serializer.on('error', function(e) {
			if(callback) callback(e, null);
		 }); 
		this.serializer.on('genreupdate', function(d) {
			if(callback) callback(null, d);
		}); 
		this.serializer.setOwnGenre(seriesid, genre);
	};
	this.saveSeries = function(id, callback, banners) {
		var b=['fanart', 'poster', 'season', 'series'],
		    episodes=false,
			directors=false,
			genres=false,
			writers=false,
			gueststars=false,
			series=false,      
		    infos = false
			images=false,
			actors=false;       
			
		 this.serializer.on('error', function(e) {
			callback(e, null);
		 });   
		
		 this.serializer.on('finnished', function(d){	
			switch(d.part) {
				case "episodes":
					episodes=true;
					break;
				case "directors":
				    directors=true;
					break;
				case "genres":
					genres=true;
					break;
				case "writers":
					writers=true;
					break;
				case "gueststars":
					gueststars=true;
					break;
				case "series":
					series=true;
					break; 
				case "images":
					images=true;
					break; 
				case "actors":
					actors=true;
					break;
			}  // end switch 
			if(episodes && directors && genres && writers && gueststars && series) {
				infos=true;   
			}  
			if(infos && images && actors && callback){
             	callback(null, {status: 'done'});
			};              
		}); // end on 		
		this.serializer.saveSeries(id, banners||b);
	};            
}   

// =========== tvdbmanager =====================  

function dbSetup(filename, createFile){
	var db = new sqlite.Database(filename || 'tvdb.db');
	var fs = require('fs');
	var sql = fs.readFileSync(createFile).toString(); 
	db.exec(sql, function(err) {
	   //console.log('Erstellung '+filename+ ' war nicht moeglich: '+err); 
	});
	return db;
}

function tvdbManager(apikey, tvdb) {
	this.client = new tv.TvDbClient(apikey);
	this.serializer = new SerializerDecorator(new Serializer(tvdb, this.client)); 
	this.viewer = new Viewer(tvdb);
} 

tvdbManager.prototype.searchTvDbCom = function(title, cb) {
	this.client.getSeriesByTitle(title, cb);
};  

tvdbManager.prototype.saveSeriesToDb = function(id, cb) {
	this.serializer.saveSeries(id, cb);
}; 

tvdbManager.prototype.deleteSeriesInDb = function(id, cb) {
	this.serializer.deleteSeries(id, cb);
};   

tvdbManager.prototype.getAllSeriesFromDb = function(cb) {
	this.viewer.all(cb);
};  

tvdbManager.prototype.getAllActorsFromDb = function(cb) {
	this.viewer.actors(cb);
}; 

tvdbManager.prototype.getAllGenresFromDb = function(cb) {
	this.viewer.genres(cb);
}; 

tvdbManager.prototype.getAllSeriesFirstLettersFromDb = function(cb) {
	this.viewer.allLetters(cb);
};  

tvdbManager.prototype.getAllSeriesByFirstLetterFromDb = function(letter, cb) {
	this.viewer.byLetter(letter, cb);
};  

tvdbManager.prototype.getAllSeriesByGenreFromDb = function(genre, cb) {
	this.viewer.allByGenre(genre, cb);
};   

tvdbManager.prototype.getAllSeriesByActorFromDb = function(actorname, cb) {
	this.viewer.allByActor(actorname, cb);
}; 

tvdbManager.prototype.getSeriesDetailBySeriesIdFromDb = function(id, cb) {
	this.viewer.seriesDetail(id, cb);
};  

tvdbManager.prototype.getImagesDetailsBySeriesIdFromDb = function(id, cb) {
	this.viewer.imagesSeries(id, cb);
};    

tvdbManager.prototype.getSeriesOverviewsBySeriesIdFromDb = function(id, cb) {
	this.viewer.series (id, cb);
};

tvdbManager.prototype.getSeasonsDetailsBySeriesIdFromDb = function(id, cb) {
	this.viewer.seasonsDetailSeries(id, cb);
};

tvdbManager.prototype.getEpisodesDetailsBySeriesIdFromDb = function(id, cb) {
	this.viewer.episodesDetailSeries(id, cb);
}; 

tvdbManager.prototype.getEpisodesDetailsBySeasonIdFromDb = function(id, cb) {
	this.viewer.episodesDetailSeason(id, cb);
}; 

tvdbManager.prototype.getTagsBySeriesTitleAndTvEpisodeIdFromDb = function(title, id, cb, raw) {
	this.viewer.episodesTagsBySeriesTitleAndTvEpisodeId(title, id, cb, raw);
}; 

tvdbManager.prototype.getTagsBySeriesTitleFromDb = function(title, cb, raw) {
	this.viewer.episodesTagsBySeriesTitle(title, cb, raw);
};  

tvdbManager.prototype.getEpisodePlistByEpisodeIdeFromDb = function(id, cb) {
	this.viewer.episodePlistByEpisodeId(id, cb);
};

tvdbManager.prototype.getEpisodeIdByTitleAndTvenFromDb = function(title, tven, cb) {
	this.viewer.getEpisodeIdByTitleAndEpisode(title, tven, cb);
};  

tvdbManager.prototype.getImagesByTitleFromDb = function(title, cb) {
	this.viewer.getImagesBySeriesName(title, cb);
};

tvdbManager.prototype.getDbInfos = function(cb) {
	this.viewer.dbInfos(cb);
}; 

tvdbManager.prototype.saveImageFomTheTvDbComToDisk = function(url, filename, cb) {
	var self=this;
	self.client.getImageAndSave(url, filename, cb);
};       

tvdbManager.prototype.setOwnGenre = function(seriesid, genre, cb) {
	this.serializer.setOwnGenre(seriesid, genre, cb);
};      

tvdbManager.prototype.getImagesBySeriesIdAndImageTypeFromDb = function(seriesid, type, cb) {
	this.viewer.getImagesBySeriesIdAndImageType(seriesid, type, cb);
};

tvdbManager.prototype.tagger = function(apPath, title, tven) {
	var self=this,
		getTagOptions = function(data) {
			var s = '', o='';
			for(var prop in data) {
				if(data.hasOwnProperty(prop)) {
					o=(prop.toLowerCase().indexOf('num')>0) 
					   ? '--'+prop+' '+data[prop]
					   : '--'+prop+' "'+data[prop].replace(/"/g,'\\"')+'"';   
					s+=o+' ';
				} // end if
			} // end for
			return s;
		}; // end getTagOptions       
	this.ap = apPath || './AtomicParsley';  
	this.title=title;
	this.tven=tven;   	 	
	return {  
		ap: self.ap,
		title: self.title,
		tven: self.tven, 
		getApCmdPartTags: function(cb) {
			var tags, that=this;
			self.getTagsBySeriesTitleAndTvEpisodeIdFromDb(that.title, that.tven, function(err, res){
				if(err) {
					cb(err, null);
				} else { 
					var tags = getTagOptions(res[0]); 
					cb(null, ' '+tags);
				}
			});
		}, 
		getApCmdPartPlist: function(cb) {
			var plist, that=this;  
			self.getEpisodeIdByTitleAndTvenFromDb(that.title, that.tven, function(err, res) {
				if(err) cb(err, null);
				if(!err) {
					self.getEpisodePlistByEpisodeIdeFromDb(res.episodeid,function(err2, res2) {
						if(err2) cb(err2, null);
						if(!err2) cb(null, ' --rDNSatom ' + '"' + res2.replace(/"/g,'\\"') +'"' + ' name=iTunMOVI domain=com.apple.iTunes '); 
					});  
				}
			});	  
		},
		getApCmdPartCover: function(imagePath, cb) {
			cb(null, ' --artwork '+imagePath);
		}, 
		getApCmdPartRemoveArtwork: function(cb) {
			cb(null, ' --artwork REMOVE_ALL ');
		},
		removeArtwork: function(input, output, cb) {
			var exec = require('child_process').exec, that=this;
			this.getApCmdPartRemoveArtwork(function(err, res) {
				var cmd = that.ap + ' ' + input + res + ((output) ? ' --output '+ output : ' --overWrite');
				exec(cmd, function(err, stdout, stderr) {
					if(err || stderr) {
						cb({err: err, stderr: stderr, cmd: cmd}, null);
					} else {
						cb(null, {method: 'removeArtwork', cmd:cmd, stdout: stdout});
					}
				}); 
			});  			
		},
		tag: function(inp, outp, imgPath, cb) { 
			var input=inp, out=outp, that=this, arr, cmd=that.ap + ' ' + input,
			 	exec = require('child_process').exec;
			if( arguments.length<3 || util.isArray(arguments[0])) { 
				arr = arguments[0] ; 
				for(var i=0, len=arguments[0].length; i<len; i+=1) {  
					that.tven = arr[i].tven;
					that.tag(arr[i].input, arr[i].output, arr[i].image, arguments[1]);
				}
			} else {  				
				this.getApCmdPartTags(function(err, res) {
					if(err) cb(err, null);
					if(!err) {  
						cmd+=res;
						that.getApCmdPartPlist(function(err2, res2) {
							if(err2) cb(err2, null);
							if(!err2) {
								cmd+=res2;  
								that.getApCmdPartCover(imgPath, function(err3, res3){
									if(err3) cb(err3, null);
									if(!err3) {
										cmd +=res3 + ((out) ? ' --output ' + out : '--overWrite'); 
										exec(cmd, function(err4, stdout, stderr) {
											if(err4 || stderr) {
												cb({err: err, stderr: stderr, cmd: cmd}, null);                                                           
											} 
											else { 
												var f = (out) ? out : input;   
												that.util().getTags(f, function (err4, res4) {
													cb(null, {method: 'tag', tags: (err4) ? {} : res4});                  
												});	 
											}
										}); // end exec  
									} // end if !err3
								}); // end getCover
							} // end if !err2
						});  // end Plist
					} // end if !err
				}); // end Tags
			}  // end first else	
		}, // end tag
		util: function() {
			var that=this;  
			return { 
		 	   showImages: function(cb, open, imagetypeFilter) {
					var file =require('path').resolve(__dirname, 'images_'+that.title+".html"),
						figTemplate ='<figure class="%s">\n\t\t<img src="%s" alt="image"/>\n\t\t<figcaption>\n\t\t\t<input txpe="text" readonly value="%s"></input>\n\t\t</figcaption>\n\t</figure>\n\t',
						getFigure = function(data) {
							return util.format(figTemplate, data.imagetype, data.imageurl, data.imageurl);
						},
						figures = {actor: '<h2>Actor</h2>', 
								   fanart: '<h2>Fanart</h2>', 
								   poster: '<h2>Poster</h2>', 
								   season: '<h2>Season</h2>', 
								   series: '<h2>Series</h2>'},
						html='';
					
					self.getImagesByTitleFromDb(that.title, function(err, res){ 
						var type;
						if(!err) {
						   	if(res && res.length>0) {
								for(var i=0, len=res.length; i<len; i+=1) { 
									type = (imagetypeFilter) ? imagetypeFilter : res[i].imagetype; 
									if(figures[res[i].imagetype] && type===res[i].imagetype) {
										figures[res[i].imagetype]+=getFigure(res[i]); 
									} else {
									    figures[res[i].imagetype]='';
									}
								} 
								html=util.format(require('fs').readFileSync('imagehtml.template').toString('utf8'),
									 that.title,
									 figures.actor,
									 figures.fanart,
									 figures.poster,
									 figures.season,
									 figures.series);
								if(open) {         
									require('fs').writeFileSync(file, html);
									require('open')(file);                                      
									cb(null, {url: 'file://'+file, filter: imagetypeFilter, open: true});
								} else {
									cb(null, {html: html, filter: imagetypeFilter, open: false});
								}
							} else {
								cb(null, {});
							}
						} else {
							cb(err, null);
						}  
					});
				}, // end showImages
				getFilesRecursive: function(seasonDir, cb) { 
					var result = '', path=require('path'), counter=0;   					
					filewalk.walk(seasonDir, function(err, dirPath, dirs, files) {  
						if(err) {
							cb(err, null) 
						} else {
							if(files && files.length>0) {  
								result = files.filter(function(elem){
									return path.extname(elem) === '.mp4' || path.extname(elem) === '.m4a';
								});  
								if(result && result.length>0) { 
									counter+=result.length;
									cb(null, {video: result, number: counter}); 
								} 		
							}  // end if
						} // end else						
					}); // end filewalk
				}, // end getFilesRecursive
				getSeasonFilesArray: function(seasonDir, outputDir, seasonImg, seasonNbr, cb) {
					var that=this,
						arr=[],
						path=require('path'), 
						counter=1,
						ep='' , 
						callback=function(err, res) {
							 if(err) {
								cb(err, null);
							} else {   
								
								if(res.video.length>0) {
									for (var i=0; i < res.video.length; i++) {  
										ep = 's'+('0'+seasonNbr).substr(-2)+'e'+('0'+(i+counter)).substr(-2);
										arr.push({tven: ep ,input: '"'+res.video[i]+'"', output: path.resolve(outputDir,ep + path.extname(res.video[i])), image: seasonImg});
										
									};
									counter+=i;
								} else {  
									ep = 's'+('0'+seasonNbr).substr(-2)+'e'+('0'+counter).substr(-2);
									arr.push({tven: ep ,input: '"'+res.video+'"', output: path.resolve(outputDir,ep + path.extame(res.video)), image: seasonImg});   
									counter+=1;  
								}
								
							}
						};					
					setTimeout(function() {
						cb(null, arr);
					}, 500);         
					that.getFilesRecursive(seasonDir, callback);
				}, // end getSeasonFilesArray
				extractImage: function(filename, output, cb) { 
					var cmd = that.ap + ' '+filename + ' --extractPixToPath ' +output,
						exec = require('child_process').exec;
				   
				    exec(cmd, function(err, stdout, stderr){
						if(err || stderr) {
							cb({error: err || stderr, cmd: cmd}, null);
						} else {
							cb(null, {file: output});
						}
					});
				},
				getTags: function(file, cb) {
					var exec = require('child_process').exec,
						cmd = that.ap +' '+ file +' --outputXML',
					 	atoms;
					exec(cmd, function(err, stdout, stderr) {
						if(err || stderr) cb(err, null); 						 
						if(stdout){  
							parser.parseString(stdout, function(err, res){ 
								atoms = (res.AtomicParsley) ? res.AtomicParsley.atoms : {};
								cb(null, {cmd: cmd, stdoutXml: stdout, json: {tags: atoms.atomString, artwork: atoms.atomArtwork} });  
							});   						 
						} 
					});  // end exec
				} // end getTags
			}; // end return util
		} // end util
	}; // end retúrn taggger
}; // end tagger

module.exports.TvDbManager = tvdbManager;      
module.exports.dbSetup = dbSetup;