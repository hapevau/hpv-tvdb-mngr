create table IF NOT EXISTS series
(
    name                TEXT,
    id                  TEXT,
    overview            TEXT,
    network             TEXT,
    language            TEXT,
    firstaired          TEXT,
    rating              TEXT
);  

create table IF NOT EXISTS series_genres
( 
    seriesid            TEXT,
    genre               TEXT
);

create table IF NOT EXISTS series_actors
( 
    seriesid            TEXT,
    name                TEXT,
    role                TEXT,
    actorid             TEXT,
    imageurl            TEXT
);  

create table IF NOT EXISTS episode_directors
( 
    episodeid           TEXT,
    name                TEXT
);  

create table IF NOT EXISTS episode_writers
( 
    episodeid           TEXT,
    name                TEXT
);                       

create table IF NOT EXISTS series_seasons
(
    seriesid            TEXT,
    seasonid            TEXT,
    seasonnbr           TEXT
); 

create table IF NOT EXISTS episode_gueststars
(
    episodeid           TEXT,
    name                TEXT
);
                         

create table IF NOT EXISTS season_episodes
(
    seasonid            TEXT,
    episodeid           TEXT, 
    episodenbr          TEXT,
    name                TEXT,
    overview            TEXT,
    imageurl            TEXT,
    language            TEXT
);

create table IF NOT EXISTS series_images
(
    seriesid            TEXT,
    imagetype           TEXT,
    imageurl            TEXT,
    language            TEXT
);    

CREATE VIEW episodes_short AS
SELECT 
   s.seriesid,   
   s.seasonid,
   s.seasonnbr,
   e.episodenbr,
   e.name
FROM
   series_seasons s
   LEFT OUTER JOIN season_episodes e ON s.seasonid=e.seasonid
ORDER BY
  s.seriesid,
  s.seasonnbr,
  e.episodenbr;

CREATE VIEW seasons_short AS
SELECT
    s.id,
    s.name,    
    o.seasonid,
    o.seasonnbr
FROM
   series s
   LEFT OUTER JOIN series_seasons o ON s.id=o.seriesid
ORDER BY
   s.id,
   o.seasonnbr;  

CREATE VIEW images_overview AS
SELECT
   seriesid,
   count(*) as images
FROM
   series_images
GROUP BY
   seriesid
ORDER BY
   seriesid; 

CREATE VIEW seasons_overview AS
SELECT
   s.seriesid,   
   s.seasonid,
   s.seasonnbr,
   count(*) as episodes
FROM
   episodes_short s
GROUP BY
   s.seriesid,   
   s.seasonid,
   s.seasonnbr
ORDER BY
   s.seriesid,   
   s.seasonnbr;

CREATE VIEW all_images AS
SELECT
    i.seriesid,
    i.imagetype,
    i.imageurl,
    i.language
FROM
    series_images i
UNION
SELECT
    a.seriesid,
    'actor' as imagetype,
    a.imageurl,
   'de' as language
FROM
    series_actors a;

CREATE VIEW series_overview AS
    SELECT
       s.id,
       s.name,
       count(*) as seasons,
       sum(e.episodes) as episodes,
       i.images
    FROM
       series s
       LEFT OUTER JOIN seasons_overview e ON s.id=e.seriesid 
       LEFT OUTER JOIN images_overview i ON s.id=i.seriesid
    GROUP BY
       s.id,
       s.name
    ORDER BY
       s.name;         

CREATE VIEW genres_strings AS
    SELECT
        seriesid,
        group_concat(genre) as genres
    FROM 
        series_genres
    GROUP BY
       seriesid;         

CREATE VIEW actors_strings AS
    SELECT
       seriesid,
       group_concat(name) as name
    FROM
       series_actors
    GROUP BY
       seriesid;        

CREATE VIEW directors_strings AS
    SELECT
       episodeid,
       group_concat(name) as name
    FROM
       episode_directors
    GROUP BY
       episodeid;   

CREATE VIEW writers_strings AS
    SELECT
       episodeid,
       group_concat(name) as name
    FROM
       episode_writers
    GROUP BY
       episodeid;  

