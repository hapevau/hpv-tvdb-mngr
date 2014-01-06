# hpv-tvdb-mngr

## Beschreibung

Das Programm dient folgenden Hauptaufgaben

1) Herunterladen von TheTvDB.com Serieninformationen 

2) Speichern der Daten in lokaler (sqlite3) Datenbank 

3) Taggen von Videodateien für iTunes (Wrapper für AtomicParsley)    

Für das Speichern der Daten in einer lokalen Datenbank wird eine vorbereitete (nicht gefüllte) sqlite3-DB (tvdb.db), sowie ein script (createDb.sql) zum Einrichten/erneuten Anlegen der DB mitgeliefert. Die Datei tvdb.db kopieren und bei der Iinitialisierung des Managers übergeben ist das empfohlene Vorgehen. Wenn die Datei in der route des aufsührenden scripts liegt, wird sie automatisch initialisiert und der 2.te Parameter kann weggelassen werden.

Die Datenbankfunktionalität ist so ausgerichtet, dass alle Daten, die für ein Mediacenter nötig sind, abgefragt werden können. Dies beinhaltet Details zu den Serien/Staffeln und Episoden, wie auch übergreifende Abfragen auf Genre, Schauspieler und Seriennamen.

## Voraussetzung

Das Programm verlangt das Vorhandensein von AtomicParsley in einer Version >=0.9.5 (z.Bsp.: https://bitbucket.org/shield007/atomicparsley/overview) und einen gültigen Api-Key von thetvdb.com. Wer direkt auf die Datenbank zugreifen will, benötigt einen slite3-client (für die Verwendung des Programms aber nicht nötig).

## Installation

	npm install hpv-tvdb-mngr
	
## Verwendung 

	var tvdbmngr = require('hpv-tvdb-mngr').TvDbManager,  
		db = new sqlite.Database('tvdb.db'),
		mngr = new tvdbmngr('API-KEY', db),
		cb = function(err, res) { console.log((err) ? err : res); };
	
	mngr.searchTvDbCom('Bones', cb);     
	
	mngr.saveSeriesToDb('75682', cb); 
	
	mngr.getSeasonsDetailsBySeriesIdFromDb('75682',cb);
	
	mngr.tagger('./AtomicParsley', 'Bones').showImages(cb, false, 'season');
	
	mngr.saveImageFomTheTvDbComToDisk('http://thetvdb.com/banners/graphical/75682-g29.jpg','output/75682-g29.jpg', cb); 
	
	mngr.tagger('./AtomicParsley', 's01e01')./tag('input/folge1.mp4', 'output/s01e01.mp4', '75682-g29.jpg', cb, true);
	
	mngr.tagger('./AtomicParsley').util().getTags('output/s01e01.mp4', cb);   
	

Es können Einzeldateien oder Staffeln getaggt werden. Das Vorgehen ist i.d.R. wie folgt

1. Suchen der Serie über Sereienname
2. Herunterladen der Daten über die gefundene SerienId
3. Erzeugen einer Videodateiliste für eine Staffel
4. Taggen der Dateien der Staffel

**Achtung!** Auch wenn die API (und AtomicParsley) das Überschreiben einer Video-Datei erlaubt, sollte immer ein output angegeben werden und somit eine Kopie der Video-Datei erzeugt werden. Dies gilt vor allem, wenn die Array-Funktionalität des Taggers verwendet wird. Da AtomicParsley auch beim Überschreiben einer Datei vorher eine temporäre Datei anlegt, umbenennt und die Originaldatei dann löscht, ist der Geschwindigkeitsgewinn bei der Option --overWrite marginal.

	                           
## API                         

### Datenbank

#### searchTvDbCom

Sucht über Serienname auf TheTvDb.com nach Seriendaten            

**Parameter**

- Serienname: string
- callback: function

*Beispiel:*

	mngr.searchTvDbCom('Bones', callback);
	
**Result in callback**   

Ein Array von Übereinstimmungen

	[ { name: 'Bones',
	    alias: 'Bones - Die Knochenjägerin',
	    imageurl: 'http://thetvdb.com/banners/graphical/75682-g29.jpg',
	    id: '75682',
	    language: 'de',
	    overview: 'Dr. Temperance Brennan ist eine forensische ...',
	    imdbid: 'tt0460627' }  
	]

#### saveSeriesToDb  

Lädt und speichert eine Serie (komplett) in die lokale Datenbank

**Parameter**

- Serien-ID: string
- callback: function

*Beispiel:*

	mngr.saveSeriesToDb('75682', callback);

**Result in callback**	    

Statusobjekt

	{ status: 'done' } 

#### deleteSeriesInDb

Löscht eine Serie (und alle korrespondierenden Einträge) in der lokalen DB.  

**Parameter**

- Serien-ID: string
- callback: function

*Beispiel:* 

	deleteSeriesInDb('75682', cb);   
	
**Result in callback**	 

Statusobjekt
	
	{ part: '1 deleted' }

#### getAllSeriesFromDb  

Liefert eine Übersicht aller Serien in der Datenbank 

**Parameter**

- callback: function

*Beispiel:* 

	mngr.getAllSeriesFromDb(cb);   
	
**Result in callback**	 

Ein Array mit Serienübersichtobjekten
	
	[ { id: '75682',
	    name: 'Bones',
	    seasons: 10,
	    episodes: 182,
	    images: 218 } ]

#### getAllActorsFromDb  

Liefert alle gespeicherten Schauspieler (Namen)  

**Parameter**

- callback: function

*Beispiel:* 

	mngr.getAllActorsFromDb(cb);   
	
**Result in callback**     

Ein Array mit Schauspielernamen

	[ { name: 'Emily Deschanel' },
	  { name: 'David Boreanaz' },
	  { name: 'Michaela Conlin' } ]

#### getAllGenresFromDb    

Listet alle Genres auf

**Parameter**

- callback: function

*Beispiel:* 

	mngr.getAllGenresFromDb(cb);   
	
**Result in callback**     

Array von Genres

	[ { genre: 'Crime' }, { genre: 'Drama' } ] 

#### getAllSeriesFirstLettersFromDb

Liefert eine Liste mit Anfangsbuchstaben aller Seriennamen und wie viele Serien mit diesem Buchstaben beginnen. 

**Parameter**

- callback: function

*Beispiel:* 

	mngr.getAllSeriesFirstLettersFromDb(cb);   
	
**Result in callback**

	[ { letter: 'B', series: 1 } ] 

#### getAllSeriesByFirstLetterFromDb  

Liefert alle Serien, die mit dem übergebenen Buchstaben beginnen

**Parameter**

- firstLetter: string
- callback: function

*Beispiel:* 

	mngr.getAllSeriesByFirstLetterFromDb('B',cb);   
	
**Result in callback**

Array mit Serieninformationen

	[ { name: 'Bones',
	    id: '75682',
	    overview: 'Dr. Temperance Brennan ist eine forensische ...',
	    network: 'FOX',
	    language: 'de',
	    firstaired: '2005-09-13',
	    rating: 'TV-14' } ]

#### getAllSeriesByGenreFromDb 

Alle Serien, die dem Genre zugeordnet sind

**Parameter**

- genre: string
- callback: function

*Beispiel:* 

	mngr.getAllSeriesByGenreFromDb('Drama',cb);   
	
**Result in callback**  

Array mit Serieninformationen

	[ { id: '75682',
	    name: 'Bones',
	    overview: 'Dr. Temperance Brennan ist eine forensische ...',
	    network: 'FOX',
	    language: 'de',
	    firstaired: '2005-09-13',
	    rating: 'TV-14',
	    actors: 'Emily Deschanel,David Boreanaz,Michaela Conlin,T.J. Thyne, ...',
	    genres: 'Crime,Drama' } ]

#### getAllSeriesByActorFromDb  

Alle Serien, in denen der Schauspieler mitwirkt

**Parameter**

- actor: string 
- callback: function

*Beispiel:* 

	mngr.getAllSeriesByActorFromDb('Deschanel',cb);   
	
**Result in callback**  

Array mit Serieninformationen

	[ { id: '75682',
	    name: 'Bones',
	    overview: 'Dr. Temperance Brennan ist eine forensische ...',
	    network: 'FOX',
	    language: 'de',
	    firstaired: '2005-09-13',
	    rating: 'TV-14',
	    actors: 'Emily Deschanel,David Boreanaz,Michaela Conlin,T.J. Thyne, ...',
	    genres: 'Crime,Drama' } ]


#### getImagesDetailsBySeriesIdFromDb

Verfügbare Bilder für diese Serie 

**Parameter**

- Serien-Id: string 
- callback: function

*Beispiel:* 

	mngr.getImagesDetailsBySeriesIdFromDb('75682',cb);   
	
**Result in callback**

Array mit Bildinformationen

	[{ seriesid: '75682',
	    imagetype: 'season',
	    imageurl: 'http://thetvdb.com/banners/seasons/75682-1-2.jpg',
	    language: 'en' }]


#### getSeasonsDetailsBySeriesIdFromDb 

Staffelnüberlick für eine Serie

**Parameter**

- Serien-Id: string 
- callback: function

*Beispiel:* 

	mngr.getImagesDetailsBySeriesIdFromDb('75682',cb);   
	
**Result in callback**

Array mit Staffelinformationen

	[ { seriesid: '75682',
	    seasonid: '23142',
	    seasonnbr: '0',
	    episodes: 2 }]

#### getEpisodesDetailsBySeriesIdFromDb 

Details zu Episoden einer Serie

**Parameter**

- Serien-Id: string 
- callback: function

*Beispiel:* 

	mngr.getEpisodesDetailsBySeriesIdFromDb('75682',cb);   
	
**Result in callback** 

Array mit Episodeninformationen

	[ { seriesid: '75682',
	    seasonid: '274131',
	    seasonnbr: '6',
	    episodeid: '2447021',
	    episodenbr: '1',
	    name: 'Die Rückkehr der Scheuklappen',
	    overview: 'Sieben Monate nachdem Bones nach Indonesien...',
	    imageurl: 'http://thetvdb.com/banners/episodes/75682/2447021.jpg',
	    language: 'de',
	    directors: 'Ian Toynton',
	    writers: 'Hart Hanson',
	    gueststars: 'Patricia Belcher,Michael Grant Terry,...' } ]

#### getEpisodesDetailsBySeasonIdFromDb

Details zu Episoden einer Staffel

**Parameter**

- Staffel-Id: string 
- callback: function

*Beispiel:* 

	mngr.getEpisodesDetailsBySeasinIdFromDb('274131',cb);   
	
**Result in callback**  

Array mit Episodeninformationen

	[ { seriesid: '75682',
	    seasonid: '274131',
	    seasonnbr: '6',
	    episodeid: '2447021',
	    episodenbr: '1',
	    name: 'Die Rückkehr der Scheuklappen',
	    overview: 'Sieben Monate nachdem Bones nach Indonesien...',
	    imageurl: 'http://thetvdb.com/banners/episodes/75682/2447021.jpg',
	    language: 'de',
	    directors: 'Ian Toynton',
	    writers: 'Hart Hanson',
	    gueststars: 'Patricia Belcher,Michael Grant Terry,...' } ]


#### saveImageFomTheTvDbComToDisk 

Lädt ein Bild von thetvdb.com und speichert es lokal

**Parameter**

- Image-Url: string 
- callback: function

*Beispiel:* 

	mngr.saveImageFomTheTvDbComToDisk('http://thetvdb.com/banners/graphical/75682-g29.jpg','output/75682-g29.jpg', cb);    
	
**Result in callback**  

Statusobjekt

	{ written: 43438 }
	 

### Tagger

Der Tagger ist ein wrapper für AtomicParsley. Die Tagwerte werden aus der lokalen Datenbank geladen. Für die Zuordnung eines Wertes zu einem Tag wird eine tagMap im Tagger und die View taglist in der lokalen Datenbank verwendet.

      
#### tagger	  

Initialisiert einen Tagger und gibt eine Tagger-Funktion (Objekt) zurück.

**Parameter**

- PathToAP: string 
- SeriesName: string
- EpisodeId (tven): string

*Beispiel:*

	var t = mngr.tagger('./AtomicParsley', 'Bones', 's02e01');  

**Result**

Tagger

#### tag

Schreibt Tags in eine Videodatei. Die Methode kann auf zwei Arten aufgerufen werden. Für eine einzelne Videodatei werden input, output, imagefile im Aufruf übergeben. Die Zuordnung zu einer Episodeninformation erfolgt in der Konstruktion des Tagger über tven (z.Bsp.: s01e02). Wird an erster Stelle ein Array übergeben, so entfällt die tven-Information im Tagger und die Übergabe der Einzelinformationen im Aufruf und es werden alle im Array übergebenen Videos getaggt. Das taggen erfolgt in 3 Schritten:


1. taggen der tagMap-Tags
2. Erzeugen einer Plist und Eintrag iTunMOVI (--rDNSatom)
3. Einbinden des Bildes (artwork) mit evtl. vorherigem Löschen vorhandener artworks  

Hierfür werden 3 Einzelmethoden des Taggers verwendet

1. tagTags(inp, outp, cb) 
2. tagPlist(inp, outp, cb) 
3. tagCover(inp, outp, imgPath, cb, remove)

***Schreiben aller Tags***  

**Parameter (Einzelaufruf)**

- input-Video: string 
- output-Video: string (wenn null wird AT mit der Option --overwrite aufgerufen)
- Seasonimage: string (artwork)
- callback: function
- remove: boolean (bei true wird bestehendes artwork entfernt - default=false)

*Beispiel (Einzelaufruf):*

	mngr.tagger('./AtomicParsley', 'Bones', 's02e01').tag('input/video.mp4', 'output/s02e01.mp4', 'input/bild.jpg', cb, true);

**Parameter (Arrayaufruf)**

- arr: Array 
- callback: function

*Beispiel (Arrayaufruf):*  	
	
	mngr.tagger('./AtomicParsley', 'Bones').tag([
			{tven: "s02e01", input: 'input/video.mp4', output: 'output/s02e01.mp4', image: 'input/75682-1.jpg', remove: true}
			], 
			function(err, res) {
			    console.log((err) ? err : res);
		    }); 

**Result in callback** 

Der callback wird für jede Input-Datei aufgerufen. Nach jedem taggen werden die Tags der Output-Datei ausgelesen und als Objekt zurückgegeben. Die verwendete tagMap wird als zweite Property mitgeliefert.

	{ tags: 
	   { '©nam': 'Folge 1 - Ein Toter auf den Gleisen',
	     '©ART': 'Bones',
	     aART: 'Bones',
	     '©alb': 'Bones',
	     '©gen': 'Crime,Drama',
	     '©day': '2005',
	     tvsh: 'Bones',
	     tvnn: 'FOX',
	     tven: 's02e01',
	     sonm: 'Folge 1 - Ein Toter auf den Gleisen',
	     soar: 'Bones',
	     soaa: 'Bones',
	     soal: 'Bones, Staffel 2',
	     sosn: 'Bones',
	     desc: 'Ein Auto, das auf den Gleisen abgestellt wurde, ...',
	     ldes: 'Ein Auto, das auf den Gleisen abgestellt wurde, wird von einem Zug erfasst. ...',
	     iTunMOVI: '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "...">\n<plist version="1.0">...\n</plist>',
	     '©grp': 'Bones' },
	  tagmap: 
	   { '©alb': 'album',
	     '©nam': 'title',
	     '©ART': 'artist',
	     aART: 'albumArtist',
	     '©grp': 'grouping',
	     trkn: 'tracknum',
	     tvsh: 'TVShowName',
	     tven: 'TVEpisode',
	     tvsn: 'TVSeasonNum',
	     tves: 'TVEpisodeNum',
	     desc: 'description',
	     ldes: 'longdesc',
	     sonm: 'sortOrder name',
	     soar: 'sortOrder artist',
	     soaa: 'sortOrder albumartist',
	     soal: 'sortOrder album',
	     sosn: 'sortOrder show',
	     disk: 'disk',
	     stik: 'stik',
	     tvnn: 'TVNetwork',
	     '©day': 'year',
	     '©gen': 'genre' } }


#### getTags

erlaubt das Auslesen von Tags für eine beliebige (mp4) Videodatei. 

*Beispiel:*

	mngr.tagger('./AtomicParsley').getTags('output/s02e01.mp4',cb);

**Parameter
**

- video: string
- callback: function

**Result in callback** 

siehe tag-Rückgabe

#### util

Der Tagger bietet Hilfsfunktionen an, die das Erzeugen/Bestimmen von Daten erleichtern.

#### showImages

Erzeugt eine HTML-Seite mit Bild-Urls. Diese Seite kann verwendet werden um Bilder auszuwählen. Wird bei show true übergeben, versucht der Tagger die Datei im Standard-Browser zu öffnen. Wird ein imagetype übergeben, so werden nur Bilder dieses Typs angezeigt. Wird kein Wert übergeben, so werden alle Bilder angezeigt.

*Beispiel:*   

	mngr.tagger().util.showImages(cb, false, 'season');


**Parameter**

- callback: function
- show: boolean (default false. Bei true wird html in Browser geöffnet)
- imagetype: string (actor, fanart, poster, season, series)

**Result in callback**  

Es wird das erzeugt HTML übergeben

	{ html: '<!DOCTYPE HTML><html lang="de-DE"> ...
			<head>
			...  
			</head>
			<body><h1>Bilder Bones</h1>...
			<h2>Season</h2>
			<figure class="season">
			<img src="http://thetvdb.com/banners/seasons/33332-1.jpg" alt="image"/>
			<figcaption><input txpe="text" readonly value="http://thetvdb.com/banners/seasons/33332-1.jpg"></input></figcaption>
			</figure> 
			...
			</body>
			</html>',
	  filter: 'season',
	  open: false }

#### getSeasonFilesArray

Erstellt anhand gefundener Videodateien ein Array für den Aufruf von tag(). Es wird das Staffelverzeichnis angegeben. Das Verzeichnis wird rekursiv durchlaufen, so dass unterschiedliche Strukturen

	Staffel 01
		Folge 01
			video1.mp4
		Folge 02
			video2.mp4   
   
	oder
	
	Staffel 01
    	video1.mp4
        video2.mp4

unterstützt werden. Die Filterung erfolgt auf Dateiendung mp4 und m4a.

*Beispiel:*  

	mngr.tagger(').util().getSeasonFilesArray('"/Users/.../Bones/Staffel 01"', 'output', 'seasons/33332-1.jpg','1', false,cb);                                  


**Parameter** 

- seasonDir: string (Staffelverzeichnis)
- outputDir: string (Ausgabeverzeichnis) 
- imagePath: string (Pfad zum zu verwendenden Bild)
- remove: boolean (vorherige artwork entfernen. default=false)
- callback: function

**Result in callback**  

Array mit Video-Dateien

	[ { tven: 's01e01',
	    input: '"/Users/.../Bones/Staffel 01/video1.mp4"',
	    output: 'output/s01e01.mp4',
	    image: 'seasons/33332-1.jpg',
	    remove: false } ]

#### extractImage

Extrahiert artwork aus einer Videodatei und speichert das Ergebnis. Der endgültige Dateiname und die Dateiendung sind abhängig von der gespeicherten artwork und werden von AtomicParsley bestimmt

*Beispiel:*  

	mngr.tagger('./AtomicParsley').util().extractImage('input/video1.mp4', 'input/extractedImageFromVideo1', cb);

**Parameter** 

- fileName: string (videodatei)
- imageBasename: string (Name des Ergebnisbildes ohne Dateiendung) 
- callback: function     

**Result in callback** 

	{ file: 'input/extractedImageFromSeason1' } 
		

### Sonstiges

#### getDbInfos

Listet die Objekte der lokalen Datenbank

*Beispiel:* 
 
	mngr.getDbInfos(cb);


**Parameter** 

- callback: function 
 

**Result in callback**   

	[ { type: 'table',
	    name: 'series',
	    tbl_name: 'series',
	    rootpage: 2,
	    sql: 'CREATE TABLE series...' }]