CREATE VIEW gueststars_strings AS
    SELECT
       episodeid,
       group_concat(name) as name
    FROM
       episode_gueststars
    GROUP BY
       episodeid;       

CREATE VIEW episode_details AS
    SELECT
     s.seriesid,
     s.seasonid,
     s.seasonnbr,
     e.episodeid,
     e.episodenbr,
     e.name,
     e.overview,
     e.imageurl,
     e.language,
     d.name as directors,
     w.name as writers,
     g.name as gueststars
    FROM
     series_seasons s
     LEFT OUTER JOIN season_episodes e ON s.seasonid=e.seasonid
     LEFT OUTER JOIN directors_strings d ON e.episodeid=d.episodeid  
     LEFT OUTER JOIN writers_strings w ON e.episodeid=w.episodeid
     LEFT OUTER JOIN gueststars_strings g ON e.episodeid=g.episodeid
    ORDER BY
     s.seriesid,
     s.seasonnbr,
     e.episodenbr;    

CREATE VIEW series_details AS
    SELECT 
     s.id,
     s.name,
     s.overview,
     s.network,
     s.language,
     s.firstaired,
     s.rating,
     a.name as actors,
     g.genres
    FROM
     series s
     LEFT OUTER JOIN actors_strings a ON s.id=a.seriesid
     LEFT OUTER JOIN genres_strings g ON s.id=g.seriesid
    ORDER BY
     s.id;   

CREATE VIEW taglist AS
    SELECT 
      o.seriesid,
      o.seasonid,
      e.episodeid,  
      'Folge '||e.episodenbr||' - '||e.name as "©nam",
      s.name as "©alb",
      s.name as "©ART",
      s.name as "aART", 
      s.name as "©grp",
      e.episodenbr as "trkn", 
      s.name as "tvsh",
      's' || substr('0' || o.seasonnbr,-2) || 'e' || substr('0' || e.episodenbr,-2) as "tven",
      o.seasonnbr as "tvsn",
      e.episodenbr as "tves",
      substr(e.overview, 1,200) as "desc",
      e.overview as "ldes",
      'Folge '||e.episodenbr||' - '||e.name as "sonm",
      s.name as "soar",
      s.name as "soaa",
      s.name || ', Staffel ' || o.seasonnbr as "soal",
      s.name as "sosn",
      'TV Show' as "stik",
      network as "tvnn",
      substr(firstaired,1,4) as "©day", 
      g.genres as "©gen"
    FROM 
      series s
      LEFT OUTER JOIN series_seasons o ON s.id=o.seriesid
      LEFT OUTER JOIN season_episodes e ON o.seasonid=e.seasonid 
      LEFT OUTER JOIN genres_strings g ON s.id=g.seriesid
    ORDER BY
      s.name,
      "tven";            

CREATE VIEW plistdata AS
    SELECT
      s.seriesid,
      s.seasonid,
      e.episodeid,
      d.name as directors,
      w.name as screenwriters,
      a.name as "cast"      
    FROM 
      series_seasons s
      LEFT OUTER JOIN season_episodes e ON s.seasonid = e.seasonid
      LEFT OUTER JOIN directors_strings d ON e.episodeid = d.episodeid
      LEFT OUTER JOIN writers_strings w ON e.episodeid = w.episodeid
      LEFT OUTER JOIN actors_strings a ON s.seriesid = a.seriesid;

CREATE TRIGGER series_delete BEFORE DELETE 
ON series
BEGIN   
    DELETE FROM series_seasons WHERE seriesid=old.id; 
    DELETE FROM series_actors WHERE seriesid=old.id;   
    DELETE FROM series_genres WHERE seriesid=old.id; 
    DELETE FROM series_images WHERE seriesid=old.id;
END;  


CREATE TRIGGER season_delete BEFORE DELETE 
ON series_seasons
BEGIN   
    DELETE FROM season_episodes WHERE seasonid=old.seasonid; 
END;         

CREATE TRIGGER episodes_delete BEFORE DELETE 
ON season_episodes
BEGIN   
    DELETE FROM episode_gueststars WHERE episodeid=old.episodeid; 
    DELETE FROM episode_writers WHERE episodeid=old.episodeid;
    DELETE FROM episode_directors WHERE episodeid=old.episodeid;
END;